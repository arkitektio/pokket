import { Text } from '@/components/ui/text';
import { structureKindName, structurePage } from '@/lib/lovekit/call/structures';
import { showDetail } from '@/lib/navigation';
import { useStructureOptions } from '@/lib/structures/hooks';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { cn } from '@/lib/utils';
import { Bot, ChevronRight, Image as ImageIcon, Layers, Shapes, User, type LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

/**
 * Any structure, shown on the phone (orkestrator's `StructureDisplay`). The
 * desktop hands it to the display of the module that owns it; pokket has no
 * module registry, so every structure is drawn alike: its kind's glyph and
 * name, and its own name as the source that lists it answers (the id where
 * none does).
 */

export type DisplayVariant = 'inline' | 'avatar' | 'chip' | 'card';

const GLYPHS: Record<string, LucideIcon> = {
  '@mikro/arraydataset': ImageIcon,
  '@mikro/scene': Layers,
  '@rekuest/agent': Bot,
  '@lok/user': User,
};

/**
 * The name of the object `id` of `identifier`, asked of the source that lists
 * it; null while unknown or when nothing lists it.
 */
export const useStructureLabel = (identifier: string, id: string): string | null => {
  const search = useStructureOptions(identifier);
  const [named, setNamed] = React.useState<{ key: string; label: string } | null>(null);
  const key = `${identifier}\u0000${id}`;
  React.useEffect(() => {
    if (!search) return;
    let live = true;
    search({ values: [id] }).then(
      (options) => {
        const label = options.find((option) => option.value === id)?.label;
        if (live && label) setNamed({ key, label });
      },
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [search, id, key]);
  return named?.key === key ? named.label : null;
};

export function StructureDisplay({
  identifier,
  id,
  variant = 'card',
  link = false,
  className,
}: {
  identifier: string;
  id: string;
  variant?: DisplayVariant;
  /** Open the structure's own page on a press, when the phone has one. */
  link?: boolean;
  className?: string;
}) {
  const colors = useThemeColors();
  const kind = structureKindName(identifier);
  const label = useStructureLabel(identifier, id) ?? `${kind} ${id}`;
  const Glyph = GLYPHS[identifier] ?? Shapes;
  const page = link ? structurePage(identifier, id) : null;

  const avatar = (size: number) => (
    <View style={{ width: size, height: size }} className="items-center justify-center rounded-full bg-muted">
      <Glyph size={size * 0.55} color={colors.mutedForeground} />
    </View>
  );

  const shown =
    variant === 'inline' ? (
      <Text numberOfLines={1} className={cn('text-sm text-foreground', page && 'text-primary underline', className)}>
        {label}
      </Text>
    ) : variant === 'avatar' ? (
      <View accessibilityLabel={label} className={className}>
        {avatar(32)}
      </View>
    ) : variant === 'chip' ? (
      <View className={cn('flex-row items-center gap-1.5 self-start rounded-full border border-border py-0.5 pl-0.5 pr-2.5', className)}>
        {avatar(20)}
        <Text numberOfLines={1} className="shrink text-xs text-foreground">
          {label}
        </Text>
      </View>
    ) : (
      <View className={cn('flex-row items-center gap-3 rounded-xl border border-border bg-card p-3', className)}>
        {avatar(36)}
        <View className="flex-1 gap-0.5">
          <Text numberOfLines={1} className="text-sm font-medium text-card-foreground">
            {label}
          </Text>
          <Text numberOfLines={1} className="text-xs text-muted-foreground">
            {kind}
          </Text>
        </View>
        {page ? <ChevronRight size={16} color={colors.mutedForeground} /> : null}
      </View>
    );

  if (!page) return shown;
  return (
    <Pressable accessibilityRole="link" onPress={() => showDetail(page)}>
      {shown}
    </Pressable>
  );
}
