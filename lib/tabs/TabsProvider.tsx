import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, usePathname } from "expo-router";
import * as React from "react";
import { App } from "../app/App";
import { isProvisionalProfileId } from "../arkitekt/fakts/profileStorageSchema";
import { pathOf, queryOf, routeOf } from "../modules/catalog";
import {
  activeTab,
  closeOtherTabs,
  closeTab,
  focusTab,
  HOME_ROUTE,
  initialTabs,
  moveTab,
  openTab,
  parseStoredTabs,
  serializeTabs,
  setTabLabel,
  setTabPinned,
  setTabRoute,
  TabsState,
  tabsStorageKey,
} from "./tabs";

/**
 * The tabs of the live organization — orkestrator's `TabsProvider`, for one
 * page view. Re-boots when the organization changes: pages and ids belong to
 * one organization, so each keeps its own tabs. Saved 200 ms after a change.
 *
 * Showing a tab is a navigation of the one page Stack: back to its root, then
 * to the tab's route. While that navigation is in flight, `navigatingTo`
 * keeps the route sync from writing the page being left onto the new tab.
 */

type Store = {
  get: () => TabsState;
  subscribe: (listener: () => void) => () => void;
  update: (fn: (state: TabsState) => TabsState) => void;
  reset: (state: TabsState) => void;
};

const createStore = (initial: TabsState): Store => {
  let state = initial;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  return {
    get: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update: (fn) => {
      const next = fn(state);
      if (next !== state) {
        state = next;
        emit();
      }
    },
    reset: (next) => {
      state = next;
      emit();
    },
  };
};

type TabsContextValue = {
  store: Store;
  /** The route a tab switch is taking the page view to, until it arrives. */
  navigatingTo: React.MutableRefObject<string | null>;
  ready: boolean;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

const useTabsContext = () => {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsProvider missing");
  return context;
};

/** One spelling per route (params sorted), so a route can be compared with the page's. */
export const normalizeRoute = (route: string) => routeOf(pathOf(route), queryOf(route));

/** Take the one page view to `route`, from the root of its stack. */
const showRoute = (navigatingTo: React.MutableRefObject<string | null>, route: string) => {
  navigatingTo.current = normalizeRoute(route);
  if (router.canDismiss()) router.dismissAll();
  router.replace(route as never);
};

export function TabsProvider({ children }: { children: React.ReactNode }) {
  const profileId = App.useActiveProfileId();
  const [store] = React.useState(() => createStore(initialTabs()));
  const navigatingTo = React.useRef<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const bootedFor = React.useRef<string | null>(null);

  const connected = !!App.useConnection();

  // Boot per organization, once it is live: its saved tabs, and its active
  // tab's page on show.
  React.useEffect(() => {
    if (!profileId || !connected || bootedFor.current === profileId) return;
    let cancelled = false;
    void (async () => {
      let loaded: TabsState | null = null;
      try {
        loaded = parseStoredTabs(await AsyncStorage.getItem(tabsStorageKey(profileId)));
      } catch {
        loaded = null;
      }
      if (cancelled) return;
      const previous = bootedFor.current;
      bootedFor.current = profileId;
      // A first sign-in runs under a provisional id until lok names the
      // login; the tabs opened meanwhile are this organization's already.
      if (!loaded && previous && isProvisionalProfileId(previous)) {
        setReady(true);
        return;
      }
      const state = loaded ?? initialTabs();
      store.reset(state);
      setReady(true);
      showRoute(navigatingTo, activeTab(state).route);
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId, connected, store]);

  // Save, debounced; never before this organization's tabs were loaded.
  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = store.subscribe(() => {
      const id = bootedFor.current;
      if (!id) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void AsyncStorage.setItem(tabsStorageKey(id), serializeTabs(store.get())).catch(() => undefined);
      }, 200);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [store]);

  const value = React.useMemo(() => ({ store, navigatingTo, ready }), [store, ready]);
  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

export const useTabs = (): TabsState => {
  const { store } = useTabsContext();
  return React.useSyncExternalStore(store.subscribe, store.get, store.get);
};

/** Everything the strip, the search and "+" do with tabs, navigation included. */
export const useTabActions = () => {
  const { store, navigatingTo } = useTabsContext();
  return React.useMemo(
    () => ({
      /** Show a tab: focus it and bring its page up. */
      switchTo: (id: string) => {
        const before = store.get().activeId;
        store.update((s) => focusTab(s, id));
        const tab = store.get().tabs.find((t) => t.id === id);
        if (tab && id !== before) showRoute(navigatingTo, tab.route);
      },
      /** A new tab, focused, on `route` (Home by default). */
      open: (route: string = HOME_ROUTE) => {
        store.update((s) => openTab(s, route, { evict: true }));
        showRoute(navigatingTo, route);
      },
      close: (id: string) => {
        const before = store.get().activeId;
        store.update((s) => closeTab(s, id));
        const now = activeTab(store.get());
        if (now.id !== before || id === before) showRoute(navigatingTo, now.route);
      },
      closeOthers: (id: string) => {
        const before = store.get().activeId;
        store.update((s) => closeOtherTabs(s, id));
        const now = activeTab(store.get());
        if (now.id !== before) showRoute(navigatingTo, now.route);
      },
      setPinned: (id: string, pinned: boolean) => store.update((s) => setTabPinned(s, id, pinned)),
      move: (id: string, delta: number) => store.update((s) => moveTab(s, id, delta)),
    }),
    [store, navigatingTo],
  );
};

/**
 * Called by the page view on every navigation: the active tab now holds the
 * page on show — unless a tab switch is still on its way elsewhere.
 */
export const useSyncActiveTabRoute = (route: string) => {
  const { store, navigatingTo, ready } = useTabsContext();
  React.useEffect(() => {
    if (!ready) return;
    if (navigatingTo.current) {
      if (navigatingTo.current !== route) return;
      navigatingTo.current = null;
    }
    store.update((s) => setTabRoute(s, s.activeId, route));
  }, [route, ready, store, navigatingTo]);
};

/** A page names itself for the tab showing it (a thread's subject, say). */
export const useTabTitle = (title: string | null | undefined) => {
  const { store } = useTabsContext();
  const pathname = usePathname();
  React.useEffect(() => {
    if (!title) return;
    store.update((s) => setTabLabel(s, s.activeId, title, pathname));
  }, [title, pathname, store]);
};
