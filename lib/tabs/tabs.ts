import { z } from "zod";
import { labelForRoute } from "../modules/catalog";

/**
 * The tabs of the sidebar — orkestrator's `core/tabs/tabs.ts`, for one page
 * view: a tab is a page you keep (its last route and a label), not a mounted
 * view with its own history. Visiting a page updates the active tab;
 * switching to another reopens its page. Pinned tabs are the bookmarks: a
 * block at the top, never closed by a stray tap, never evicted.
 *
 * Every function is pure over `TabsState`; the provider persists.
 */

export const TabRecordSchema = z.object({
  id: z.string(),
  /** pathname plus query, e.g. `/mail?box=unread`. */
  route: z.string(),
  label: z.string(),
  /** Whose label it is: a page's own title wins over one derived from the path. */
  labelSource: z.enum(["path", "page"]).default("path"),
  pinned: z.boolean().optional(),
  lastActiveAt: z.number(),
});

export type TabRecord = z.infer<typeof TabRecordSchema>;

export type TabsState = { tabs: TabRecord[]; activeId: string };

export const MAX_TABS = 12;
export const HOME_ROUTE = "/";

const newId = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const createTab = (route: string, options: { now?: number; id?: string } = {}): TabRecord => ({
  id: options.id ?? newId(),
  route,
  label: labelForRoute(route),
  labelSource: "path",
  lastActiveAt: options.now ?? Date.now(),
});

export const initialTabs = (route = HOME_ROUTE, now = Date.now()): TabsState => {
  const tab = createTab(route, { now });
  return { tabs: [tab], activeId: tab.id };
};

export const activeTab = (state: TabsState): TabRecord =>
  state.tabs.find((t) => t.id === state.activeId) ?? state.tabs[0];

const pinnedCount = (tabs: TabRecord[]) => tabs.filter((t) => t.pinned).length;

/** Pinned first (in their order), then open tabs (in theirs). */
const normalize = (tabs: TabRecord[]): TabRecord[] => [...tabs.filter((t) => t.pinned), ...tabs.filter((t) => !t.pinned)];

/**
 * Open `route` in a new tab and focus it (unless `background`). At the cap
 * this refuses, unless `evict`: then the least recently used tab that is
 * neither pinned nor active makes room.
 */
export const openTab = (
  state: TabsState,
  route: string,
  options: { evict?: boolean; background?: boolean; now?: number } = {},
): TabsState => {
  const now = options.now ?? Date.now();
  let tabs = state.tabs;
  if (tabs.length >= MAX_TABS) {
    if (!options.evict) return state;
    const victim = tabs
      .filter((t) => !t.pinned && t.id !== state.activeId)
      .sort((a, b) => a.lastActiveAt - b.lastActiveAt)[0];
    if (!victim) return state;
    tabs = tabs.filter((t) => t.id !== victim.id);
  }
  const tab = createTab(route, { now });
  return {
    tabs: [...tabs, tab],
    activeId: options.background ? state.activeId : tab.id,
  };
};

export const focusTab = (state: TabsState, id: string, now = Date.now()): TabsState => {
  if (!state.tabs.some((t) => t.id === id)) return state;
  return {
    activeId: id,
    tabs: state.tabs.map((t) => (t.id === id ? { ...t, lastActiveAt: now } : t)),
  };
};

/**
 * Close a tab. When it was active, focus moves to its right neighbour, else
 * its left. Closing the last one leaves a fresh Home tab: never zero tabs.
 */
export const closeTab = (state: TabsState, id: string, now = Date.now()): TabsState => {
  const index = state.tabs.findIndex((t) => t.id === id);
  if (index < 0) return state;
  const tabs = state.tabs.filter((t) => t.id !== id);
  if (tabs.length === 0) return initialTabs(HOME_ROUTE, now);
  if (state.activeId !== id) return { ...state, tabs };
  const next = tabs[Math.min(index, tabs.length - 1)];
  return focusTab({ tabs, activeId: next.id }, next.id, now);
};

/** Keep `id` and every pinned tab. */
export const closeOtherTabs = (state: TabsState, id: string): TabsState => {
  if (!state.tabs.some((t) => t.id === id)) return state;
  const tabs = state.tabs.filter((t) => t.id === id || t.pinned);
  return { tabs, activeId: tabs.some((t) => t.id === state.activeId) ? state.activeId : id };
};

/** Pinning moves a tab to the pinned/open boundary, so pins stay one block on top. */
export const setTabPinned = (state: TabsState, id: string, pinned: boolean): TabsState => {
  const tab = state.tabs.find((t) => t.id === id);
  if (!tab || !!tab.pinned === pinned) return state;
  const rest = state.tabs.filter((t) => t.id !== id);
  const boundary = pinnedCount(rest);
  const updated = { ...tab, pinned: pinned || undefined };
  return { ...state, tabs: [...rest.slice(0, boundary), updated, ...rest.slice(boundary)] };
};

/** Move a tab by `delta` places, never out of its own block (pinned or open). */
export const moveTab = (state: TabsState, id: string, delta: number): TabsState => {
  const index = state.tabs.findIndex((t) => t.id === id);
  if (index < 0 || delta === 0) return state;
  const tab = state.tabs[index];
  const boundary = pinnedCount(state.tabs);
  const [min, max] = tab.pinned ? [0, boundary - 1] : [boundary, state.tabs.length - 1];
  const target = Math.max(min, Math.min(max, index + delta));
  if (target === index) return state;
  const tabs = [...state.tabs];
  tabs.splice(index, 1);
  tabs.splice(target, 0, tab);
  return { ...state, tabs };
};

/**
 * The page on show changed: the active tab now holds it. A new path resets a
 * page-reported label (that title belonged to the page left behind).
 */
export const setTabRoute = (state: TabsState, id: string, route: string): TabsState => {
  const tab = state.tabs.find((t) => t.id === id);
  if (!tab || tab.route === route) return state;
  const samePath = tab.route.split("?")[0] === route.split("?")[0];
  const keepLabel = samePath && tab.labelSource === "page";
  const next: TabRecord = {
    ...tab,
    route,
    ...(keepLabel ? {} : { label: labelForRoute(route), labelSource: "path" as const }),
  };
  return { ...state, tabs: state.tabs.map((t) => (t.id === id ? next : t)) };
};

/** A page reports its title for the tab showing it — only while it still shows it. */
export const setTabLabel = (state: TabsState, id: string, label: string, route: string): TabsState => {
  const tab = state.tabs.find((t) => t.id === id);
  if (!tab || !label || tab.route.split("?")[0] !== route.split("?")[0]) return state;
  if (tab.label === label && tab.labelSource === "page") return state;
  return {
    ...state,
    tabs: state.tabs.map((t) => (t.id === id ? { ...t, label, labelSource: "page" as const } : t)),
  };
};

// ── persistence ──

export const StoredTabsSchema = z.object({
  version: z.literal(1),
  activeId: z.string(),
  tabs: z.array(z.unknown()),
});

export const tabsStorageKey = (profileId: string) => `pokket:tabs:v1:${profileId}`;

/** Rows are parsed one by one — one bad row costs that row — and the active id is repaired. */
export const parseStoredTabs = (raw: string | null): TabsState | null => {
  if (!raw) return null;
  try {
    const stored = StoredTabsSchema.safeParse(JSON.parse(raw));
    if (!stored.success) return null;
    const tabs = normalize(
      stored.data.tabs.flatMap((candidate) => {
        const tab = TabRecordSchema.safeParse(candidate);
        return tab.success ? [tab.data] : [];
      }),
    ).slice(0, MAX_TABS);
    if (tabs.length === 0) return null;
    const activeId = tabs.some((t) => t.id === stored.data.activeId) ? stored.data.activeId : tabs[0].id;
    return { tabs, activeId };
  } catch {
    return null;
  }
};

export const serializeTabs = (state: TabsState): string =>
  JSON.stringify({ version: 1, activeId: state.activeId, tabs: state.tabs });
