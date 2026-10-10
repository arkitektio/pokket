import { PickerSheet } from '@/components/bank/PickerSheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { notEmpty, PortKind } from '@/lib/ports/kinds';
import { isTagListPort, portLabel, portPlaceholder } from '@/lib/ports/presentation';
import { effectiveWidget } from '@/lib/ports/supported';
import type { FormPort } from '@/lib/ports/types';
import { pathToName } from '@/lib/ports/values';
import { useWardClient } from '@/lib/ports/wards';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Plus, X } from 'lucide-react-native';
import * as React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Pressable, TextInput, View } from 'react-native';
import { usePortField, useWidgetDependencies } from '../context';
import { INPUT_CLASS } from '../PortRow';
import { ChoiceSheet, PickerButton } from './ChoiceField';
import type { FieldProps } from './Scalars';
import { optionValue, SearchResults, useOptionLabels, valueId } from './SearchField';

/** A list in the form is rows of `{ __value }`, so react-hook-form can key them. */
type Row = { __value: unknown };
const rowsOf = (value: unknown): Row[] => (Array.isArray(value) ? (value as Row[]) : []);

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center gap-1 rounded-full border border-border bg-card py-1 pl-3 pr-1.5">
      <Text numberOfLines={1} className="max-w-[200px] text-sm text-foreground">
        {label}
      </Text>
      <Pressable hitSlop={8} onPress={onRemove} accessibilityLabel={`Remove ${label}`}>
        <X size={14} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

const Chips = ({ labels, onRemove }: { labels: string[]; onRemove: (index: number) => void }) =>
  labels.length ? (
    <View className="flex-row flex-wrap gap-1.5">
      {labels.map((label, index) => (
        <Chip key={`${index}:${label}`} label={label} onRemove={() => onRemove(index)} />
      ))}
    </View>
  ) : null;

/** Plain texts or numbers: typed one at a time, shown as chips. */
function TagList({ port, child, path }: { port: FormPort; child: FormPort; path: string[] }) {
  const colors = useThemeColors();
  const { value, onChange } = usePortField(path);
  const rows = rowsOf(value);
  const [draft, setDraft] = React.useState('');
  const numeric = child.kind === PortKind.Int || child.kind === PortKind.Float;

  const add = () => {
    const text = draft.trim().replace(',', '.');
    if (!text) return;
    const parsed = numeric ? Number(text) : text;
    if (numeric && (Number.isNaN(parsed) || (child.kind === PortKind.Int && !Number.isInteger(parsed)))) return;
    onChange([...rows, { __value: parsed }]);
    setDraft('');
  };

  return (
    <View className="gap-2">
      <Chips labels={rows.map((row) => String(row.__value))} onRemove={(index) => onChange(rows.filter((_, i) => i !== index))} />
      <View className="flex-row items-center gap-2">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          submitBehavior="submit"
          returnKeyType="done"
          placeholder={portPlaceholder(port)}
          placeholderTextColor={colors.mutedForeground}
          keyboardType={numeric ? 'numbers-and-punctuation' : 'default'}
          autoCorrect={false}
          style={{ color: colors.foreground }}
          className={`flex-1 ${INPUT_CLASS}`}
        />
        <Pressable
          onPress={add}
          disabled={!draft.trim()}
          accessibilityLabel="Add"
          className={`h-11 w-11 items-center justify-center rounded-full ${draft.trim() ? 'bg-primary' : 'bg-muted'}`}
        >
          <Plus size={18} color={draft.trim() ? colors.primaryForeground : colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

/** Several of the child's choices, ticked in a sheet. */
function ChoiceList({ port, child, path }: { port: FormPort; child: FormPort; path: string[] }) {
  const { value, onChange } = usePortField(path);
  const rows = rowsOf(value);
  const [open, setOpen] = React.useState(false);
  const choices = child.choices ?? [];
  const has = (v: unknown) => rows.some((row) => JSON.stringify(row.__value) === JSON.stringify(v));
  return (
    <View className="gap-2">
      <Chips
        labels={rows.map((row) => choices.find((c) => JSON.stringify(c.value) === JSON.stringify(row.__value))?.label ?? String(row.__value))}
        onRemove={(index) => onChange(rows.filter((_, i) => i !== index))}
      />
      <PickerButton placeholder={portPlaceholder(port) || 'Add…'} onPress={() => setOpen(true)} />
      <ChoiceSheet
        visible={open}
        title={portLabel(port)}
        choices={choices}
        isSelected={(choice) => has(choice.value)}
        onPick={(choice) =>
          onChange(has(choice.value) ? rows.filter((row) => JSON.stringify(row.__value) !== JSON.stringify(choice.value)) : [...rows, { __value: choice.value }])
        }
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

/** Several results of the child's search, ticked in a sheet that stays open. */
function SearchList({ port, child, widget, path }: { port: FormPort; child: FormPort; widget: { [key: string]: any }; path: string[] }) {
  const client = useWardClient(widget.ward);
  const { value, onChange } = usePortField(path);
  const { values, met, waitingFor } = useWidgetDependencies(widget.dependencies, path);
  const rows = rowsOf(value);
  const [open, setOpen] = React.useState(false);
  const [seen, setSeen] = React.useState<Record<string, string>>({});

  const query: string = widget.query ?? '';
  const search = React.useMemo(() => (client && query && met ? { client, query, dependencies: values } : null), [client, query, met, values]);
  const ids = rows.map((row) => valueId(row.__value)).filter(notEmpty);
  const asked = useOptionLabels(search, ids);

  if (!client || !query) return <Text className="text-sm text-muted-foreground">Pokket cannot search {widget.ward || 'this service'}.</Text>;

  return (
    <View className="gap-2">
      <Chips labels={ids.map((id) => seen[id] ?? asked[id] ?? id)} onRemove={(index) => onChange(rows.filter((_, i) => i !== index))} />
      <PickerButton
        placeholder={met ? portPlaceholder(port) || 'Add…' : `Waiting for ${waitingFor.join(', ')}`}
        disabled={!met}
        onPress={() => setOpen(true)}
      />
      <PickerSheet visible={open} title={portLabel(port)} onClose={() => setOpen(false)}>
        {search ? (
          <SearchResults
            search={search}
            isSelected={(option) => ids.includes(option.value)}
            onLabel={(option) => setSeen((known) => ({ ...known, [option.value]: option.label }))}
            onPick={(option) =>
              onChange(
                ids.includes(option.value)
                  ? rows.filter((row) => valueId(row.__value) !== option.value)
                  : [...rows, { __value: optionValue(child, option) }],
              )
            }
          />
        ) : null}
        <View className="px-3 pt-2">
          <Button onPress={() => setOpen(false)}>
            <Text>Done</Text>
          </Button>
        </View>
      </PickerSheet>
    </View>
  );
}

/** Anything else: one card per item, each the child's own field. */
function ItemList({ child, path, Field }: { child: FormPort; path: string[]; Field: React.ComponentType<{ port: FormPort; path: string[]; bare?: boolean }> }) {
  const colors = useThemeColors();
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: pathToName(path) });
  return (
    <View className="gap-2">
      {fields.map((field, index) => (
        <View key={field.id} className="flex-row items-start gap-2 rounded-xl border border-border bg-card px-3">
          <View className="flex-1">
            <Field port={{ ...child, key: '__value', label: child.label || `Item ${index + 1}` }} path={[...path, String(index), '__value']} />
          </View>
          <Pressable hitSlop={8} onPress={() => remove(index)} accessibilityLabel={`Remove item ${index + 1}`} className="pt-3.5">
            <X size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>
      ))}
      <Button variant="outline" onPress={() => append({ __value: child.default ?? null })} className="flex-row gap-2">
        <Plus size={16} color={colors.foreground} />
        <Text>Add</Text>
      </Button>
    </View>
  );
}

/**
 * A list, drawn by what is in it: orkestrator's `ListWidget` dispatch. A
 * search or choices are multi-selects, bare texts and numbers are chips, the
 * rest a card per item.
 */
export function ListField({ port, path, Field }: FieldProps & { Field: React.ComponentType<{ port: FormPort; path: string[] }> }) {
  const child = port.children?.filter(notEmpty)[0] as FormPort | undefined;
  if (!child) return null;
  const widget = effectiveWidget(child);
  if (widget?.__typename === 'SearchAssignWidget') return <SearchList port={port} child={child} widget={widget} path={path} />;
  if (widget?.__typename === 'ChoiceAssignWidget' || (child.kind === PortKind.Enum && (child.choices?.length ?? 0) > 0)) {
    return <ChoiceList port={port} child={child} path={path} />;
  }
  if (isTagListPort(port)) return <TagList port={port} child={child} path={path} />;
  return <ItemList child={child} path={path} Field={Field} />;
}
