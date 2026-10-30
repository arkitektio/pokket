import { PickerRow, PickerSearch, PickerSheet } from '@/components/bank/PickerSheet';
import { Text } from '@/components/ui/text';
import type { DescriptorConstraint, StructureOption } from '@/lib/structures/options';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { cn } from '@/lib/utils';
import { AlertCircle, ChevronDown, X } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';

export const PICKER_PAGE_SIZE = 25;

/** One page of candidates, or the objects behind these ids. */
export type PickerRequest = {
  search?: string;
  /** Resolve exactly these, whatever narrows the list: a value already chosen is shown as it is. */
  ids?: string[];
  limit: number;
  offset: number;
};

/** A narrowing the list is under that the user may lift: "Narrowed by ‹a path›". */
export type PickerScope = { label: string; active: boolean; onToggle: () => void };

/** The chosen object in the closed field, resolved by id; the id itself while unknown. */
const Chosen = ({ id, load }: { id: string; load: (request: PickerRequest) => Promise<StructureOption[]> }) => {
  const [label, setLabel] = React.useState<string | null>(null);
  // The latest `load`, without asking again each time the caller rebuilds it.
  const loadRef = React.useRef(load);
  React.useEffect(() => {
    loadRef.current = load;
  });
  React.useEffect(() => {
    let live = true;
    loadRef.current({ ids: [id], limit: 1, offset: 0 }).then(
      (found) => live && setLabel(found[0]?.label ?? null),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [id]);
  return (
    <Text numberOfLines={1} className={cn('shrink text-base text-foreground', label === null && 'font-mono text-sm text-muted-foreground')}>
      {label ?? id}
    </Text>
  );
};

/** A constraint as a chip: `key operator value`. */
const constraintText = ({ key, operator, value }: DescriptorConstraint): string =>
  [key, operator.toLowerCase().replace(/_/g, ' '), value === undefined ? '' : JSON.stringify(value)].filter(Boolean).join(' ');

/**
 * A searchable, paged list of one kind of object to pick one from
 * (orkestrator's `StructurePickerControl`), as a field that opens a sheet.
 *
 * Controlled, and bound to no form and no module: the caller supplies the
 * query (`load`). This holds what every such picker shares: the debounced
 * search, loading when first opened, paging at the end of the list, and the
 * narrowings shown as chips (what the input requires, fixed; a scope, which
 * the user may lift) so an empty list explains itself.
 */
export function StructurePickerControl({
  value,
  onChange,
  noun,
  load,
  requires,
  scope,
  paged = true,
  placeholder,
  disabled,
  className,
}: {
  /** The id of the chosen object, if any. */
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  /** What one of these is called in the placeholder and the empty state: "lens". */
  noun: string;
  load: (request: PickerRequest) => Promise<StructureOption[]>;
  /** What the list is fixed to, shown so an empty list explains itself. */
  requires?: readonly DescriptorConstraint[];
  scope?: PickerScope;
  /** Whether `load` honours `limit` and `offset`. A source that always answers everything is asked once. */
  paged?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const colors = useThemeColors();
  const [open, setOpen] = React.useState(false);
  const [term, setTerm] = React.useState('');
  const [items, setItems] = React.useState<StructureOption[]>([]);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Paging bookkeeping lives in refs so a stale answer can never append a
  // page that belongs to a previous search term.
  const requestRef = React.useRef(0);
  const offsetRef = React.useRef(0);

  const fetchPage = React.useCallback(
    (search: string, offset: number) => {
      const requestId = ++requestRef.current;
      setLoading(true);
      load({ search: search || undefined, limit: PICKER_PAGE_SIZE, offset }).then(
        (page) => {
          if (requestRef.current !== requestId) return;
          offsetRef.current = offset + page.length;
          setItems((previous) => (offset > 0 ? [...previous, ...page] : page));
          setHasMore(paged && page.length === PICKER_PAGE_SIZE);
          setError(null);
          setLoading(false);
          setLoaded(true);
        },
        (failure: unknown) => {
          if (requestRef.current !== requestId) return;
          setError(failure instanceof Error ? failure.message : String(failure));
          if (offset === 0) setItems([]);
          setHasMore(false);
          setLoading(false);
          setLoaded(true);
        },
      );
    },
    [load, paged],
  );

  // Loaded when first opened, not when mounted: a form with five structure
  // inputs should not run five queries nobody looks at. Asked again as the
  // user types, and when what narrows the list changes (`load`).
  React.useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => fetchPage(term.trim(), 0), term ? 250 : 0);
    return () => clearTimeout(timeout);
  }, [open, term, fetchPage]);

  const choose = (id: string | undefined) => {
    onChange(id);
    setTerm('');
    setOpen(false);
  };

  const constrained = Boolean(requires?.length);
  const scoped = Boolean(scope?.active);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={cn(
          'flex-row items-center justify-between gap-2 rounded-xl border border-border bg-background px-4 py-3 active:bg-muted',
          disabled && 'opacity-50',
          className,
        )}
      >
        {value !== undefined ? (
          <Chosen key={value} id={value} load={load} />
        ) : (
          <Text numberOfLines={1} className="shrink text-base text-muted-foreground">
            {placeholder ?? `Pick a ${noun}…`}
          </Text>
        )}
        {value !== undefined && !disabled ? (
          <Pressable accessibilityLabel="Clear" hitSlop={8} onPress={() => choose(undefined)}>
            <X size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : (
          <ChevronDown size={18} color={colors.mutedForeground} />
        )}
      </Pressable>
      <PickerSheet visible={open} title={`Pick a ${noun}`} busy={loading} onClose={() => setOpen(false)}>
        <PickerSearch value={term} onChangeText={setTerm} placeholder={`Search ${noun}…`} />
        {constrained || scope ? (
          <View className="mb-2 flex-row flex-wrap items-center gap-1.5 px-1">
            {constrained ? <Text className="text-xs text-muted-foreground">Only</Text> : null}
            {(requires ?? []).map((constraint) => (
              <View key={constraintText(constraint)} className="rounded-full bg-secondary px-2 py-0.5">
                <Text className="text-xs text-secondary-foreground">{constraintText(constraint)}</Text>
              </View>
            ))}
            {scope ? (
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: scope.active }}
                onPress={scope.onToggle}
                className={cn('rounded-full border px-2 py-0.5', scope.active ? 'border-secondary bg-secondary' : 'border-border opacity-70')}
              >
                <Text className={cn('text-xs text-foreground', !scope.active && 'line-through')}>{scope.label}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {error ? (
          <View className="mb-2 flex-row items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2">
            <AlertCircle size={14} color={colors.destructive} />
            <Text className="flex-1 text-xs text-destructive">{error}</Text>
          </View>
        ) : null}
        <FlatList
          data={items}
          keyExtractor={(item) => item.value}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (hasMore && !loading) fetchPage(term.trim(), offsetRef.current);
          }}
          renderItem={({ item }) => (
            <PickerRow
              title={item.label}
              detail={item.description}
              selected={item.value === value}
              onPress={() => choose(item.value === value ? undefined : item.value)}
            />
          )}
          ListEmptyComponent={
            loaded && !error && !loading ? (
              <View className="items-center gap-2 px-3 py-6">
                <Text className="text-center text-sm text-muted-foreground">
                  {scoped && scope
                    ? `No ${noun} here is ${scope.label.charAt(0).toLowerCase()}${scope.label.slice(1)}.`
                    : constrained
                      ? `No ${noun} meets what this input requires${term ? ` and matches “${term}”` : ''}.`
                      : `No ${noun} found.`}
                </Text>
                {scoped && scope ? (
                  <Pressable accessibilityRole="button" onPress={scope.onToggle}>
                    <Text className="text-sm text-primary underline">Show all</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null
          }
          ListFooterComponent={hasMore && loading ? <ActivityIndicator className="py-3" color={colors.primary} /> : null}
        />
      </PickerSheet>
    </>
  );
}
