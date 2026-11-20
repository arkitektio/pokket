// hyparquet decodes text with TextDecoder, which Hermes lacks.
import 'fast-text-encoding';
import type {ApolloClient} from '@apollo/client';
// The package's default entry is its node build (it imports `fs`); Metro takes the plain one.
import {cachedAsyncBuffer, parquetMetadataAsync, parquetReadObjects} from 'hyparquet/src/index.js';
import type {AsyncBuffer, FileMetaData} from 'hyparquet/src/index.js';
import {presignUrl} from '@/lib/datalayer/presign';
import type {DatalayerEndpoint} from '@/lib/datalayer/useDatalayer';
import {GetTableAccessDocument, type GetTableAccessQuery, type GetTableAccessQueryVariables} from '../api/graphql';
import {grantExpiresAt, signingWindow} from '../media/window';
import type {Row} from './rows';

/**
 * A TableDataset's parquet, read on the phone: orkestrator reads it through
 * DuckDB-WASM with an S3 secret per store; React Native has no DuckDB, so the
 * object is read with hyparquet (plain JS) over a presigned url, fetching the
 * byte ranges of the columns asked for. hyparquet decodes snappy (what pyarrow,
 * and so the Python client, writes by default); a table compressed otherwise
 * is said so in a sentence.
 *
 * The store's own grant is asked for (it is for this one object and
 * short-lived) and kept with the opened file until it is about to run out.
 * One opened file per store, however many bloks read it.
 */

/** A file is opened again this long before its grant runs out, so no read starts on a dying url. */
const EXPIRY_SKEW_MS = 60_000;

type Opened = {expiresAt: number; file: AsyncBuffer; metadata: Promise<FileMetaData>};

const opened = new Map<string, Promise<Opened>>();

/** A codec hyparquet cannot decode, said as a sentence. */
const describeReadError = (error: unknown): Error => {
  const message = error instanceof Error ? error.message : String(error);
  const codec = /unsupported compression codec:?\s*(\w+)/i.exec(message)?.[1];
  if (codec) return new Error(`This table is compressed with ${codec}, which the phone cannot read yet.`);
  if (/footer != PAR1|invalid/i.test(message)) return new Error('This table is not a parquet file the phone can read.');
  return error instanceof Error ? error : new Error(message);
};

/** A fetch that failed, said as a sentence: an expired or refused grant reads as one. */
const fetchFailed = (status: number): Error =>
  new Error(
    status === 403
      ? "The datalayer refused to hand out this table's file."
      : status === 404
        ? "This table's file is missing from the datalayer."
        : `The datalayer answered ${status} when the table's file was read.`,
  );

/**
 * The object at `url`, read by byte ranges. Not hyparquet's `asyncBufferFromUrl`:
 * that wants `response.body`, which React Native's fetch does not have. A
 * datalayer that ignores the range and sends the whole object is read once.
 */
export const rangedBuffer = (url: string, byteLength: number): AsyncBuffer => {
  let whole: Promise<ArrayBuffer> | null = null;
  return {
    byteLength,
    async slice(start, end) {
      if (whole) return (await whole).slice(start, end);
      const last = (end ?? byteLength) - 1;
      const response = await fetch(url, {headers: {Range: `bytes=${start}-${last}`}});
      if (response.status === 206) return response.arrayBuffer();
      if (response.status === 200) {
        whole = response.arrayBuffer();
        return (await whole).slice(start, end);
      }
      throw fetchFailed(response.status);
    },
  };
};

/** How big the object at `url` is, from a one-byte read: a presigned GET url answers no HEAD. */
const byteLengthOf = async (url: string): Promise<number> => {
  const response = await fetch(url, {headers: {Range: 'bytes=0-0'}});
  const total = /\/(\d+)$/.exec(response.headers.get('Content-Range') ?? '')?.[1];
  if (response.status === 206 && total) return Number(total);
  if (response.status === 200) {
    const length = response.headers.get('Content-Length');
    if (length) return Number(length);
  }
  throw response.ok ? new Error("The datalayer did not say how big this table's file is.") : fetchFailed(response.status);
};

const open = async (
  table: {id: string; store: {id: string; sizeBytes?: number | null}},
  client: ApolloClient<any>,
  datalayer: DatalayerEndpoint,
): Promise<Opened> => {
  const {data} = await client.query<GetTableAccessQuery, GetTableAccessQueryVariables>({
    query: GetTableAccessDocument,
    variables: {id: table.id},
    fetchPolicy: 'network-only',
  });
  const grant = data.tableDataset.store.accessGrant;
  const now = Date.now();
  const expiresAt = grantExpiresAt(grant.expiresIn, now);
  const url = presignUrl(
    {url: `${datalayer.own}/${grant.bucket}/${grant.key}`, credentials: grant, ...signingWindow(now, expiresAt)},
    datalayer.reached,
  );
  const size = table.store.sizeBytes;
  // The store says how big it is; without that, a one-byte read does.
  const file = cachedAsyncBuffer(rangedBuffer(url, typeof size === 'number' && size > 0 ? size : await byteLengthOf(url)));
  const metadata = parquetMetadataAsync(file);
  metadata.catch(() => undefined);
  return {expiresAt, file, metadata};
};

/** The opened parquet of `table`'s store, opened again once its grant is about to run out. */
const openedFile = async (
  table: {id: string; store: {id: string; sizeBytes?: number | null}},
  client: ApolloClient<any>,
  datalayer: DatalayerEndpoint,
): Promise<Opened> => {
  const key = `${datalayer.own}|${table.store.id}`;
  const current = opened.get(key);
  if (current) {
    const file = await current.catch(() => null);
    if (file && file.expiresAt - EXPIRY_SKEW_MS > Date.now()) return file;
    if (opened.get(key) === current) opened.delete(key);
  }
  const next = open(table, client, datalayer);
  opened.set(key, next);
  next.catch(() => {
    if (opened.get(key) === next) opened.delete(key);
  });
  return next;
};

export type TableReader = {
  /** How many rows the table has: read from the footer, no rows are fetched. */
  rowCount: () => Promise<number>;
  /** The rows of `columns` (every column when undefined) from `rowStart` up to `rowEnd`, as objects. */
  read: (options?: {columns?: readonly string[]; rowStart?: number; rowEnd?: number}) => Promise<Row[]>;
};

/** Reads one table's parquet. A failure is said as a sentence (`describeReadError`). */
export const tableReader = (
  table: {id: string; store: {id: string; sizeBytes?: number | null}},
  client: ApolloClient<any>,
  datalayer: DatalayerEndpoint,
): TableReader => ({
  rowCount: async () => {
    try {
      const {metadata} = await openedFile(table, client, datalayer);
      return Number((await metadata).num_rows);
    } catch (error) {
      throw describeReadError(error);
    }
  },
  read: async ({columns, rowStart, rowEnd} = {}) => {
    try {
      const {file, metadata} = await openedFile(table, client, datalayer);
      return (await parquetReadObjects({
        file,
        metadata: await metadata,
        columns: columns ? [...columns] : undefined,
        rowStart,
        rowEnd,
      })) as Row[];
    } catch (error) {
      throw describeReadError(error);
    }
  },
});

/** Forgets every opened file: for tests, and a sign-out. */
export const forgetOpenedTables = (): void => opened.clear();
