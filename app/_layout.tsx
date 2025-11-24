import '~/global.css';

import { App } from '@/lib/app/App';
import { useArkitekt } from '@/lib/arkitekt/provider';
import { useColorScheme } from '@/lib/useColorScheme';
import { DarkTheme, DefaultTheme, Theme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Platform } from 'react-native';
import { NAV_THEME } from '~/lib/constants';



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

const LIGHT_THEME: Theme = {
  ...DefaultTheme,
  colors: NAV_THEME.light,
};
const DARK_THEME: Theme = {
  ...DarkTheme,
  colors: NAV_THEME.dark,
};




export const AppLayout = () => {
  const { connection } = useArkitekt()

  const isLoggedIn = connection?.token !== undefined ? true : false;
  console.log("isLoggedIn:", isLoggedIn);
  return (
    <Stack>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!isLoggedIn} >
        <Stack.Screen name="login" />
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
    <App.Provider>
      <ThemeProvider value={DARK_THEME}>
        <StatusBar style={'dark'} />
        <AppLayout />
      </ThemeProvider>
    </App.Provider>
  );
}

const useIsomorphicLayoutEffect =
  Platform.OS === 'web' && typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;