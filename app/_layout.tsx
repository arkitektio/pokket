import '~/global.css';

import { AlertDialogProvider } from '@/components/ui/alert-dialog';
import { App } from '@/lib/app/App';
import { useArkitekt } from '@/lib/arkitekt/provider';
import { ErrorOverlay } from '@/lib/debug/ErrorOverlay';
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
  const { connection } = useArkitekt()

  const isLoggedIn = connection?.token !== undefined ? true : false;
  console.log("isLoggedIn:", isLoggedIn);
  return (
    <Stack>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "Pokket" }} />
        <Stack.Screen name="broadcasts" options={{ title: 'Broadcasts' }} />
        <Stack.Screen name="solo-broadcast/start" options={{ title: 'Start Solo Broadcast' }} />
        <Stack.Screen name="solo-broadcast/[id]" options={{ title: 'Solo Broadcast' }} />
        <Stack.Screen name="debug" options={{ title: 'Debug' }} />
        <Stack.Screen name="provision" options={{ title: 'Provision' }} />
        <Stack.Screen name="tasks" options={{ title: 'Tasks' }} />
      </Stack.Protected>
      <Stack.Protected guard={!isLoggedIn} >
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
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
            <AppLayout />
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