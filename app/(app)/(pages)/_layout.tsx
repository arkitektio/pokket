import { RunOnButton } from '@/components/actions/RunOnButton';
import { CallAboutButton } from '@/components/calls/CallAboutButton';
import { ExitGuard } from '@/components/navigation/ExitGuard';
import { MenuButton, SearchButton, ShareButton } from '@/components/navigation/HeaderButtons';
import { routeOf } from '@/lib/modules/catalog';
import { useSyncActiveTabRoute } from '@/lib/tabs/TabsProvider';
import { Stack, useGlobalSearchParams, usePathname } from 'expo-router';
import type { DrawerNavigationProp } from 'expo-router/drawer';
import * as React from 'react';
import { View } from 'react-native';

type ParamList = Record<string, object | undefined>;

/** Keeps the active tab on the page on show. Its own component, so that the
 * page Stack does not re-render (and recompute every screen's options) on
 * each navigation — only this does. */
function TabRouteSync() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const route = React.useMemo(() => routeOf(pathname, params), [pathname, params]);
  useSyncActiveTabRoute(route);
  return null;
}

type Nav = { getParent: () => unknown; canGoBack: () => boolean };
const drawerOf = (navigation: Nav) => navigation.getParent() as DrawerNavigationProp<ParamList> | undefined;

// Stable across renders, so the Stack never sees new listener or option factories.
const screenListeners = ({ navigation }: { navigation: Nav }) => ({
  focus: () => {
    drawerOf(navigation)?.setOptions({ swipeEnabled: !navigation.canGoBack() });
  },
});

const screenOptions = ({ navigation }: { navigation: Nav }) => ({
  headerLeft: navigation.canGoBack()
    ? undefined
    : () => <MenuButton onPress={() => drawerOf(navigation)?.openDrawer()} />,
  headerRight: () => (
    <View className="flex-row items-center">
      <CallAboutButton />
      <RunOnButton />
      <ShareButton />
      <SearchButton />
    </View>
  ),
});

/**
 * Pages the sidebar, the tabs and search switch between. As in orkestrator,
 * switching is instant: no slide-in, which on a replace only made a tap in
 * the sidebar feel slow. Details pushed over a page keep their animation.
 */
const page = (title: string) => ({ title, animation: 'none' as const });

/**
 * The one page view: every page and the details pushed over it. A page at
 * the root of the stack opens the sidebar from its header; a pushed one has
 * its back button instead, and there the left-edge swipe goes back rather
 * than opening the sidebar. Every navigation updates the active tab.
 */
export default function PagesLayout() {
  return (
    <>
      <TabRouteSync />
      <ExitGuard />
      <Stack screenListeners={screenListeners} screenOptions={screenOptions}>
        <Stack.Screen name="index" options={page('Home')} />
        <Stack.Screen name="notifications" options={page('Notifications')} />
        <Stack.Screen name="mail/index" options={page('Mail')} />
        <Stack.Screen name="mail/thread/[id]" options={{ title: '' }} />
        <Stack.Screen name="bank/index" options={page('Bank')} />
        <Stack.Screen name="bank/transaction/[id]" options={{ title: 'Transaction' }} />
        <Stack.Screen name="tasks/index" options={page('Tasks')} />
        <Stack.Screen name="tasks/[id]" options={{ title: 'Task' }} />
        <Stack.Screen name="actions/index" options={page('Actions')} />
        <Stack.Screen name="actions/[id]" options={{ title: 'Action' }} />
        <Stack.Screen name="broadcasts" options={page('Broadcasts')} />
        <Stack.Screen name="calls/index" options={page('Calls')} />
        <Stack.Screen name="calls/[id]" options={{ title: 'Call' }} />
        <Stack.Screen name="alpaka/index" options={page('Chat')} />
        <Stack.Screen name="alpaka/rooms/[id]" options={{ title: 'Chat' }} />
        <Stack.Screen name="mikro/index" options={page('Mikro')} />
        <Stack.Screen name="mikro/arraydatasets/index" options={page('Datasets')} />
        <Stack.Screen name="mikro/arraydatasets/[id]" options={{ title: 'Dataset' }} />
        <Stack.Screen name="mikro/lenses/index" options={page('Lenses')} />
        <Stack.Screen name="mikro/lenses/[id]" options={{ title: 'Lens' }} />
        <Stack.Screen name="mikro/folders/index" options={page('Folders')} />
        <Stack.Screen name="mikro/folders/[id]" options={{ title: 'Folder' }} />
        <Stack.Screen name="mikro/files/index" options={page('Files')} />
        <Stack.Screen name="mikro/files/[id]" options={{ title: 'File' }} />
        <Stack.Screen name="mikro/scenes/index" options={page('Scenes')} />
        <Stack.Screen name="mikro/scenes/[id]" options={{ title: 'Scene' }} />
        <Stack.Screen name="mikro/tabledatasets/index" options={page('Tables')} />
        <Stack.Screen name="mikro/tabledatasets/[id]" options={{ title: 'Table' }} />
        <Stack.Screen name="mikro/charts/index" options={page('Charts')} />
        <Stack.Screen name="mikro/charts/[id]" options={{ title: 'Chart' }} />
        <Stack.Screen name="mikro/annotations/index" options={page('Annotations')} />
        <Stack.Screen name="mikro/annotations/[id]" options={{ title: 'Annotation' }} />
        <Stack.Screen name="lokate" options={page('Lokate')} />
        <Stack.Screen name="phone" options={page('Phone')} />
        <Stack.Screen name="solo-broadcast/start" options={{ title: 'Start Solo Broadcast' }} />
        <Stack.Screen name="solo-broadcast/[id]" options={{ title: 'Solo Broadcast' }} />
        <Stack.Screen name="wifi/index" options={page('Wi-Fi')} />
        <Stack.Screen name="wifi/eduroam" options={{ title: 'Eduroam' }} />
        <Stack.Screen name="wifi/standard" options={{ title: 'Standard Wi-Fi' }} />
        <Stack.Screen name="provision" options={page('Provision')} />
        <Stack.Screen name="mesh" options={page('Mesh')} />
        <Stack.Screen name="timeline/index" options={page('Timeline')} />
        <Stack.Screen name="timeline/place/[id]" options={{ title: 'Place' }} />
        <Stack.Screen name="settings" options={page('Settings')} />
        <Stack.Screen name="not-here" options={{ title: 'Not on the phone' }} />
        <Stack.Screen name="debug" options={page('Debug')} />
      </Stack>
    </>
  );
}
