import { Text } from '@/components/ui/text';
import { PortKind } from '@/lib/ports/kinds';
import { portPlaceholder } from '@/lib/ports/presentation';
import { unsupportedReason } from '@/lib/ports/supported';
import type { FormPort, StructureValue } from '@/lib/ports/types';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { MonitorSmartphone } from 'lucide-react-native';
import * as React from 'react';
import { Platform, Switch, TextInput, View } from 'react-native';
import { usePortField } from '../context';
import { INPUT_CLASS } from '../PortRow';

export type FieldProps = { port: FormPort; path: string[]; widget: { [key: string]: any } | null };

export function StringField({ port, path, widget }: FieldProps) {
  const colors = useThemeColors();
  const { value, onChange, onBlur } = usePortField(path);
  const paragraph = !!widget?.asParagraph;
  return (
    <TextInput
      value={typeof value === 'string' ? value : value == null ? '' : String(value)}
      // An emptied optional field is unanswered, not an empty string.
      onChangeText={(text) => onChange(text === '' && port.nullable ? null : text)}
      onBlur={onBlur}
      placeholder={portPlaceholder(port, widget)}
      placeholderTextColor={colors.mutedForeground}
      multiline={paragraph}
      textAlignVertical={paragraph ? 'top' : 'auto'}
      style={{ color: colors.foreground, minHeight: paragraph ? 96 : undefined }}
      className={INPUT_CLASS}
    />
  );
}

/** Kept as typed: "1." and "-" are on the way to a number. The form reads the number when it validates. */
export function NumberField({ port, path, widget }: FieldProps) {
  const colors = useThemeColors();
  const { value, onChange, onBlur } = usePortField(path);
  return (
    <TextInput
      value={value == null ? '' : String(value)}
      onChangeText={(text) => onChange(text.replace(',', '.'))}
      onBlur={onBlur}
      placeholder={portPlaceholder(port, widget)}
      placeholderTextColor={colors.mutedForeground}
      // iOS's number pad has no minus; this one has. Android's numeric keyboard has both.
      keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : port.kind === PortKind.Int ? 'numeric' : 'decimal-pad'}
      autoCorrect={false}
      style={{ color: colors.foreground }}
      className={INPUT_CLASS}
    />
  );
}

/** Sits beside the label, not under it. */
export function BoolSwitch({ path }: { path: string[] }) {
  const colors = useThemeColors();
  const { value, onChange } = usePortField(path);
  return <Switch value={Boolean(value)} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.muted }} />;
}

/** A structure nothing offers a search for: its id, typed in. */
export function StructureField({ port, path }: FieldProps) {
  const colors = useThemeColors();
  const { value, onChange, onBlur } = usePortField(path);
  const id = (value as StructureValue | null | undefined)?.object ?? '';
  return (
    <TextInput
      value={id}
      onChangeText={(text) => onChange(text.trim() ? { __identifier: port.identifier ?? '', object: text.trim() } : null)}
      onBlur={onBlur}
      placeholder="Its id"
      placeholderTextColor={colors.mutedForeground}
      autoCorrect={false}
      autoCapitalize="none"
      style={{ color: colors.foreground }}
      className={INPUT_CLASS}
    />
  );
}

/**
 * A port pokket cannot edit. It stays in the form with whatever value it
 * started with, so a previous run's choice is sent again.
 */
export function UnsupportedField({ port, path }: FieldProps) {
  const colors = useThemeColors();
  const { value } = usePortField(path);
  const set = value !== null && value !== undefined && value !== '';
  return (
    <View className="flex-row items-start gap-2.5 rounded-xl border border-dashed border-border bg-muted/40 px-3 py-2.5">
      <MonitorSmartphone size={16} color={colors.mutedForeground} style={{ marginTop: 2 }} />
      <View className="flex-1 gap-0.5">
        <Text className="text-sm text-foreground">Set this from orkestrator</Text>
        <Text className="text-xs text-muted-foreground">
          {unsupportedReason(port)}{' '}
          {set ? 'The value of the last run is used.' : port.nullable ? 'It is optional and is left out.' : 'It is required, so this cannot run from pokket yet.'}
        </Text>
      </View>
    </View>
  );
}
