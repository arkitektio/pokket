import { PickerRow, PickerSearch, PickerSheet } from '@/components/bank/PickerSheet';
import { Text } from '@/components/ui/text';
import { choicePresentation, portLabel, portPlaceholder, SELECT_MAX } from '@/lib/ports/presentation';
import type { PortChoice } from '@/lib/ports/types';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { ChevronDown } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { usePortField } from '../context';
import type { FieldProps } from './Scalars';

const same = (a: unknown, b: unknown) => a === b || (a != null && b != null && JSON.stringify(a) === JSON.stringify(b));

/** A value that opens a sheet: the row every picker in a port form shares. */
export function PickerButton({ text, placeholder, onPress, disabled }: { text?: string | null; placeholder: string; onPress: () => void; disabled?: boolean }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center justify-between gap-2 rounded-xl border border-border bg-background px-4 py-3 active:bg-muted ${disabled ? 'opacity-50' : ''}`}
    >
      <Text numberOfLines={1} className={`shrink text-base ${text ? 'text-foreground' : 'text-muted-foreground'}`}>
        {text || placeholder}
      </Text>
      <ChevronDown size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

/** The choices as a sheet, searchable once there are many. `multiple` keeps it open and ticks several. */
export function ChoiceSheet({
  visible,
  title,
  choices,
  isSelected,
  onPick,
  onClose,
  clearable,
  onClear,
}: {
  visible: boolean;
  title: string;
  choices: readonly PortChoice[];
  isSelected: (choice: PortChoice) => boolean;
  onPick: (choice: PortChoice) => void;
  onClose: () => void;
  clearable?: boolean;
  onClear?: () => void;
}) {
  const [search, setSearch] = React.useState('');
  const term = search.trim().toLowerCase();
  const matches = term ? choices.filter((c) => `${c.label} ${c.description ?? ''}`.toLowerCase().includes(term)) : choices;
  return (
    <PickerSheet visible={visible} title={title} onClose={onClose}>
      {choices.length > SELECT_MAX ? <PickerSearch value={search} onChangeText={setSearch} placeholder="Search" /> : null}
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" className="flex-1">
        {clearable ? <PickerRow title="None" tone="primary" onPress={() => onClear?.()} /> : null}
        {matches.map((choice, index) => (
          <PickerRow
            key={`${index}:${String(choice.label)}`}
            title={choice.label}
            detail={choice.description}
            selected={isSelected(choice)}
            onPress={() => onPick(choice)}
          />
        ))}
      </ScrollView>
    </PickerSheet>
  );
}

/** One of the port's choices: side by side when there are few, in a sheet when there are more. */
export function ChoiceField({ port, path, widget }: FieldProps) {
  const { value, onChange } = usePortField(path);
  const [open, setOpen] = React.useState(false);
  const choices = port.choices ?? [];
  const current = choices.find((choice) => same(choice.value, value));

  if (choicePresentation(choices.length) === 'segmented') {
    return (
      <View className="flex-row flex-wrap gap-2">
        {choices.map((choice, index) => {
          const selected = same(choice.value, value);
          return (
            <Pressable
              key={`${index}:${choice.label}`}
              // Tapping the chosen one of an optional port clears it.
              onPress={() => onChange(selected && port.nullable ? null : choice.value)}
              className={`rounded-full border px-4 py-2 ${selected ? 'border-primary bg-primary' : 'border-border bg-card'}`}
            >
              <Text className={`text-sm font-medium ${selected ? 'text-primary-foreground' : 'text-foreground'}`}>{choice.label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <>
      <PickerButton
        text={current?.label ?? (value != null && value !== '' ? String(value) : null)}
        placeholder={portPlaceholder(port, widget) || 'Choose…'}
        onPress={() => setOpen(true)}
      />
      <ChoiceSheet
        visible={open}
        title={portLabel(port)}
        choices={choices}
        isSelected={(choice) => same(choice.value, value)}
        onPick={(choice) => {
          onChange(choice.value);
          setOpen(false);
        }}
        clearable={!!port.nullable && value != null}
        onClear={() => {
          onChange(null);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
