/**
 * What the table bloks read from a TableDataset's rows, as orkestrator's
 * `mikro/bloks/tableSql.ts` asks DuckDB for it, done in JS: the phone has no
 * DuckDB, it reads the parquet's columns (`./parquet.ts`) and filters, sorts,
 * counts and bins them here. A blok names columns and a structured filter;
 * nothing it names is ever evaluated.
 *
 * The semantics are DuckDB's: a comparison with a null holds for no row,
 * `contains` matches text ignoring case, an empty `in` matches nothing, nulls
 * sort last either way, and a number is read from a cell as
 * `TRY_CAST(x AS DOUBLE)` reads it.
 */

export const ROW_OPS = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'contains', 'isNull', 'notNull'] as const;
export type RowOp = (typeof ROW_OPS)[number];

/** One condition of a `where`; all of them must hold. */
export type RowCondition = {column: string; op?: RowOp; value?: unknown};

export type RowsRequest = {
  columns?: readonly string[];
  where?: readonly RowCondition[];
  orderBy?: string;
  descending?: boolean;
  limit: number;
  offset?: number;
};

export type Row = Record<string, unknown>;

/** Above this a page is an export, not something a blok lays out. */
export const ROWS_LIMIT_MAX = 1000;
export const ROWS_LIMIT_DEFAULT = 50;
export const HISTOGRAM_BINS = 32;

/** The page a request asks for: its limit clamped to [0, ROWS_LIMIT_MAX], its offset to >= 0. */
export const pageOf = (request: Pick<RowsRequest, 'limit' | 'offset'>): {limit: number; offset: number} => ({
  limit: Math.min(Math.max(Math.floor(request.limit), 0), ROWS_LIMIT_MAX),
  offset: Math.max(Math.floor(request.offset ?? 0), 0),
});

/**
 * A cell as a blok's record holds it: plain JSON. A 64-bit integer is a
 * number (exact up to 2^53, as a JS number is anywhere else), a timestamp its
 * ISO text, bytes their text.
 */
export const plainCell = (value: unknown): unknown => {
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (value instanceof Uint8Array) return new TextDecoder().decode(value);
  if (Array.isArray(value)) return value.map(plainCell);
  return value === undefined ? null : value;
};

export const plainRow = (row: Row): Row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, plainCell(value)]));

/** `TRY_CAST(value AS DOUBLE)`: the number a cell reads as, or null. */
export const asDouble = (value: unknown): number | null => {
  const cell = plainCell(value);
  if (typeof cell === 'number') return Number.isNaN(cell) ? null : cell;
  if (typeof cell === 'boolean') return cell ? 1 : 0;
  if (typeof cell === 'string') {
    const text = cell.trim();
    if (text === '') return null;
    const number = Number(text);
    return Number.isNaN(number) ? null : number;
  }
  return null;
};

const isNull = (value: unknown): boolean => value === null || value === undefined;

/**
 * Two non-null values compared as DuckDB compares a column with a literal: the
 * literal is read as the column's type, so `"5"` against a number column is 5.
 * Negative, zero or positive; NaN when they cannot be compared.
 */
export const compareCells = (cell: unknown, literal: unknown): number => {
  const left = plainCell(cell);
  const right = plainCell(literal);
  if (typeof left === 'number') {
    const number = asDouble(right);
    return number === null ? Number.NaN : left - number;
  }
  if (typeof left === 'boolean') {
    const value = typeof right === 'boolean' ? right : right === 'true' ? true : right === 'false' ? false : null;
    return value === null ? Number.NaN : Number(left) - Number(value);
  }
  const a = String(left);
  const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
};

/** Whether `row` meets one condition. Throws for an op no blok may name. */
export const meets = (row: Row, condition: RowCondition): boolean => {
  const cell = row[condition.column];
  const op = condition.op ?? 'eq';
  switch (op) {
    case 'isNull':
      return isNull(cell);
    case 'notNull':
      return !isNull(cell);
    case 'in': {
      if (isNull(cell)) return false;
      const values = Array.isArray(condition.value) ? condition.value : [condition.value];
      return values.some(value => !isNull(value) && compareCells(cell, value) === 0);
    }
    case 'contains':
      return !isNull(cell) && String(plainCell(cell)).toLowerCase().includes(String(condition.value ?? '').toLowerCase());
    case 'eq':
    case 'ne':
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      if (isNull(cell) || isNull(condition.value)) return false;
      const order = compareCells(cell, condition.value);
      if (Number.isNaN(order)) return false;
      if (op === 'eq') return order === 0;
      if (op === 'ne') return order !== 0;
      if (op === 'gt') return order > 0;
      if (op === 'gte') return order >= 0;
      if (op === 'lt') return order < 0;
      return order <= 0;
    }
    default:
      throw new Error(`Unknown filter operation '${String(op)}'.`);
  }
};

export const meetsAll = (row: Row, where: readonly RowCondition[] | undefined): boolean =>
  !where || where.every(condition => meets(row, condition));

/** `ORDER BY column [DESC] NULLS LAST`, stable. */
export const sortRows = (rows: Row[], column: string, descending: boolean): Row[] =>
  rows
    .map((row, index) => ({row, index}))
    .sort((a, b) => {
      const left = a.row[column];
      const right = b.row[column];
      if (isNull(left) || isNull(right)) return isNull(left) === isNull(right) ? a.index - b.index : isNull(left) ? 1 : -1;
      const order = compareCells(left, right);
      const signed = Number.isNaN(order) ? 0 : descending ? -order : order;
      return signed || a.index - b.index;
    })
    .map(({row}) => row);

/** Only `columns` of each row, in that order; every column when none are named. */
export const project = (rows: readonly Row[], columns: readonly string[] | undefined): Row[] =>
  columns && columns.length > 0
    ? rows.map(row => Object.fromEntries(columns.map(column => [column, row[column] ?? null])))
    : [...rows];

/**
 * One page of rows, filtered and sorted, and how many rows the conditions
 * keep: what `TableRows` binds (`{rows, total}`).
 */
export const pageRows = (rows: readonly Row[], request: RowsRequest): {rows: Row[]; total: number} => {
  const kept = rows.filter(row => meetsAll(row, request.where));
  const sorted = request.orderBy ? sortRows(kept, request.orderBy, request.descending === true) : kept;
  const {limit, offset} = pageOf(request);
  return {rows: project(sorted.slice(offset, offset + limit), request.columns).map(plainRow), total: kept.length};
};

/** Every column a request reads, to filter, sort and show. Undefined: every column. */
export const columnsRead = (request: Pick<RowsRequest, 'columns' | 'where' | 'orderBy'>): string[] | undefined => {
  if (!request.columns || request.columns.length === 0) return undefined;
  return [...new Set([...request.columns, ...(request.where ?? []).map(condition => condition.column), ...(request.orderBy ? [request.orderBy] : [])])];
};

/** Every name a blok hands the read is one the table declares, said as a sentence when it is not. */
export const requireColumns = (
  table: {name: string; columns: readonly {name: string}[]},
  names: readonly (string | null | undefined)[],
): void => {
  const declared = new Set(table.columns.map(column => column.name));
  const missing = [...new Set(names.filter((name): name is string => Boolean(name) && !declared.has(name as string)))];
  if (missing.length > 0) {
    throw new Error(`The table "${table.name}" has no column ${missing.map(name => `"${name}"`).join(', ')}.`);
  }
};

export type ColumnStat = {
  rows: number;
  nonNull: number;
  min: number | null;
  max: number | null;
  mean: number | null;
  distinct: number | null;
};

/** Count, fill and spread of one column in one pass; `distinct` is the costly part and opt-in. */
export const columnStat = (values: readonly unknown[], withDistinct: boolean): ColumnStat => {
  let nonNull = 0;
  let count = 0;
  let sum = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  const seen = withDistinct ? new Set<string>() : null;
  for (const value of values) {
    if (isNull(value)) continue;
    nonNull += 1;
    if (seen) {
      const cell = plainCell(value);
      seen.add(typeof cell === 'object' ? JSON.stringify(cell) : `${typeof cell}:${String(cell)}`);
    }
    const number = asDouble(value);
    if (number === null) continue;
    count += 1;
    sum += number;
    if (number < min) min = number;
    if (number > max) max = number;
  }
  return {
    rows: values.length,
    nonNull,
    min: count > 0 ? min : null,
    max: count > 0 ? max : null,
    mean: count > 0 ? sum / count : null,
    distinct: seen ? seen.size : null,
  };
};

export type Histogram = {domain: {min: number; max: number}; bins: number[]} | null;

/**
 * How the numbers of one column spread: `bins` equal-width counts from its
 * least to its greatest number, as orkestrator's `readColumnHistogram`. A value
 * at the maximum lands in the last bin; a constant column is one bar mid-axis;
 * a column with no numbers has no histogram.
 */
export const histogram = (values: readonly unknown[], binCount: number = HISTOGRAM_BINS): Histogram => {
  const numbers: number[] = [];
  for (const value of values) {
    const number = asDouble(value);
    if (number !== null && Number.isFinite(number)) numbers.push(number);
  }
  if (numbers.length === 0) return null;
  let min = numbers[0];
  let max = numbers[0];
  for (const number of numbers) {
    if (number < min) min = number;
    if (number > max) max = number;
  }
  const bins = new Array<number>(binCount).fill(0);
  const span = max - min;
  if (!(span > 0)) {
    bins[Math.floor(binCount / 2)] = numbers.length;
    return {domain: {min, max}, bins};
  }
  const width = span / binCount;
  for (const number of numbers) {
    bins[Math.min(Math.max(Math.floor((number - min) / width), 0), binCount - 1)] += 1;
  }
  return {domain: {min, max}, bins};
};
