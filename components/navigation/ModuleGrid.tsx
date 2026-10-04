import { Text } from '@/components/ui/text';
import { useArkitektActions, useServiceState } from '@/lib/arkitekt/hooks';
import { NamedIcon } from '@/lib/modules/registry';
import { AvailableModule } from '@/lib/modules/useAvailableModules';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { ActionSheet } from './ActionSheet';

/** What orkestrator's tile context menu says about a module's service. */
export function ServiceInfo({ serviceKey }: { serviceKey: string }) {
  const state = useServiceState(serviceKey);
  if (!state) return null;
  const alias = state.alias;
  return (
    <View className="gap-1 border-b border-border px-4 py-3">
      <Text className="text-xs text-muted-foreground">Status: {state.status}</Text>
      {alias ? (
        <Text className="text-xs text-muted-foreground">
          Connected to {alias.host}
          {alias.port ? `:${alias.port}` : ''}
          {alias.path ? `/${alias.path}` : ''}
        </Text>
      ) : null}
      <Text className="text-xs text-muted-foreground">
        Last checked: {state.lastCheckedAt ? new Date(state.lastCheckedAt).toLocaleTimeString() : 'never'}
      </Text>
      {state.errors.map((error) => (
        <Text key={error} className="text-xs text-destructive">
          {error}
        </Text>
      ))}
    </View>
  );
}

/**
 * The module icons — orkestrator's rail grid. Tapping one shows its links
 * (the port of hovering it); a long press says how its service is doing and
 * offers a retry (the port of right-clicking it). A module whose service is
 * unwell stays reachable, greyed, so its page can say what is wrong.
 */
export function ModuleGrid({
  modules,
  selectedKey,
  currentKey,
  onSelect,
  size = 44,
}: {
  modules: AvailableModule[];
  selectedKey?: string;
  currentKey?: string;
  onSelect: (module: AvailableModule) => void;
  size?: number;
}) {
  const colors = useThemeColors();
  const { retryService } = useArkitektActions();
  const [info, setInfo] = React.useState<AvailableModule | null>(null);

  return (
    <View className="flex-row flex-wrap gap-2">
      {modules.map((module) => {
        const selected = module.key === selectedKey;
        const dim = module.status === 'invalid' ? 'opacity-35' : module.status === 'checking' ? 'opacity-70' : '';
        return (
          <Pressable
            key={module.key}
            onPress={() => onSelect(module)}
            onLongPress={() => (module.serviceKey ? setInfo(module) : undefined)}
            accessibilityRole="button"
            accessibilityLabel={module.label}
            accessibilityState={{ selected }}
            style={{ width: size, height: size }}
            className={`items-center justify-center rounded-xl border ${
              selected ? 'border-primary/40 bg-primary/15' : 'border-border/60 bg-background/40'
            } active:opacity-70 ${dim}`}
          >
            <NamedIcon name={module.icon} size={size * 0.45} color={selected ? colors.primary : colors.foreground} />
            {module.key === currentKey && !selected ? (
              <View className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
            ) : null}
          </Pressable>
        );
      })}
      <ActionSheet
        visible={!!info}
        title={info?.label}
        onClose={() => setInfo(null)}
        options={
          info?.serviceKey
            ? [{ label: 'Retry connection', onPress: () => void retryService(info.serviceKey!) }]
            : []
        }
      >
        {info?.serviceKey ? <ServiceInfo serviceKey={info.serviceKey} /> : null}
      </ActionSheet>
    </View>
  );
}
