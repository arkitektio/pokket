import * as React from 'react';
import {View} from 'react-native';
import {useBlok, useBlokResource, useValue, type BlokRenderArgs} from '@arkitektio/bsx/runtime';
import {Text} from '@/components/ui/text';
import {useDatalayer} from '@/lib/datalayer/useDatalayer';
import {useGetBlokTableQuery, type BlokTableFragment} from '@/lib/mikro/api/graphql';
import {useMikroClient} from '@/lib/mikro/media/useMediaUrl';
import {tableReader, type TableReader} from '@/lib/mikro/tables/parquet';
import {
  columnsRead,
  columnStat,
  histogram,
  HISTOGRAM_BINS,
  pageOf,
  pageRows,
  plainRow,
  requireColumns,
  ROWS_LIMIT_DEFAULT,
  type Histogram,
  type RowCondition,
} from '@/lib/mikro/tables/rows';
import {cn} from '@/lib/utils';
import {asStructure, cssLength} from '../shared';
import {columnHistogramSchema, columnStatSchema, tableColumnsSchema, tableRowsSchema} from './schemas';

/**
 * The renders of the table bloks, after orkestrator's `mikro/bloks/TableParts.tsx`.
 * Each reads the table's declaration through Apollo, then its parquet with
 * hyparquet over a presigned url (`lib/mikro/tables`): orkestrator's DuckDB
 * reads, done in JS. They run behind mikro's guard (`./index.tsx`).
 *
 * The phone reads what it filters: a page with no condition and no order
 * fetches just its rows, anything else the columns it names, whole.
 */

type Table = BlokTableFragment;

/** The table a blok names, and why it could not be read. */
const useTable = (raw: unknown): {table: Table | null; error: unknown} => {
  const structure = asStructure(raw);
  const {data, error} = useGetBlokTableQuery({
    variables: {id: String(structure?.object ?? '')},
    skip: !structure,
  });
  return {table: data?.tableDataset ?? null, error: error ?? null};
};

/** The reader of the table's parquet; null until the table is known, or with no datalayer. */
const useReader = (table: Table | null): TableReader | null => {
  const client = useMikroClient();
  const datalayer = useDatalayer();
  return React.useMemo(
    () => (table && datalayer ? tableReader(table, client, datalayer) : null),
    [client, datalayer, table],
  );
};

/** Why nothing can be read yet, once the table is known: there is nowhere to read it from. */
const NO_DATALAYER = new Error('This deployment has no datalayer to read the table from.');

/* -------------------------------------------------------------------------- */

export const TableColumnsRender = ({component}: BlokRenderArgs) => {
  const blok = useBlok(component, tableColumnsSchema);
  const {table, error} = useTable(useValue(blok.value));
  const role = useValue(blok.role);
  const roles = role == null ? null : Array.isArray(role) ? role : [role];

  useBlokResource({
    bind: useValue(blok.bind),
    key: JSON.stringify([table?.id, table?.columns, roles, Boolean(error)]),
    enabled: Boolean(table || error),
    clearOnUnmount: useValue(blok.clearOnUnmount) === true,
    load: async () => {
      if (!table) throw error;
      return [...table.columns]
        .filter(column => !roles || roles.includes(column.role as (typeof roles)[number]))
        .sort((a, b) => a.order - b.order)
        .map(({name, longName, description, dtype, role: columnRole, unit, axisType}) => ({
          name,
          longName: longName ?? null,
          description: description ?? null,
          dtype,
          role: columnRole,
          unit: unit ?? null,
          axisType: axisType ?? null,
        }));
    },
  });

  return null;
};

/* -------------------------------------------------------------------------- */

/** One column's values, the whole column. */
const readColumn = async (reader: TableReader, column: string): Promise<unknown[]> =>
  (await reader.read({columns: [column]})).map(row => row[column]);

export const ColumnStatRender = ({component}: BlokRenderArgs) => {
  const blok = useBlok(component, columnStatSchema);
  const {table, error} = useTable(useValue(blok.value));
  const reader = useReader(table);
  const column = useValue(blok.column);
  const distinct = useValue(blok.distinct) === true;

  useBlokResource({
    bind: useValue(blok.bind),
    key: JSON.stringify([table?.store.id, column, distinct, Boolean(error), Boolean(reader)]),
    enabled: Boolean(column) && Boolean(error || table),
    clearOnUnmount: useValue(blok.clearOnUnmount) === true,
    isEmpty: data => (data as {rows: number}).rows === 0,
    load: async () => {
      if (!table) throw error;
      if (!reader) throw NO_DATALAYER;
      requireColumns(table, [column]);
      return columnStat(await readColumn(reader, column!), distinct);
    },
  });

  return null;
};

/* -------------------------------------------------------------------------- */

const Note = ({children, className}: {children: React.ReactNode; className?: string}) => (
  <Text className={cn('text-sm text-muted-foreground', className)}>{children}</Text>
);

const Bars = ({histogram: drawn, height, className}: {histogram: Histogram; height?: string; className?: string}) => {
  const peak = drawn ? Math.max(1, ...drawn.bins) : 1;
  return (
    <View className={cn('w-full min-w-0 gap-1', className)}>
      <View className="w-full flex-row items-end gap-px" style={{height: cssLength(height ?? '6rem') ?? 96}}>
        {drawn?.bins.map((count, index) => (
          <View
            key={index}
            accessibilityLabel={String(count)}
            className="flex-1 rounded-t-sm bg-primary/70"
            style={{height: `${(count / peak) * 100}%`, minHeight: count > 0 ? 1 : 0}}
          />
        ))}
      </View>
      {drawn ? (
        <View className="flex-row justify-between">
          <Text className="text-xs tabular-nums text-muted-foreground">{drawn.domain.min.toLocaleString()}</Text>
          <Text className="text-xs tabular-nums text-muted-foreground">{drawn.domain.max.toLocaleString()}</Text>
        </View>
      ) : null}
    </View>
  );
};

export const ColumnHistogramRender = ({component}: BlokRenderArgs) => {
  const blok = useBlok(component, columnHistogramSchema);
  const {table, error} = useTable(useValue(blok.value));
  const reader = useReader(table);
  const column = useValue(blok.column);
  const bins = Math.min(Math.max(Math.round(useValue(blok.bins) ?? HISTOGRAM_BINS), 1), 256);
  const height = useValue(blok.height);
  const className = useValue(blok.className);

  const record = useBlokResource({
    bind: useValue(blok.bind),
    key: JSON.stringify([table?.store.id, column, bins, Boolean(error), Boolean(reader)]),
    enabled: Boolean(column) && Boolean(error || table),
    clearOnUnmount: useValue(blok.clearOnUnmount) === true,
    load: async (): Promise<Histogram> => {
      if (!table) throw error;
      if (!reader) throw NO_DATALAYER;
      requireColumns(table, [column]);
      return histogram(await readColumn(reader, column!), bins);
    },
  });

  if (!column) return <Note className={className}>No column chosen.</Note>;
  if (record.failed) return <Note className={className}>{record.error}</Note>;
  if (record.ready && record.data == null) return <Note className={className}>“{column}” holds no numbers.</Note>;
  return <Bars histogram={record.data as Histogram} height={height} className={className} />;
};

/* -------------------------------------------------------------------------- */

export const TableRowsRender = ({component}: BlokRenderArgs) => {
  const blok = useBlok(component, tableRowsSchema);
  const {table, error} = useTable(useValue(blok.value));
  const reader = useReader(table);
  const columns = useValue(blok.columns) ?? undefined;
  const where = (useValue(blok.where) ?? undefined) as RowCondition[] | undefined;
  const orderBy = useValue(blok.orderBy) ?? undefined;
  const descending = useValue(blok.descending) === true;
  const limit = useValue(blok.limit) ?? ROWS_LIMIT_DEFAULT;
  const offset = useValue(blok.offset) ?? 0;
  const request = {columns, where, orderBy, descending, limit, offset};

  useBlokResource({
    bind: useValue(blok.bind),
    key: JSON.stringify([table?.store.id, request, Boolean(error), Boolean(reader)]),
    enabled: Boolean(error || table),
    clearOnUnmount: useValue(blok.clearOnUnmount) === true,
    isEmpty: data => (data as {rows: unknown[]}).rows.length === 0,
    load: async () => {
      if (!table) throw error;
      if (!reader) throw NO_DATALAYER;
      requireColumns(table, [...(columns ?? []), ...(where ?? []).map(condition => condition.column), orderBy]);
      if ((!where || where.length === 0) && !orderBy) {
        // Nothing to filter or sort by: the page's rows alone, the total from the footer.
        const page = pageOf(request);
        const [rows, total] = await Promise.all([
          page.limit > 0
            ? reader.read({columns: columns && columns.length > 0 ? columns : undefined, rowStart: page.offset, rowEnd: page.offset + page.limit})
            : Promise.resolve([]),
          reader.rowCount(),
        ]);
        return {rows: rows.map(plainRow), total};
      }
      return pageRows(await reader.read({columns: columnsRead(request)}), request);
    },
  });

  return null;
};
