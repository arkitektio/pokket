import { Sidebar } from '@/components/navigation/Sidebar';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Drawer } from 'expo-router/drawer';

/**
 * The app's frame, as orkestrator's: the sidebar beside one page view. On a
 * phone the sidebar is a drawer over the page, swiped in from the left edge.
 * The page view (`(pages)`) is a Stack that draws its own headers.
 */
export default function AppFrame() {
  const colors = useThemeColors();
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
