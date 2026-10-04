import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { App } from '@/lib/app/App';
import { useShareLink } from '@/lib/deeplink/useShareLink';
import { activeTab } from '@/lib/tabs/tabs';
import { useTabs } from '@/lib/tabs/TabsProvider';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { router } from 'expo-router';
import { Menu, Search, Share2 } from 'lucide-react-native';
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
 * Share the page on show as a link that opens it in pokket — orkestrator's
 * share button. A tap shares the link scoped to this organization; a long
 * press shares the private form, which names neither server nor organization.
 */
export function ShareButton() {
  const colors = useThemeColors();
  const route = activeTab(useTabs()).route;
  const { share, sharePrivate } = useShareLink(route);
  return (
    <Pressable
      onPress={share}
      onLongPress={sharePrivate}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Share a link to this page"
      accessibilityHint="Long press for a private link"
      className="ml-3 active:opacity-70"
    >
      <Share2 size={20} color={colors.foreground} />
    </Pressable>
  );
}
