import { Sidebar } from '@/components/navigation/Sidebar';
import { runPendingNavigation } from '@/lib/navigation';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { useNavigation } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import * as React from 'react';

/**
 * The app's frame, as orkestrator's: the sidebar beside one page view. On a
 * phone the sidebar is a drawer over the page, swiped in from the left edge.
 * The page view (`(pages)`) is a Stack that draws its own headers.
 */
export default function AppFrame() {
  const colors = useThemeColors();
  const navigation = useNavigation();
  // Where search's picks are carried out: here the page view has focus, so
  // a navigation lands in it, not in the root stack beside the app.
  React.useEffect(() => navigation.addListener('focus', runPendingNavigation), [navigation]);

  return (
    <Drawer
      drawerContent={(props) => <Sidebar {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        swipeEnabled: true,
        swipeEdgeWidth: 60,
        overlayColor: 'rgba(0,0,0,0.45)',
        drawerStyle: { width: 300, backgroundColor: colors.card },
      }}
    >
      <Drawer.Screen name="(pages)" />
    </Drawer>
  );
}
