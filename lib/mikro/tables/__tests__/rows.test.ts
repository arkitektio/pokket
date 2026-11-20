import {describe, expect, it} from '@jest/globals';
import {
  asDouble,
  columnsRead,
  columnStat,
  histogram,
  meets,
  pageRows,
  plainCell,
  requireColumns,
  type Row,
} from '../rows';

/**
 * orkestrator's `mikro/bloks/tableSql.test.ts`, for the phone's reads: what
 * DuckDB answers there, these answer here.
 */

const ROWS: Row[] = [
  {id: 1n, area: 12.5, label: 'Cell A', kind: 'x'},
  {id: 2n, area: 4, label: 'debris', kind: 'y'},
  {id: 3n, area: null, label: 'cell b', kind: 'x'},
  {id: 4n, area: 30, label: null, kind: 'z'},
  {id: 5n, area: 12.5, label: 'CELL c', kind: 'x'},
];

describe('a condition', () => {
  it('compares as DuckDB compares a column with a literal', () => {
    expect(meets({n: 5}, {column: 'n', op: 'gte', value: 3})).toBe(true);
    expect(meets({n: 5}, {column: 'n', value: '5'})).toBe(true);
    expect(meets({n: 5n}, {column: 'n', op: 'lt', value: 6})).toBe(true);
    expect(meets({s: 'b'}, {column: 's', op: 'gt', value: 'a'})).toBe(true);
    expect(meets({k: true}, {column: 'k', value: true})).toBe(true);
  });

  it('holds for no row whose cell is null, except isNull', () => {
    for (const op of ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'contains', 'notNull'] as const) {
      expect(meets({n: null}, {column: 'n', op, value: op === 'in' ? [null, 1] : 1})).toBe(false);
    }
    expect(meets({n: null}, {column: 'n', op: 'isNull'})).toBe(true);
    expect(meets({}, {column: 'n', op: 'isNull'})).toBe(true);
    // `= NULL` holds for nothing.
    expect(meets({n: 1}, {column: 'n', value: null})).toBe(false);
  });

  it('takes a list for in, and an empty one matches nothing', () => {
    expect(meets({n: 2}, {column: 'n', op: 'in', value: [1, 'b', 2]})).toBe(true);
    expect(meets({n: 2}, {column: 'n', op: 'in', value: []})).toBe(false);
  });

  it('matches text ignoring case for contains', () => {
    expect(meets({label: 'Big Cell'}, {column: 'label', op: 'contains', value: 'cell'})).toBe(true);
    expect(meets({n: 1234}, {column: 'n', op: 'contains', value: '23'})).toBe(true);
  });

  it('refuses an op no blok may name', () => {
    expect(() => meets({n: 1}, {column: 'n', op: 'drop' as never})).toThrow(/Unknown filter/);
  });
});

describe('a page of rows', () => {
  it('filters, sorts with nulls last, caps the limit and counts what the conditions keep', () => {
    const page = pageRows(ROWS, {
      columns: ['id', 'area'],
      where: [{column: 'label', op: 'contains', value: 'cell'}],
      orderBy: 'area',
      descending: true,
      limit: 5000,
      offset: 0,
    });
    expect(page.total).toBe(3);
    expect(page.rows).toEqual([
      {id: 1, area: 12.5},
      {id: 5, area: 12.5},
      {id: 3, area: null},
    ]);
    expect(pageRows(ROWS, {orderBy: 'area', limit: 10}).rows.map(row => row.id)).toEqual([2, 1, 5, 4, 3]);
  });

  it('pages by offset and limit, every column when none are named', () => {
    const page = pageRows(ROWS, {limit: 2, offset: 3});
    expect(page).toEqual({rows: [ROWS[3], ROWS[4]].map(row => ({...row, id: Number(row.id)})), total: 5});
    expect(pageRows(ROWS, {limit: -3}).rows).toEqual([]);
  });

  it('reads the columns it filters and sorts by, and every column when none are named', () => {
    expect(columnsRead({columns: ['id'], where: [{column: 'kind', value: 'x'}], orderBy: 'area'})).toEqual(['id', 'kind', 'area']);
    expect(columnsRead({where: [{column: 'kind', value: 'x'}]})).toBeUndefined();
  });

  it('holds plain JSON: big integers as numbers, timestamps as text', () => {
    expect(plainCell(7n)).toBe(7);
    expect(plainCell(new Date('2026-11-20T10:00:00Z'))).toBe('2026-11-20T10:00:00.000Z');
    expect(plainCell(undefined)).toBeNull();
  });
});

describe('a column', () => {
  it('names a column the table lacks as a sentence', () => {
    const table = {name: 'nuclei', columns: [{name: 'area'}]};
    expect(() => requireColumns(table, ['area', 'volume', null, 'volume'])).toThrow('The table "nuclei" has no column "volume".');
    expect(() => requireColumns(table, ['area', undefined])).not.toThrow();
  });

  it('reads its numbers as TRY_CAST AS DOUBLE does', () => {
    expect([asDouble('3.5'), asDouble(' 2 '), asDouble('x'), asDouble(''), asDouble(true), asDouble(9n), asDouble(null)]).toEqual([
      3.5, 2, null, null, 1, 9, null,
    ]);
  });

  it('counts its rows, fill and spread in one pass, distinct only when asked', () => {
    expect(columnStat([1, 2, null, 3, 3], false)).toEqual({rows: 5, nonNull: 4, min: 1, max: 3, mean: 2.25, distinct: null});
    expect(columnStat(['a', 'b', 'a', null], true)).toEqual({rows: 4, nonNull: 3, min: null, max: null, mean: null, distinct: 2});
    expect(columnStat([], true)).toEqual({rows: 0, nonNull: 0, min: null, max: null, mean: null, distinct: 0});
  });

  it('bins its numbers over their range, the maximum in the last bin', () => {
    expect(histogram([0, 1, 2, 3, 4, null, 'x'], 4)).toEqual({domain: {min: 0, max: 4}, bins: [1, 1, 1, 2]});
  });

  it('draws a constant column as one bar mid-axis, and none for a column with no numbers', () => {
    expect(histogram([5, 5, 5], 4)).toEqual({domain: {min: 5, max: 5}, bins: [0, 0, 3, 0]});
    expect(histogram(['a', null], 4)).toBeNull();
  });
});
