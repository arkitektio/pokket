import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import type { LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

export type SearchItem = {
  /** Unique across the whole list, prefixed by its source (`page:`, `entity:`…). */
  key: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  trailing?: React.ReactNode;
  onSelect: () => void;
};

/** One result — orkestrator's `CommandActionRow`, for a thumb. */
export function SearchRow({ item, first }: { item: SearchItem; first?: boolean }) {
  const colors = useThemeColors();
  const Icon = item.icon;
  return (
    <Pressable
      onPress={item.onSelect}
      className={`mx-3 flex-row items-center gap-3 rounded-xl px-3 py-2.5 active:bg-muted ${first ? 'bg-muted/50' : ''}`}
    >
      <View className="h-8 w-8 items-center justify-center rounded-lg bg-muted">
        <Icon size={16} color={colors.mutedForeground} />
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className="text-base text-foreground">
          {item.title}
        </Text>
        {item.description ? (
          <Text numberOfLines={1} className="text-xs text-muted-foreground">
            {item.description}
          </Text>
        ) : null}
      </View>
      {item.trailing}
    </Pressable>
  );
}

export function SearchSectionHeader({ title }: { title: string }) {
  return (
    <View className="bg-background px-6 pb-1 pt-4">
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</Text>
    </View>
  );
}
