import { MenuButton, SearchButton } from '@/components/navigation/HeaderButtons';
import { routeOf } from '@/lib/modules/catalog';
import { useSyncActiveTabRoute } from '@/lib/tabs/TabsProvider';
import { Stack, useGlobalSearchParams, usePathname } from 'expo-router';
import type { DrawerNavigationProp } from 'expo-router/drawer';
import * as React from 'react';

type ParamList = Record<string, object | undefined>;

/**
 * The one page view: every page and the details pushed over it. A page at
 * the root of the stack opens the sidebar from its header; a pushed one has
 * its back button instead, and there the left-edge swipe goes back rather
 * than opening the sidebar. Every navigation updates the active tab.
 */
export default function PagesLayout() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const route = React.useMemo(() => routeOf(pathname, params), [pathname, params]);
  useSyncActiveTabRoute(route);

  return (
    <Stack
      screenListeners={({ navigation }) => ({
        focus: () => {
          const drawer = navigation.getParent() as DrawerNavigationProp<ParamList> | undefined;
          drawer?.setOptions({ swipeEnabled: !navigation.canGoBack() });
        },
      })}
      screenOptions={({ navigation }) => {
        const drawer = navigation.getParent() as DrawerNavigationProp<ParamList> | undefined;
        return {
          headerLeft: navigation.canGoBack()
            ? undefined
            : () => <MenuButton onPress={() => drawer?.openDrawer()} />,
          headerRight: () => <SearchButton />,
        };
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="mail/index" options={{ title: 'Mail' }} />
      <Stack.Screen name="mail/thread/[id]" options={{ title: '' }} />
      <Stack.Screen name="bank/index" options={{ title: 'Bank' }} />
      <Stack.Screen name="bank/transaction/[id]" options={{ title: 'Transaction' }} />
      <Stack.Screen name="tasks" options={{ title: 'Tasks' }} />
      <Stack.Screen name="broadcasts" options={{ title: 'Broadcasts' }} />
      <Stack.Screen name="solo-broadcast/start" options={{ title: 'Start Solo Broadcast' }} />
      <Stack.Screen name="solo-broadcast/[id]" options={{ title: 'Solo Broadcast' }} />
      <Stack.Screen name="wifi/index" options={{ title: 'Wi-Fi' }} />
      <Stack.Screen name="wifi/eduroam" options={{ title: 'Eduroam' }} />
      <Stack.Screen name="wifi/standard" options={{ title: 'Standard Wi-Fi' }} />
      <Stack.Screen name="provision" options={{ title: 'Provision' }} />
      <Stack.Screen name="mesh" options={{ title: 'Mesh' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="debug" options={{ title: 'Debug' }} />
    </Stack>
  );
}
