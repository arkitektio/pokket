import { PickerRow, PickerSearch, PickerSheet } from '@/components/bank/PickerSheet';
import { Text } from '@/components/ui/text';
import { PortKind } from '@/lib/ports/kinds';
import { portLabel, portPlaceholder } from '@/lib/ports/presentation';
import { runSearch, type SearchOption } from '@/lib/ports/search';
import type { FormPort, StructureValue } from '@/lib/ports/types';
import { useWardClient } from '@/lib/ports/wards';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import type { ApolloClient } from '@apollo/client';
import * as React from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';
import { usePortField, useWidgetDependencies } from '../context';
import { PickerButton } from './ChoiceField';
import { StructureField, type FieldProps } from './Scalars';

const PAGE = 25;

/** What a picked option is in the form: a structure for a structure port, the bare value otherwise. */
export const optionValue = (port: FormPort, option: SearchOption): unknown =>
  port.kind === PortKind.Structure || port.kind === PortKind.MemoryStructure
    ? ({ __identifier: port.identifier ?? '', object: option.value } satisfies StructureValue)
    : option.value;

/** The id inside a form value, whichever of the two it is. */
export const valueId = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') {
    const object = (value as { object?: unknown }).object;
    return object === null || object === undefined ? null : String(object);
  }
  return String(value);
};

type Search = { client: ApolloClient<any>; query: string; dependencies: Record<string, unknown> };

/** The names of the chosen ids, asked for with `values`; an id nothing names shows as itself. */
export const useOptionLabels = (search: Search | null, ids: readonly string[]): Record<string, string> => {
  const [labels, setLabels] = React.useState<Record<string, string>>({});
  const idsKey = ids.join('\u0000');
  const dependenciesKey = JSON.stringify(search?.dependencies ?? {});
  const client = search?.client;
  const query = search?.query;
  React.useEffect(() => {
    const wanted = idsKey ? idsKey.split('\u0000') : [];
    if (!client || !query || wanted.length === 0) return;
    let live = true;
    runSearch(client, query, { ...JSON.parse(dependenciesKey), values: wanted, limit: wanted.length, offset: 0 }).then(
      (options) => live && setLabels((known) => ({ ...known, ...Object.fromEntries(options.map((o) => [o.value, o.label])) })),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [client, query, idsKey, dependenciesKey]);
  return labels;
};

/** The sheet's body: type to search, tap to pick. Mounted per showing, so it starts clean. */
export function SearchResults({
  search,
  isSelected,
  onPick,
  onLabel,
}: {
  search: Search;
  isSelected: (option: SearchOption) => boolean;
  onPick: (option: SearchOption) => void;
  /** Told the label of every option seen, so the field can name its value without asking again. */
  onLabel?: (option: SearchOption) => void;
}) {
  const colors = useThemeColors();
  const [term, setTerm] = React.useState('');
  const [state, setState] = React.useState<{ options: SearchOption[]; loading: boolean; error: string | null }>({
    options: [],
    loading: true,
    error: null,
  });
  const { client, query } = search;
  const dependenciesKey = JSON.stringify(search.dependencies);

  React.useEffect(() => {
    let live = true;
    const timeout = setTimeout(() => {
      runSearch(client, query, { ...JSON.parse(dependenciesKey), search: term.trim() || undefined, limit: PAGE, offset: 0 }).then(
        (options) => live && setState({ options, loading: false, error: null }),
        (e) => live && setState({ options: [], loading: false, error: e instanceof Error ? e.message : String(e) }),
      );
    }, 250);
    return () => {
      live = false;
      clearTimeout(timeout);
    };
  }, [client, query, dependenciesKey, term]);

  return (
    <>
      <PickerSearch value={term} onChangeText={setTerm} placeholder="Search" />
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" className="flex-1">
        {state.options.map((option) => (
          <PickerRow
            key={option.value}
            title={option.label}
            detail={option.description}
            selected={isSelected(option)}
            onPress={() => {
              onLabel?.(option);
              onPick(option);
            }}
          />
        ))}
        {state.loading ? <ActivityIndicator className="py-6" color={colors.primary} /> : null}
        {state.error ? <Text className="px-3 py-4 text-sm text-destructive">{state.error}</Text> : null}
        {!state.loading && !state.error && state.options.length === 0 ? (
          <Text className="px-3 py-4 text-sm text-muted-foreground">Nothing found.</Text>
        ) : null}
      </ScrollView>
    </>
  );
}

/**
 * A value picked from a search the port brings with it: a GraphQL query, run
 * on the service its `ward` names. A search that depends on other fields
 * waits for them and is asked again when they change.
 */
export function SearchField(props: FieldProps) {
  const { port, path, widget } = props;
  const client = useWardClient(widget?.ward);
  const { value, onChange } = usePortField(path);
  const { values, met, waitingFor } = useWidgetDependencies(widget?.dependencies, path);
  const [open, setOpen] = React.useState(false);
  const [seen, setSeen] = React.useState<Record<string, string>>({});

  const query: string = widget?.query ?? '';
  const search = React.useMemo(() => (client && query && met ? { client, query, dependencies: values } : null), [client, query, met, values]);
  const id = valueId(value);
  const asked = useOptionLabels(search, id ? [id] : []);

  // No client for this ward (pokket does not connect to that service): the id can still be typed.
  if (!client || !query) {
    if (port.kind === PortKind.Structure) return <StructureField {...props} />;
    return <Text className="text-sm text-muted-foreground">This app cannot search {widget?.ward || 'this service'}.</Text>;
  }

  return (
    <>
      <PickerButton
        text={id ? (seen[id] ?? asked[id] ?? id) : null}
        placeholder={met ? portPlaceholder(port, widget) || 'Search…' : `Waiting for ${waitingFor.join(', ')}`}
        disabled={!met}
        onPress={() => setOpen(true)}
      />
      <PickerSheet visible={open} title={portLabel(port)} onClose={() => setOpen(false)}>
        {port.nullable && id ? (
          <PickerRow
            title="None"
            tone="primary"
            onPress={() => {
              onChange(null);
              setOpen(false);
            }}
          />
        ) : null}
        {search ? (
          <SearchResults
            search={search}
            isSelected={(option) => option.value === id}
            onLabel={(option) => setSeen((known) => ({ ...known, [option.value]: option.label }))}
            onPick={(option) => {
              onChange(optionValue(port, option));
              setOpen(false);
            }}
          />
        ) : null}
      </PickerSheet>
    </>
  );
}
