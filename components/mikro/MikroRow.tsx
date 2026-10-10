import { Text } from '@/components/ui/text';
import type { SceneSnapshotFragment } from '@/lib/mikro/api/graphql';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Link, type Href } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { SnapshotImage } from './SnapshotImage';

type Props = {
  href: string;
  icon: LucideIcon;
  title: string;
  detail?: string;
  /** Pass (even null) for kinds that can have a picture; leave out for the rest. */
  snapshot?: SceneSnapshotFragment | null;
  trailing?: React.ReactNode;
};

/** One mikro object in a list: its picture or glyph, name, and a line about it. */
export function MikroRow({ href, icon: Icon, title, detail, snapshot, trailing }: Props) {
  const colors = useThemeColors();
  return (
    <Link href={href as Href} asChild>
      <Pressable className="flex-row items-center gap-3 border-b border-border bg-background px-4 py-3 active:bg-muted">
        {snapshot !== undefined ? (
          <SnapshotImage snapshot={snapshot} icon={Icon} width={44} height={44} radius={8} />
        ) : (
          <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <Icon size={16} color={colors.primary} />
          </View>
        )}
        <View className="flex-1 gap-0.5">
          <Text numberOfLines={1} className="text-base font-medium text-foreground">
            {title}
          </Text>
          {detail ? (
            <Text numberOfLines={1} className="text-xs text-muted-foreground">
              {detail}
            </Text>
          ) : null}
        </View>
        {trailing}
      </Pressable>
    </Link>
  );
}

/** The same object as a picture tile, for the home page's sideways lists. */
export function MikroTile({ href, icon, title, detail, snapshot }: Props) {
  return (
    <Link href={href as Href} asChild>
      <Pressable className="w-36 gap-1.5 active:opacity-70">
        <SnapshotImage snapshot={snapshot} icon={icon} width="100%" height={104} />
        <Text numberOfLines={1} className="text-sm font-medium text-foreground">
          {title}
        </Text>
        {detail ? (
          <Text numberOfLines={1} className="text-xs text-muted-foreground">
            {detail}
          </Text>
        ) : null}
      </Pressable>
    </Link>
  );
}
