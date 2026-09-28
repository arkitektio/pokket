import { Text } from '@/components/ui/text';
import { isRouteActive, linkParams, NavLinkDecl } from '@/lib/modules/catalog';
import { layoutModuleNav } from '@/lib/modules/layout';
import { NamedIcon } from '@/lib/modules/registry';
import { AvailableModule } from '@/lib/modules/useAvailableModules';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { ChevronRight } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

/**
 * One module's links — orkestrator's `ModuleNavCard`: a header that opens
 * the module, then its links in groups. A group whose links say nothing more
 * than their names is a row of chips; otherwise each link is a row with its
 * line of description.
 */
export function ModuleLinks({
  module,
  pathname,
  params,
  onNavigate,
}: {
  module: AvailableModule;
  pathname: string;
  params: Record<string, string | string[] | undefined>;
  onNavigate: (route: string) => void;
}) {
  const colors = useThemeColors();
  const { home, groups } = React.useMemo(() => layoutModuleNav(module), [module]);
  const siblings = React.useMemo(() => linkParams(module), [module]);
  const homeRoute = home?.route ?? module.route;
  const homeActive = isRouteActive(homeRoute, pathname, params, siblings);
  const active = (link: NavLinkDecl) => isRouteActive(link.route, pathname, params, siblings);

  return (
    <View className="gap-3">
      <Pressable
        onPress={() => onNavigate(homeRoute)}
        className={`flex-row items-center gap-3 rounded-xl px-2 py-2 active:bg-muted ${homeActive ? 'bg-muted/70' : ''}`}
      >
        <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <NamedIcon name={module.icon} size={18} color={colors.primary} />
        </View>
        <Text className="flex-1 text-base font-semibold text-foreground">{module.label}</Text>
        <Text className="text-xs text-muted-foreground">{home?.label ?? 'Open'}</Text>
        <ChevronRight size={14} color={colors.mutedForeground} />
      </Pressable>

      {module.status === 'invalid' ? (
        <Text className="px-2 text-xs text-destructive">Not connected — long-press its icon for details.</Text>
      ) : null}

      {groups.map((group) => (
        <View key={group.title} className="gap-1.5">
          <Text className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group.title}
          </Text>
          {group.chips ? (
            <View className="flex-row flex-wrap gap-1.5 px-2">
              {group.links.map((link) => {
                const on = active(link);
                return (
                  <Pressable
                    key={link.route}
                    onPress={() => onNavigate(link.route)}
                    className={`rounded-full border px-3 py-1.5 active:opacity-70 ${
                      on ? 'border-primary bg-primary' : 'border-border bg-background/50'
                    }`}
                  >
                    <Text className={`text-sm ${on ? 'text-primary-foreground' : 'text-foreground'}`}>{link.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            group.links.map((link) => {
              const on = active(link);
              return (
                <Pressable
                  key={link.route}
                  onPress={() => onNavigate(link.route)}
                  className={`flex-row items-center gap-3 rounded-xl px-2 py-2 active:bg-muted ${on ? 'bg-muted/70' : ''}`}
                >
                  <View className="h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <NamedIcon name={link.icon ?? module.icon} size={15} color={on ? colors.primary : colors.mutedForeground} />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-sm ${on ? 'font-semibold text-foreground' : 'text-foreground'}`}>{link.label}</Text>
                    {link.description ? (
                      <Text numberOfLines={1} className="text-xs text-muted-foreground">
                        {link.description}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      ))}
    </View>
  );
}
