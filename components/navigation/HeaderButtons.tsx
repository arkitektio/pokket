import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { App } from '@/lib/app/App';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { router } from 'expo-router';
import { Menu, Search } from 'lucide-react-native';
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
