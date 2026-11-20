import {afterEach, describe, expect, it, jest} from '@jest/globals';
import type {ApolloClient} from '@apollo/client';
import {readFileSync} from 'fs';
import {join} from 'path';
import {forgetOpenedTables, tableReader} from '../parquet';
import {columnStat, pageRows} from '../rows';

jest.mock('sonner-native', () => ({toast: {info: jest.fn(), error: jest.fn()}}));

/**
 * A table's parquet read as the phone reads it: the store's grant asked for,
 * the object fetched by byte ranges from a presigned url, decoded by hyparquet.
 * `nuclei.parquet` is what pyarrow writes by default (snappy), as the Python
 * client uploads a table: id int64, area float64 with a null, label string.
 * The answers have no `body`, as React Native's fetch gives none.
 */

const BYTES = readFileSync(join(__dirname, 'nuclei.parquet'));

const grant = {
  accessKey: 'AK',
  secretKey: 'SK',
  sessionToken: 'ST',
  region: 'us-east-1',
  bucket: 'parquet',
  key: 'tables/nuclei.parquet',
  expiresIn: 3600,
};

const client = (query = jest.fn(async () => ({data: {tableDataset: {id: 't1', store: {id: 'st1', accessGrant: grant}}}}))) =>
  ({query}) as unknown as ApolloClient<any> & {query: typeof query};

const DATALAYER = {own: 'http://datalayer:9000', reached: 'http://phone-route:9000'};
const TABLE = {id: 't1', store: {id: 'st1', sizeBytes: BYTES.length}};

const served = jest.fn(async (url: string, init?: {headers?: Record<string, string>}) => {
  const range = /bytes=(\d+)-(\d+)/.exec(init?.headers?.Range ?? '');
  const [start, end] = range ? [Number(range[1]), Number(range[2]) + 1] : [0, BYTES.length];
  const body = BYTES.subarray(start, end);
  return {
    ok: true,
    status: range ? 206 : 200,
    headers: new Map([
      ['Content-Length', String(body.length)],
      ['Content-Range', `bytes ${start}-${end - 1}/${BYTES.length}`],
    ]),
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  };
});

afterEach(() => {
  forgetOpenedTables();
  served.mockClear();
});

describe("a table's parquet", () => {
  it('is read from a presigned url on the route the phone reaches, by its columns', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = served as unknown as typeof fetch;
    try {
      const mikro = client();
      const reader = tableReader(TABLE, mikro, DATALAYER);
      expect(await reader.rowCount()).toBe(4);
      const rows = await reader.read({columns: ['area', 'label']});
      expect(rows).toEqual([
        {area: 10, label: 'a'},
        {area: 2.5, label: 'b'},
        {area: null, label: 'c'},
        {area: 40, label: 'd'},
      ]);
      expect(await reader.read({columns: ['id'], rowStart: 1, rowEnd: 3})).toEqual([{id: 2n}, {id: 3n}]);
      // One grant for every read while it lasts, and the url signed for the store, fetched where the phone reaches it.
      expect(mikro.query).toHaveBeenCalledTimes(1);
      const url = String(served.mock.calls[0][0]);
      expect(url).toMatch(/^http:\/\/phone-route:9000\/parquet\/tables\/nuclei\.parquet\?/);
      expect(url).toMatch(/X-Amz-Signature=/);

      expect(pageRows(await reader.read(), {orderBy: 'area', descending: true, limit: 2})).toEqual({
        rows: [
          {id: 4, area: 40, label: 'd'},
          {id: 1, area: 10, label: 'a'},
        ],
        total: 4,
      });
      expect(columnStat((await reader.read({columns: ['area']})).map(row => row.area), true)).toEqual({
        rows: 4,
        nonNull: 3,
        min: 2.5,
        max: 40,
        mean: 52.5 / 3,
        distinct: 3,
      });
    } finally {
      globalThis.fetch = original;
    }
  });

  it('asks how big the object is when the store does not say', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = served as unknown as typeof fetch;
    try {
      const reader = tableReader({id: 't1', store: {id: 'st1', sizeBytes: null}}, client(), DATALAYER);
      expect(await reader.rowCount()).toBe(4);
      expect(served.mock.calls[0][1]).toEqual({headers: {Range: 'bytes=0-0'}});
    } finally {
      globalThis.fetch = original;
    }
  });

  it('says what it cannot read as a sentence', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true,
      status: 206,
      headers: new Map([['Content-Length', '16']]),
      arrayBuffer: async () => new ArrayBuffer(16),
    })) as unknown as typeof fetch;
    try {
      const reader = tableReader({id: 't1', store: {id: 'st1', sizeBytes: 16}}, client(), DATALAYER);
      await expect(reader.rowCount()).rejects.toThrow('This table is not a parquet file the phone can read.');
      forgetOpenedTables();
      globalThis.fetch = (async () => ({ok: false, status: 403, headers: new Map(), arrayBuffer: async () => new ArrayBuffer(0)})) as unknown as typeof fetch;
      await expect(tableReader(TABLE, client(), DATALAYER).rowCount()).rejects.toThrow("The datalayer refused to hand out this table's file.");
    } finally {
      globalThis.fetch = original;
    }
  });
});
