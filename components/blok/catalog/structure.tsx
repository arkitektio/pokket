import * as React from 'react';
import {View} from 'react-native';
import {
  useBlok,
  useBlokPort,
  useDataPaths,
  useEventAction,
  useValue,
  type BlokRender,
} from '@arkitektio/bsx/runtime';
import {StructureDisplay} from '@/components/structures/StructureDisplay';
import {StructurePickerControl, type PickerRequest} from '@/components/structures/StructurePickerControl';
import {StructureViewer} from '@/components/structures/StructureViewer';
import {Text} from '@/components/ui/text';
import {declaredVariables, requiredVariables} from '@/lib/ports/search';
import {useOptionSourceHonoursRequires, useServiceQuery, useStructureOptions} from '@/lib/structures/hooks';
import type {StructureOption} from '@/lib/structures/options';
import {cn} from '@/lib/utils';
import {
  asStructure,
  cssLength,
  useBlokDataSet,
  useControlledValue,
  type StructureValue,
} from './shared';
import type {structureCatalog} from '@arkitektio/bsx/catalogs';

type Structure = typeof structureCatalog.components;

/**
 * structure@1, after orkestrator's `bloks/structure/Structure.tsx`: bloks over
 * other services' objects, by structure identifier.
 *
 * None of them imports a service's UI: the picker asks the source that lists
 * the structure (`lib/structures/options`) or runs the author's own query on
 * the service it names, the display and the viewer draw what the phone has
 * for it (`components/structures`). What the phone cannot show degrades to a
 * notice.
 */

const Notice = ({children, className}: {children: React.ReactNode; className?: string}) => (
  <View
    className={cn(
      'min-h-10 w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3',
      className,
    )}
  >
    <Text className="text-center text-sm text-muted-foreground">{children}</Text>
  </View>
);

/**
 * The variables a picker's query is handed by the picker itself: what the
 * user typed, the ids to resolve, a page, and what the port being filled
 * requires. Every other variable is the author's and is read from the data.
 */
const RESERVED_VARIABLES = new Set(['search', 'values', 'limit', 'offset', 'requires']);

/**
 * A value as a query variable. A structure is held as `{__identifier, object}`
 * and known to its service by its id, so the id is what the query gets (a
 * list of structures, their ids); anything else goes as it is.
 */
const asVariable = (raw: unknown): unknown => {
  if (Array.isArray(raw)) return raw.map(asVariable);
  return asStructure(raw)?.object ?? raw ?? null;
};

const asOptions = (raw: unknown): StructureOption[] =>
  (Array.isArray(raw) ? raw : []).flatMap(entry => {
    if (!entry || typeof entry !== 'object') return [];
    const {value, label, description} = entry as Record<string, unknown>;
    if (value == null) return [];
    return [
      {
        value: String(value),
        label: typeof label === 'string' && label ? label : String(value),
        description: typeof description === 'string' && description ? description : undefined,
      },
    ];
  });

export const StructurePickerRender: BlokRender<Structure['StructurePicker']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  const port = useBlokPort();
  const identifier = useValue(blok.identifier) ?? port?.identifier;
  const bind = useValue(blok.bind);
  const value = useValue(blok.value);
  const query = useValue(blok.query);
  const ward = useValue(blok.ward);
  const explicit = useValue(blok.variables);
  const placeholder = useValue(blok.placeholder);
  const disabled = useValue(blok.disabled);
  const className = useValue(blok.className);
  const onChange = useEventAction(blok.onChange);
  const dataSet = useBlokDataSet();

  const source = useStructureOptions(identifier ?? '');
  const sourceHonoursRequires = useOptionSourceHonoursRequires(identifier ?? '');
  const run = useServiceQuery(ward);
  const controlled = useControlledValue<StructureValue | null>({
    bind,
    // `undefined` leaves the control to its binding; `null` is a held value.
    value: value === undefined ? undefined : asStructure(value),
    defaultValue: undefined,
    fallback: null,
    parse: asStructure,
  });

  const declared = React.useMemo(() => (query ? Object.keys(declaredVariables(query)) : []), [query]);
  const free = React.useMemo(() => declared.filter(name => !RESERVED_VARIABLES.has(name)), [declared]);
  const read = useDataPaths(free);
  // Keyed by content: the port, the variables and what the paths hold are
  // rebuilt objects on most renders, and the query must only be asked again
  // when what they say changes.
  const boundKey = JSON.stringify(
    free.map(name => asVariable(explicit && name in explicit ? explicit[name] : read.get(name))),
  );
  const requiresKey = JSON.stringify(port?.requires ?? []);
  // A variable declared non-null is one the query cannot be asked without:
  // the picker waits for it, and it is never lifted. A nullable one narrows
  // the list while it has a value, and the user may lift that.
  const required = React.useMemo(() => new Set(query ? requiredVariables(query) : []), [query]);
  const waitingFor = React.useMemo(
    () => free.filter((name, index) => required.has(name) && (JSON.parse(boundKey) as unknown[])[index] == null),
    [free, required, boundKey],
  );
  const narrowedBy = React.useMemo(
    () => free.filter((name, index) => !required.has(name) && (JSON.parse(boundKey) as unknown[])[index] != null),
    [free, required, boundKey],
  );

  // What the author's variables narrow the list to is on for every new set
  // of values; lifting it lasts until one of them changes.
  const [liftedFor, setLiftedFor] = React.useState<string | undefined>(undefined);
  const narrowed = narrowedBy.length > 0 && liftedFor !== boundKey;

  const queried = Boolean(query && ward);
  const load = React.useCallback(
    async (request: PickerRequest): Promise<StructureOption[]> => {
      if (!queried || !query) {
        if (!source) return [];
        // A held value is resolved by its id alone, as below.
        return source(request.ids ? {values: request.ids} : {search: request.search, requires: JSON.parse(requiresKey)});
      }
      const bound = JSON.parse(boundKey) as unknown[];
      // A held value is resolved by its id alone, so it shows even when it
      // no longer meets what narrows the list.
      const listing = !request.ids;
      const supplied: Record<string, unknown> = {
        search: listing ? request.search : undefined,
        values: request.ids,
        limit: request.limit,
        offset: request.offset,
        requires: listing ? JSON.parse(requiresKey) : undefined,
      };
      const variables: Record<string, unknown> = {};
      declared.forEach(name => {
        if (RESERVED_VARIABLES.has(name)) {
          if (supplied[name] !== undefined) variables[name] = supplied[name];
        } else {
          const held = bound[free.indexOf(name)];
          variables[name] = required.has(name) || (listing && narrowed) ? held : null;
        }
      });
      const data = await run(query, variables);
      return asOptions(data.options);
    },
    [queried, source, run, query, declared, free, required, boundKey, requiresKey, narrowed],
  );

  if (!identifier || (!queried && !source)) {
    return <Notice className={className}>No picker available for {identifier ?? 'this structure'}.</Notice>;
  }

  if (waitingFor.length > 0) {
    return <Notice className={className}>Waiting for: {waitingFor.join(', ')}</Notice>;
  }

  return (
    <View {...dataSet}>
      <StructurePickerControl
        value={controlled.value ? String(controlled.value.object) : undefined}
        onChange={id => {
          // `null`, never `undefined`: an argument reading this path must see
          // "nothing selected", not fall back to its literal.
          const next = id ? {object: id, __identifier: identifier} : null;
          controlled.setValue(next);
          onChange?.(next);
        }}
        noun={identifier.split('/').pop() || 'option'}
        load={load}
        requires={(queried ? declared.includes('requires') : sourceHonoursRequires) ? port?.requires : undefined}
        scope={
          narrowedBy.length > 0
            ? {
                label: `Narrowed by ${narrowedBy.join(', ')}`,
                active: narrowed,
                onToggle: () => setLiftedFor(narrowed ? boundKey : undefined),
              }
            : undefined
        }
        paged={queried && declared.includes('limit') && declared.includes('offset')}
        placeholder={placeholder}
        disabled={disabled === true}
        className={className}
      />
    </View>
  );
};

export const StructureDisplayRender: BlokRender<Structure['StructureDisplay']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  const structure = asStructure(useValue(blok.value));
  const variant = useValue(blok.variant);
  const link = useValue(blok.link);
  const emptyText = useValue(blok.emptyText);
  const className = useValue(blok.className);

  if (!structure) {
    return <Notice className={className}>{emptyText ?? 'Nothing selected.'}</Notice>;
  }

  return (
    <StructureDisplay
      identifier={structure.__identifier}
      id={structure.object}
      variant={variant ?? 'card'}
      link={link === true}
      className={className}
    />
  );
};

export const StructureViewerRender: BlokRender<Structure['StructureViewer']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  const structure = asStructure(useValue(blok.value));
  const height = useValue(blok.height);
  const minHeight = useValue(blok.minHeight);
  const emptyText = useValue(blok.emptyText);
  const className = useValue(blok.className);

  // A viewer fills its box, and nothing above a blok has a height to fill.
  // `controls` is read and has nothing to switch: the phone's viewers have none.
  return (
    <View
      className={cn('relative w-full overflow-hidden rounded-xl', className)}
      style={{height: cssLength(height ?? '24rem'), minHeight: cssLength(minHeight)}}
    >
      {structure ? (
        <StructureViewer
          identifier={structure.__identifier}
          id={structure.object}
          fallback={<Notice className="h-full">No viewer available for {structure.__identifier}.</Notice>}
        />
      ) : (
        <Notice className="h-full">{emptyText ?? 'Nothing to show yet.'}</Notice>
      )}
    </View>
  );
};
