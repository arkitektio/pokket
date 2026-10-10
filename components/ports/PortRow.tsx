import { Text } from '@/components/ui/text';
import * as React from 'react';
import { View } from 'react-native';

/** The house input: what every text control in a port form looks like. */
export const INPUT_CLASS = 'rounded-xl border border-border bg-background px-4 py-3 text-base';

/**
 * One port in a form: its label, the control, a line about it, and what is
 * wrong with it. `aside` puts a small control (a switch) beside the label.
 */
export function PortRow({
  label,
  description,
  error,
  aside,
  children,
}: {
  label: string;
  description?: string | null;
  error?: string | null;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <View className="gap-1.5 py-2.5">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="shrink text-sm font-medium text-foreground">{label}</Text>
        {aside}
      </View>
      {children}
      {error ? (
        <Text className="text-xs text-destructive">{error}</Text>
      ) : description ? (
        <Text className="text-xs text-muted-foreground">{description}</Text>
      ) : null}
    </View>
  );
}
