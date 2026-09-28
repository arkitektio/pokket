import { Text } from '@/components/ui/text';
import { MODULE_CATALOG, moduleForPath, pathOf } from '@/lib/modules/catalog';
import { NamedIcon } from '@/lib/modules/registry';
import { TabRecord } from '@/lib/tabs/tabs';
import { useTabActions, useTabs } from '@/lib/tabs/TabsProvider';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { router } from 'expo-router';
import { Pin, Plus, X } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { ActionSheet } from './ActionSheet';

/**
 * The sidebar's tabs — orkestrator's `RailTabs`: pinned tabs first (the
 * bookmarks: no close button, never evicted), then the open ones. Tap to show
 * a tab; the pin toggles in place; a long press offers what orkestrator puts
 * in the context menu and in drag-and-drop (move up and down, close others).
 */
export function TabStrip({ onDone }: { onDone: () => void }) {
  const colors = useThemeColors();
  const { tabs, activeId } = useTabs();
  const actions = useTabActions();
  const [menuFor, setMenuFor] = React.useState<TabRecord | null>(null);
  const pinnedCount = tabs.filter((t) => t.pinned).length;

  const newTab = () => {
    actions.open('/');
    onDone();
    router.push('/search');
  };

  return (
    <View className="gap-0.5">
      <View className="flex-row items-center justify-between px-2 pb-1">
        <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Open</Text>
        <Pressable onPress={newTab} hitSlop={8} accessibilityLabel="New tab" className="rounded-md p-1 active:bg-muted">
          <Plus size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>
      {tabs.map((tab, index) => {
        const active = tab.id === activeId;
        const icon = moduleForPath(pathOf(tab.route), MODULE_CATALOG)?.icon;
        return (
          <React.Fragment key={tab.id}>
            {index === pinnedCount && pinnedCount > 0 ? <View className="mx-2 my-1 h-px bg-border" /> : null}
            <Pressable
              onPress={() => {
                actions.switchTo(tab.id);
                onDone();
              }}
              onLongPress={() => setMenuFor(tab)}
              className={`flex-row items-center gap-2.5 rounded-lg px-2 py-2 active:bg-muted ${active ? 'bg-muted/80' : ''}`}
            >
              <View className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-primary' : 'bg-transparent'}`} />
              <NamedIcon name={icon} size={15} color={active ? colors.foreground : colors.mutedForeground} />
              <Text
                numberOfLines={1}
                className={`flex-1 text-sm ${active ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
              >
                {tab.label}
              </Text>
              <Pressable
                hitSlop={6}
                onPress={() => actions.setPinned(tab.id, !tab.pinned)}
                accessibilityLabel={tab.pinned ? 'Unpin tab' : 'Pin tab'}
                className={`p-1 ${tab.pinned ? '' : 'opacity-40'}`}
              >
                <Pin
                  size={13}
                  color={tab.pinned ? colors.primary : colors.mutedForeground}
                  fill={tab.pinned ? colors.primary : 'transparent'}
                />
              </Pressable>
              {tab.pinned ? (
                // Holds the close button's place, so the pin does not move.
                <View className="w-[21px]" />
              ) : (
                <Pressable
                  hitSlop={6}
                  onPress={() => actions.close(tab.id)}
                  accessibilityLabel="Close tab"
                  className="p-1"
                >
                  <X size={13} color={colors.mutedForeground} />
                </Pressable>
              )}
            </Pressable>
          </React.Fragment>
        );
      })}
      <ActionSheet
        visible={!!menuFor}
        title={menuFor?.label}
        onClose={() => setMenuFor(null)}
        options={
          menuFor
            ? [
                { label: menuFor.pinned ? 'Unpin' : 'Pin', onPress: () => actions.setPinned(menuFor.id, !menuFor.pinned) },
                { label: 'Move up', onPress: () => actions.move(menuFor.id, -1) },
                { label: 'Move down', onPress: () => actions.move(menuFor.id, 1) },
                { label: 'Close others', onPress: () => actions.closeOthers(menuFor.id) },
                { label: 'Close', destructive: true, onPress: () => actions.close(menuFor.id) },
              ]
            : []
        }
      />
    </View>
  );
}
