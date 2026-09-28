import { Text } from '@/components/ui/text';
import { App } from '@/lib/app/App';
import { MODULE_CATALOG, moduleForPath } from '@/lib/modules/catalog';
import { useAvailableModules } from '@/lib/modules/useAvailableModules';
import { showPage } from '@/lib/navigation';
import { useGlobalSearchParams, usePathname } from 'expo-router';
import { DrawerContentComponentProps, useDrawerStatus } from 'expo-router/drawer';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModuleGrid } from './ModuleGrid';
import { ModuleLinks } from './ModuleLinks';
import { SearchPill } from './SearchPill';
import { SidebarFooter } from './SidebarFooter';
import { TabStrip } from './TabStrip';

const hasLinks = (module: { navLinks: { home?: boolean }[] }) => module.navLinks.some((link) => !link.home);

/**
 * The sidebar, top to bottom as orkestrator's rail: search first (the way
 * to anything), the module icons, the chosen module's links, the tabs, and
 * the organization at the foot. Swiped in from the left edge, or opened from
 * the organization badge in every page's header.
 */
export function Sidebar({ navigation }: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const modules = useAvailableModules();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const status = useDrawerStatus();
  const deployment = App.useActiveProfile()?.label.endpointName;

  const currentKey = moduleForPath(pathname, MODULE_CATALOG)?.key;
  // Every time it opens, it opens on the module of the page on show: a
  // module picked by tapping lasts until the sidebar closes.
  const [picked, setSelectedKey] = React.useState<string | null>(null);
  const [lastStatus, setLastStatus] = React.useState(status);
  if (status !== lastStatus) {
    setLastStatus(status);
    if (status === 'open') setSelectedKey(null);
  }
  const selectedKey = picked ?? currentKey;

  const selected = modules.find((m) => m.key === selectedKey && hasLinks(m));
  const close = () => navigation.closeDrawer();
  const go = (route: string) => {
    close();
    showPage(route);
  };

  return (
    <View style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }} className="flex-1 bg-card px-3">
      <View className="flex-row items-baseline gap-2 px-1 pb-3">
        <Text className="text-lg font-bold text-card-foreground">Pokket</Text>
        {deployment ? (
          <Text numberOfLines={1} className="flex-1 text-xs text-muted-foreground">
            {deployment}
          </Text>
        ) : null}
      </View>

      <SearchPill onOpen={close} />

      <ScrollView className="mt-3 flex-1" contentContainerClassName="gap-4 pb-4" showsVerticalScrollIndicator={false}>
        <ModuleGrid
          modules={modules}
          selectedKey={selected?.key}
          currentKey={currentKey}
          onSelect={(module) =>
            // As orkestrator: a module with links shows them; one without
            // (no popout there either) just opens.
            hasLinks(module) ? setSelectedKey(module.key) : go(module.navLinks.find((l) => l.home)?.route ?? module.route)
          }
        />

        {selected && hasLinks(selected) ? (
          <View className="rounded-2xl border border-border bg-background/40 p-2">
            <ModuleLinks module={selected} pathname={pathname} params={params} onNavigate={go} />
          </View>
        ) : null}

        <TabStrip onDone={close} />
      </ScrollView>

      <SidebarFooter onSettings={() => go('/settings')} />
    </View>
  );
}
