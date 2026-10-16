import { Text } from '@/components/ui/text';
import { moduleByKey, type NavLinkDecl } from '@/lib/modules/catalog';
import { homePageLinks } from '@/lib/modules/layout';
import { NamedIcon } from '@/lib/modules/registry';
import { showPage } from '@/lib/navigation';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { ChevronRight, TriangleAlert } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, useWindowDimensions, View } from 'react-native';

/**
 * A module's home page, every module the same — orkestrator's `ModuleHome`
 * (core/layout/ModuleHome.tsx): its name and one line on what it holds, then
 * its pages, then what is new or pinned. Header, pages and headings keep the
 * page's gutter; what a section holds runs edge to edge, as pokket's rows do.
 *
 * Not a scroll view: a page wraps it in one, or hands it to its list as the
 * list's header, so the list stays virtualized.
 */

/** Below this a tile's description wraps too much: fewer, wider columns. */
const MIN_TILE = 150;
const GAP = 8;

/** A page with a line of description: a tile. Without `width`, it takes the row. */
export function PageTile({ link, icon, width }: { link: NavLinkDecl; icon: string; width?: number }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={() => showPage(link.route)}
      style={width ? { width } : undefined}
      className="flex-row items-start gap-3 rounded-xl border border-border/50 bg-muted/20 p-3 active:border-primary/30 active:bg-muted/50"
    >
      <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
        <NamedIcon name={link.icon ?? icon} size={16} color={colors.primary} />
      </View>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-sm font-medium leading-tight text-foreground">
          {link.label}
        </Text>
        {link.description ? (
          <Text numberOfLines={2} className="mt-0.5 text-xs leading-snug text-muted-foreground">
            {link.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** A page whose label says it all: a pill. */
function PageChip({ link, icon }: { link: NavLinkDecl; icon: string }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={() => showPage(link.route)}
      className="h-8 flex-row items-center gap-1.5 rounded-full border border-border/50 bg-muted/20 px-3 active:border-primary/30 active:bg-muted/50"
    >
      <NamedIcon name={link.icon ?? icon} size={14} color={colors.mutedForeground} />
      <Text className="text-xs text-muted-foreground">{link.label}</Text>
    </Pressable>
  );
}

/**
 * A module's pages, grouped as the sidebar's card on its icon groups them
 * (`layoutModuleNav`), so a page added to the catalog shows up in both.
 * Tiles with their description, pills for a group that has none. The home
 * page itself is left out, and so are its own views (mail's mailboxes), which
 * the page switches between with its chips.
 */
export function ModulePageLinks({ moduleKey }: { moduleKey: string }) {
  const module = moduleByKey(moduleKey);
  const groups = React.useMemo(() => (module ? homePageLinks(module) : []), [module]);
  // The window until the row is measured, so a remount does not flash empty.
  const window = useWindowDimensions();
  const [measured, setWidth] = React.useState(0);
  const width = measured || window.width - 32;
  if (!module || groups.length === 0) return null;

  const columns = Math.max(1, Math.floor((width + GAP) / (MIN_TILE + GAP)));
  const tile = Math.floor((width - GAP * (columns - 1)) / columns);

  return (
    <View className="gap-5 px-4" onLayout={(e) => setWidth(e.nativeEvent.layout.width - 32)}>
      {groups.map((group) => (
        <View key={group.title}>
          <HomeSectionHeading inset={false}>{group.title}</HomeSectionHeading>
          {group.chips ? (
            <View className="flex-row flex-wrap gap-1.5">
              {group.links.map((link) => (
                <PageChip key={link.route} link={link} icon={module.icon} />
              ))}
            </View>
          ) : (
            <View className="flex-row flex-wrap" style={{ gap: GAP }}>
              {group.links.map((link) => (
                <PageTile key={link.route} link={link} icon={module.icon} width={tile} />
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

/**
 * The small uppercase label over a block of a module's home page. With
 * `more`, it opens that block's full page.
 */
export function HomeSectionHeading({
  children,
  more,
  inset = true,
}: {
  children: React.ReactNode;
  more?: string;
  /** Keep the page's gutter; off inside something that already has it. */
  inset?: boolean;
}) {
  const colors = useThemeColors();
  const label = (
    <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</Text>
  );
  return (
    <View className={`mb-2 flex-row items-center justify-between ${inset ? 'px-4' : 'px-0.5'}`}>
      {label}
      {more ? (
        <Pressable onPress={() => showPage(more)} hitSlop={8} className="flex-row items-center gap-0.5 active:opacity-60">
          <Text className="text-xs font-medium text-primary">See all</Text>
          <ChevronRight size={12} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * A titled block of a module's home page — recent items, pinned ones.
 * Callers render it only when there is something in it: a home page says
 * nothing about what is not there.
 */
export function HomeSection({ title, more, children }: { title: string; more?: string; children: React.ReactNode }) {
  return (
    <View>
      <HomeSectionHeading more={more}>{title}</HomeSectionHeading>
      {children}
    </View>
  );
}

/**
 * What a module's home page shows under its pages while the module holds
 * nothing yet: a dashed box saying how to put something in. The pages stay
 * above it — they are where things will be once there are some.
 */
export function HomeEmpty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <View className="mx-4 rounded-xl border border-dashed border-border/70 px-4 py-6">
      <Text className="text-base font-medium text-foreground">{title}</Text>
      {typeof children === 'string' ? (
        <Text className="mt-1 text-sm text-muted-foreground">{children}</Text>
      ) : children ? (
        <View className="mt-1">{children}</View>
      ) : null}
    </View>
  );
}

/** Under the pages while what follows them is still on its way. */
export function HomeLoading() {
  const colors = useThemeColors();
  return <ActivityIndicator className="py-6" color={colors.primary} />;
}

/**
 * What a module's home page shows under its pages when the query behind its
 * recent items failed, so the pages above stay usable.
 */
export function HomeError({ what, error, onRetry }: { what: string; error: { message: string }; onRetry: () => void }) {
  const colors = useThemeColors();
  return (
    <View className="mx-4 flex-row items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <TriangleAlert size={18} color={colors.destructive} />
      <View className="flex-1 gap-1">
        <Text className="text-sm font-medium text-foreground">Could not load {what}</Text>
        <Text numberOfLines={3} className="text-xs text-muted-foreground">
          {error.message}
        </Text>
        <Pressable onPress={onRetry} className="mt-2 self-start rounded-lg bg-muted px-3 py-1.5 active:opacity-70">
          <Text className="text-sm text-foreground">Retry</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** The module's name and one line on what it holds, with its sidebar icon. */
export function ModuleHomeHeader({
  moduleKey,
  title,
  description,
}: {
  moduleKey: string;
  /** Defaults to the module's name. */
  title?: React.ReactNode;
  /** Defaults to the module's line in the catalog. */
  description?: React.ReactNode;
}) {
  const colors = useThemeColors();
  const module = moduleByKey(moduleKey);
  const line = description ?? module?.description;
  return (
    <View className="flex-row items-center gap-3 px-4">
      <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
        <NamedIcon name={module?.icon} size={20} color={colors.primary} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-2xl font-semibold tracking-tight text-foreground">{title ?? module?.label}</Text>
        {line ? <Text className="text-sm text-muted-foreground">{line}</Text> : null}
      </View>
    </View>
  );
}

/**
 * A module's home page: header, the module's pages, then `children`. `lead`
 * sits between the header and the pages, for the one thing a module's home
 * is mostly used for (lokate's backup); most have none.
 */
export function ModuleHome({
  moduleKey,
  title,
  description,
  lead,
  className,
  children,
}: {
  moduleKey: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  lead?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <View className={`gap-8 pt-5 ${className ?? ''}`}>
      <ModuleHomeHeader moduleKey={moduleKey} title={title} description={description} />
      {lead}
      <ModulePageLinks moduleKey={moduleKey} />
      {children}
    </View>
  );
}
