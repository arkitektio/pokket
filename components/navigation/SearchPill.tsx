import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { router } from 'expo-router';
import { Search } from 'lucide-react-native';
import { Pressable } from 'react-native';

/**
 * The way into search, and the first thing in the sidebar — orkestrator's
 * `TitleSearchBar`: a field that is really a button opening the palette.
 */
export function SearchPill({ onOpen, large = false }: { onOpen?: () => void; large?: boolean }) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="search"
      accessibilityLabel="Search"
      onPress={() => {
        onOpen?.();
        router.push('/search');
      }}
      className={`flex-row items-center gap-2.5 rounded-xl border border-border bg-background active:opacity-80 ${
        large ? 'px-4 py-3.5' : 'px-3 py-2.5'
      }`}
    >
      <Search size={large ? 20 : 17} color={colors.mutedForeground} />
      <Text className={`flex-1 text-muted-foreground ${large ? 'text-base' : 'text-sm'}`}>
        Search mail, bank, pages…
      </Text>
    </Pressable>
  );
}
