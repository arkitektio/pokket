import { RunOnButton } from '@/components/actions/RunOnButton';
import { CallAboutButton } from '@/components/calls/CallAboutButton';
import { ExitGuard } from '@/components/navigation/ExitGuard';
import { BackButton, MenuButton, SearchButton, ShareButton } from '@/components/navigation/HeaderButtons';
import { routeOf } from '@/lib/modules/catalog';
import { setPageOnShow } from '@/lib/navigation';
import { useSyncActiveTabRoute } from '@/lib/tabs/TabsProvider';
import { Stack, useGlobalSearchParams, usePathname } from 'expo-router';
import type { DrawerNavigationProp } from 'expo-router/drawer';
import * as React from 'react';
import { Platform, View } from 'react-native';

type ParamList = Record<string, object | undefined>;

/** Keeps the active tab on the page on show. Its own component, so that the
 * page Stack does not re-render (and recompute every screen's options) on
 * each navigation — only this does. */
function TabRouteSync() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const route = React.useMemo(() => routeOf(pathname, params), [pathname, params]);
  useSyncActiveTabRoute(route);
  React.useEffect(() => setPageOnShow(route), [route]);
  return null;
}

type Nav = { getParent: () => unknown; canGoBack: () => boolean };
const drawerOf = (navigation: Nav) => navigation.getParent() as DrawerNavigationProp<ParamList> | undefined;

/**
 * Pages the sidebar, the tabs and search switch between, by screen name. The
 * rest of the stack is details pushed over one.
 */
const PAGES: Record<string, string> = {
  index: 'Home',
  notifications: 'Notifications',
  'mail/index': 'Mail',
  'bank/index': 'Bank',
  'tasks/index': 'Tasks',
  'actions/index': 'Actions',
  'agents/index': 'Agents',
  'bloks/index': 'Bloks',
  broadcasts: 'Broadcasts',
  'calls/index': 'Calls',
  'alpaka/index': 'Chat',
  'mikro/index': 'Mikro',
  'mikro/arraydatasets/index': 'Datasets',
  'mikro/lenses/index': 'Lenses',
  'mikro/folders/index': 'Folders',
  'mikro/files/index': 'Files',
  'mikro/scenes/index': 'Scenes',
  'mikro/tabledatasets/index': 'Tables',
  'mikro/charts/index': 'Charts',
  'mikro/annotations/index': 'Annotations',
  lokate: 'Lokate',
  phone: 'Phone',
  'wifi/index': 'Wi-Fi',
  provision: 'Provision',
  mesh: 'Mesh',
  'timeline/index': 'Timeline',
  settings: 'Settings',
  debug: 'Debug',
};

type Screen = { route: { name: string }; navigation: Nav };

/**
 * The left-edge swipe opens the sidebar wherever there is nothing to go back
 * to. On a detail it goes back instead. A page with history keeps the
 * sidebar's swipe, except on iOS, where the same swipe is the system's back.
 */
// Stable across renders, so the Stack never sees new listener or option factories.
const screenListeners = ({ route, navigation }: Screen) => ({
  focus: () => {
    const sidebar = !navigation.canGoBack() || (route.name in PAGES && Platform.OS !== 'ios');
    drawerOf(navigation)?.setOptions({ swipeEnabled: sidebar });
  },
});

/**
 * A page always opens the sidebar from its header, and has a back button
 * beside it once there is a page to go back to. A detail has only its back
 * button, or the sidebar's when it is the first thing on show (a link).
 */
const screenOptions = ({ route, navigation }: Screen) => {
  const back = navigation.canGoBack();
  const menu = <MenuButton onPress={() => drawerOf(navigation)?.openDrawer()} />;
  return {
    headerLeft:
      route.name in PAGES
        ? () => (
            <View className="flex-row items-center">
              {back ? <BackButton /> : null}
              {menu}
            </View>
          )
        : back
          ? undefined
          : () => menu,
    headerRight: () => (
      <View className="flex-row items-center">
        <CallAboutButton />
        <RunOnButton />
        <ShareButton />
        <SearchButton />
      </View>
    ),
  };
};

/**
 * As in orkestrator, switching pages is instant: no slide-in, which only made
 * a tap in the sidebar feel slow. Details pushed over a page keep their
 * animation.
 */
const page = (title: string) => ({ title, animation: 'none' as const });

/**
 * The one page view: every page and the details pushed over it, one history.
 * Choosing a page (the sidebar, search, a link) is a step in it like opening
 * a detail, and back undoes either. Every navigation updates the active tab.
 */
export default function PagesLayout() {
  return (
    <>
      <TabRouteSync />
      <ExitGuard />
      <Stack screenListeners={screenListeners} screenOptions={screenOptions}>
        {Object.entries(PAGES).map(([name, title]) => (
          <Stack.Screen key={name} name={name} options={page(title)} />
        ))}
        <Stack.Screen name="mail/thread/[id]" options={{ title: '' }} />
        <Stack.Screen name="bank/transaction/[id]" options={{ title: 'Transaction' }} />
        <Stack.Screen name="tasks/[id]" options={{ title: 'Task' }} />
        <Stack.Screen name="actions/[id]" options={{ title: 'Action' }} />
        <Stack.Screen name="agents/[id]" options={{ title: 'Agent' }} />
        <Stack.Screen name="implementations/[id]" options={{ title: 'Action' }} />
        <Stack.Screen name="bloks/[id]" options={{ title: 'Blok' }} />
        <Stack.Screen name="calls/[id]" options={{ title: 'Call' }} />
        <Stack.Screen name="alpaka/rooms/[id]" options={{ title: 'Chat' }} />
        <Stack.Screen name="mikro/arraydatasets/[id]" options={{ title: 'Dataset' }} />
        <Stack.Screen name="mikro/lenses/[id]" options={{ title: 'Lens' }} />
        <Stack.Screen name="mikro/folders/[id]" options={{ title: 'Folder' }} />
        <Stack.Screen name="mikro/files/[id]" options={{ title: 'File' }} />
        <Stack.Screen name="mikro/scenes/[id]" options={{ title: 'Scene' }} />
        <Stack.Screen name="mikro/tabledatasets/[id]" options={{ title: 'Table' }} />
        <Stack.Screen name="mikro/charts/[id]" options={{ title: 'Chart' }} />
        <Stack.Screen name="mikro/annotations/[id]" options={{ title: 'Annotation' }} />
        <Stack.Screen name="solo-broadcast/start" options={{ title: 'Start Solo Broadcast' }} />
        <Stack.Screen name="solo-broadcast/[id]" options={{ title: 'Solo Broadcast' }} />
        <Stack.Screen name="wifi/eduroam" options={{ title: 'Eduroam' }} />
        <Stack.Screen name="wifi/standard" options={{ title: 'Standard Wi-Fi' }} />
        <Stack.Screen name="timeline/place/[id]" options={{ title: 'Place' }} />
        <Stack.Screen name="not-here" options={{ title: 'Not on the phone' }} />
      </Stack>
    </>
  );
}
