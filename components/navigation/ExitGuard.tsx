import { router, useFocusEffect } from 'expo-router';
import { useDrawerStatus } from 'expo-router/drawer';
import * as React from 'react';
import { BackHandler, Platform, ToastAndroid } from 'react-native';

/** How long the warning stands: a second back inside it closes the app. */
const EXIT_WINDOW_MS = 2000;

/**
 * Android's back button, on the page view's first page, would close the app
 * without a word. The first press only interrupts, with a popout saying so;
 * a second one within two seconds closes it.
 *
 * It only speaks when back has nothing else to do: with the sidebar open,
 * back closes it; with a page pushed, back pops it — both left to navigation.
 * Registered while the page view has focus, and after React Navigation's own
 * handler, so it is asked first (BackHandler calls the newest first).
 */
export function ExitGuard() {
  const drawerStatus = useDrawerStatus();
  const lastPress = React.useRef(0);

  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS !== 'android') return;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (drawerStatus === 'open' || router.canGoBack()) return false;
        const now = Date.now();
        if (now - lastPress.current < EXIT_WINDOW_MS) return false;
        lastPress.current = now;
        // Android's own little popout, as the system uses for the same thing —
        // not an in-app notification.
        ToastAndroid.show('This will leave Pokket. Press back again.', ToastAndroid.SHORT);
        return true;
      });
      return () => subscription.remove();
    }, [drawerStatus]),
  );

  return null;
}
