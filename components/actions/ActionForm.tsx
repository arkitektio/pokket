import { PortForm } from '@/components/ports/PortForm';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { portLabel } from '@/lib/ports/presentation';
import { blockingPorts } from '@/lib/ports/supported';
import type { FormPort, PortGroup } from '@/lib/ports/types';
import { usePortForm } from '@/lib/ports/usePortForm';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

/**
 * An action's arguments and the button that sends them: the body of
 * orkestrator's `ActionAssignForm`. `start` is what the form begins with, in
 * rekuest's wire format; `onSubmit` gets the arguments back the same way,
 * validated.
 */
export function ActionForm({
  ports,
  groups,
  start,
  hidden,
  submitLabel,
  busy,
  error,
  icon,
  children,
  onSubmit,
}: {
  ports: readonly FormPort[];
  groups?: readonly (PortGroup | null | undefined)[] | null;
  start: Record<string, unknown>;
  hidden?: readonly string[];
  submitLabel: string;
  busy?: boolean;
  /** Why the last submit was refused. */
  error?: string | null;
  icon?: React.ReactNode;
  /** Between the arguments and the button: e.g. which agent runs it. */
  children?: React.ReactNode;
  onSubmit: (args: Record<string, unknown>) => void | Promise<void>;
}) {
  const colors = useThemeColors();
  const state = usePortForm(ports, start);
  // Ports pokket cannot edit never change in the form, so what they start with decides.
  const blocking = React.useMemo(() => blockingPorts(ports, start), [ports, start]);
  const invalid = state.form.formState.submitCount > 0 && !state.form.formState.isValid;

  return (
    <View className="gap-3">
      <PortForm state={state} ports={ports} groups={groups} hidden={hidden} />
      {children}
      {blocking.length ? (
        <Text className="text-sm text-destructive">
          This needs {blocking.map(portLabel).join(', ')}, which pokket cannot set yet. Run it once from orkestrator and pokket
          reuses what you chose there.
        </Text>
      ) : null}
      {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
      {invalid && !error ? <Text className="text-sm text-destructive">Some fields above need a look.</Text> : null}
      <Button disabled={busy || blocking.length > 0} onPress={() => void state.submit(onSubmit)()} className="flex-row gap-2">
        {busy ? <ActivityIndicator color={colors.primaryForeground} /> : icon}
        <Text>{submitLabel}</Text>
      </Button>
    </View>
  );
}
