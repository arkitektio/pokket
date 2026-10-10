import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { App } from '@/lib/app/App';
import { useShareLink } from '@/lib/deeplink/useShareLink';
import { activeTab } from '@/lib/tabs/tabs';
import { useTabs } from '@/lib/tabs/TabsProvider';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { router } from 'expo-router';
import { ChevronLeft, Menu, Search, Share2 } from 'lucide-react-native';
import { Pressable } from 'react-native';

/** Opens the sidebar: the live organization's badge, as orkestrator's rail foot. */
export function MenuButton({ onPress }: { onPress: () => void }) {
  const colors = useThemeColors();
  const active = App.useActiveProfile();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Open navigation"
      className="mr-3 active:opacity-70"
    >
      {active ? <ProfileAvatar profile={active} size={30} /> : <Menu size={24} color={colors.foreground} />}
    </Pressable>
  );
}

/** Back to the page one came from, beside the sidebar's button on a page that has one. */
export function BackButton() {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      className="mr-2 active:opacity-70"
    >
      <ChevronLeft size={26} color={colors.foreground} />
    </Pressable>
  );
}

export function SearchButton() {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={() => router.push('/search')}
      hitSlop={10}
      accessibilityRole="search"
      accessibilityLabel="Search"
      className="ml-3 active:opacity-70"
    >
      <Search size={22} color={colors.foreground} />
    </Pressable>
  );
}

/**
 * Share the page on show as a link through the organization's front door —
 * orkestrator's share button.
 */
export function ShareButton() {
  const colors = useThemeColors();
  const route = activeTab(useTabs()).route;
  const { share } = useShareLink(route);
  return (
    <Pressable
      onPress={share}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Share a link to this page"
      className="ml-3 active:opacity-70"
    >
      <Share2 size={20} color={colors.foreground} />
    </Pressable>
  );
}
