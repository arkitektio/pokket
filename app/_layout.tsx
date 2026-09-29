import '~/global.css';
// Defines the background location task; must run before anything else, since
// the OS may start the app headless just to deliver locations to it.
import '@/lib/timeline/task';

import { AlertDialogProvider } from '@/components/ui/alert-dialog';
import { ProfileIdentitySync } from '@/components/profile/ProfileIdentitySync';
import { TabsProvider } from '@/lib/tabs/TabsProvider';
import { PushRegistration } from '@/lib/push/PushRegistration';
import { TimelineSync } from '@/lib/timeline/TimelineSync';
import { LokateBackup } from '@/lib/timeline/LokateBackup';
import { UpdatePrompt } from '@/lib/updates/UpdatePrompt';
import { App } from '@/lib/app/App';
import { useArkitektStore } from '@/lib/arkitekt/hooks';
import { ErrorOverlay } from '@/lib/debug/ErrorOverlay';
import { SELFTEST_ENABLED } from '@/lib/mesh/selftest';
import { MeshSelfTestBoot } from '@/lib/mesh/selftestBoot';
import { installGlobalErrorHandlers } from '@/lib/debug/globalHandlers';
import { BrandProvider } from '@/lib/theme/BrandProvider';
import { useColorScheme } from '@/lib/useColorScheme';
import { registerGlobals } from '@livekit/react-native';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Toaster } from 'sonner-native';
import * as React from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

registerGlobals();

// Before anything else can fail: this is what makes async failures — rejected
// promises, throws in callbacks, library `console.error`s — reach the screen.
installGlobalErrorHandlers();


export {
    // Catch any errors thrown by the Layout component.
    ErrorBoundary
} from 'expo-router';


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const AppLayout = () => {
  // One boolean, not the store: this is the root navigator, and it must not
  // re-render on every service check and token refresh.
  const isLoggedIn = useArkitektStore((state) => state.connection?.token !== undefined);
  return (
    <Stack>
      <Stack.Protected guard={isLoggedIn}>
        {/* The sidebar and the one page view (app/(app)). */}
        <Stack.Screen name="(app)" options={{ headerShown: false, title: "Pokket" }} />
        {/* Search: the palette, over everything. */}
        <Stack.Screen name="search" options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={!isLoggedIn} >
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      {/* The on-device mesh check (CI, `pnpm mesh:tailnet`); inert in release builds without EXPO_PUBLIC_MESH_SELFTEST=1. */}
      <Stack.Screen name="mesh-selftest" options={{ title: 'Mesh self-test' }} />
    </Stack>
  );
}





export default function RootLayout() {
  const hasMounted = React.useRef(false);
  const { colorScheme, isDarkColorScheme } = useColorScheme();
  const [isColorSchemeLoaded, setIsColorSchemeLoaded] = React.useState(false);

  useIsomorphicLayoutEffect(() => {
    if (hasMounted.current) {
      return;
    }

    if (Platform.OS === 'web') {
      // Adds the background color to the html element to prevent white background on overscroll.
      document.documentElement.classList.add('bg-background');
    }
    setIsColorSchemeLoaded(true);
    hasMounted.current = true;
  }, []);

  if (!isColorSchemeLoaded) {
    return null;
  }

  return (
    /* sonner-native's Toaster renders a GestureDetector, which throws unless a
       GestureHandlerRootView is above it. Nothing in the app provided one. */
    <GestureHandlerRootView style={{ flex: 1 }}>
      <App.Provider>
        <BrandProvider>
          <AlertDialogProvider>
            <StatusBar style={'light'} />
            <TabsProvider>
              <AppLayout />
            </TabsProvider>
            <ProfileIdentitySync />
            {/* Silent, and only while push is switched on in Settings. */}
            <PushRegistration />
            {/* Only acts while the location timeline is switched on in Settings. */}
            <TimelineSync />
            {/* Only while the timeline backup is on, for the organization it goes to. */}
            <LokateBackup />
            {/* Offers a restart once a released update has downloaded. */}
            <UpdatePrompt />
            {SELFTEST_ENABLED && <MeshSelfTestBoot />}
            {/* lib/lok/funcs.tsx has always reported mutation failures with
                `toast.error`, but nothing ever mounted the renderer, so every one
                of those was discarded. */}
            <Toaster />
            {/* Last child so it draws over the navigator; renders nothing until
                something has actually gone wrong. */}
            <ErrorOverlay />
          </AlertDialogProvider>
        </BrandProvider>
      </App.Provider>
    </GestureHandlerRootView>
  );
}

const useIsomorphicLayoutEffect =
  Platform.OS === 'web' && typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;