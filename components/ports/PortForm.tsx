import { Text } from '@/components/ui/text';
import { notEmpty } from '@/lib/ports/kinds';
import type { FormPort, PortGroup } from '@/lib/ports/types';
import type { PortForm as PortFormState } from '@/lib/ports/usePortForm';
import * as React from 'react';
import { FormProvider } from 'react-hook-form';
import { View } from 'react-native';
import { MountedProvider } from './context';
import { HiddenPortField, PortField } from './PortField';

/**
 * An action's arguments as a form: orkestrator's `ArgsContainer`. Ports are
 * laid out by the action's groups, one under the other; a port no group names
 * comes last. `hidden` ports (already filled in: the object a run was started
 * on, a chat's message) take no room but stay in the form.
 */
export function PortForm({
  state,
  ports,
  groups,
  hidden,
}: {
  state: PortFormState;
  ports: readonly FormPort[];
  groups?: readonly (PortGroup | null | undefined)[] | null;
  hidden?: readonly string[];
}) {
  const sections = React.useMemo(() => {
    const declared = (groups ?? []).filter(notEmpty);
    const grouped = new Set(declared.flatMap((group) => group.ports));
    const byKey = new Map(ports.map((port) => [port.key, port]));
    const ungrouped = ports.filter((port) => !grouped.has(port.key));
    return [
      ...declared.map((group) => ({ key: group.key, title: group.title || group.key, description: group.description, ports: group.ports.map((key) => byKey.get(key)).filter(notEmpty) })),
      ...(ungrouped.length ? [{ key: 'default', title: null, description: null, ports: ungrouped }] : []),
    ].filter((section) => section.ports.length > 0);
  }, [ports, groups]);

  const isHidden = (port: FormPort) => !!hidden?.includes(port.key);
  const visible = ports.filter((port) => !isHidden(port));

  return (
    <FormProvider {...state.form}>
      <MountedProvider value={state.mounted}>
        {ports.filter(isHidden).map((port) => (
          <HiddenPortField key={port.key} path={[port.key]} />
        ))}
        {visible.length === 0 ? <Text className="py-2 text-sm text-muted-foreground">Nothing to set.</Text> : null}
        {sections.map((section) => {
          const shown = section.ports.filter((port) => !isHidden(port));
          if (shown.length === 0) return null;
          return (
            <View key={section.key}>
              {section.title && section.key !== 'default' ? (
                <View className="pb-1 pt-3">
                  <Text className="text-xs font-semibold uppercase text-muted-foreground">{section.title}</Text>
                  {section.description ? <Text className="text-xs text-muted-foreground">{section.description}</Text> : null}
                </View>
              ) : null}
              {shown.map((port) => (
                <PortField key={port.key} port={port} path={[port.key]} />
              ))}
            </View>
          );
        })}
      </MountedProvider>
    </FormProvider>
  );
}
