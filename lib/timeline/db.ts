import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import { DEFAULT_SEGMENT_OPTIONS, Fix, haversine, segment, SegmentOptions, TripMode } from "./segment";

/**
 * The timeline's store: one SQLCipher database on this device, its key in
 * the keychain / keystore. Readable after the first unlock since boot, so
 * the background task can still write while the phone is locked.
 *
 * Nothing here needs React, providers or the network — the background task
 * uses it from a headless start.
 *
 * Every row carries `updated_at` / `synced_at`, so a later sync to a
 * self-hosted service can pick up what it has not sent without a migration.
 * Visits and trips are keyed by their start, which recomputation keeps.
 */

const DB_NAME = "timeline.db";
const KEY_NAME = "pokket.timeline.dbkey";

export type PointRow = { id: string; ts: number; lat: number; lon: number; acc: number | null; speed: number | null };
export type VisitRow = {
  id: string;
  start_ts: number;
  end_ts: number;
  lat: number;
  lon: number;
  radius: number;
  point_count: number;
  place_id: string | null;
};
export type TripRow = {
  id: string;
  start_ts: number;
  end_ts: number;
  from_visit: string | null;
  to_visit: string | null;
  distance_m: number;
  mode: TripMode;
};
export type PlaceRow = { id: string; name: string; lat: number; lon: number; radius: number };

const MIGRATIONS: string[] = [
  `
  CREATE TABLE points (
    id TEXT PRIMARY KEY NOT NULL,
    ts INTEGER NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    acc REAL,
    speed REAL,
    heading REAL,
    alt REAL,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER
  );
  CREATE INDEX points_ts ON points (ts);
  CREATE TABLE visits (
    id TEXT PRIMARY KEY NOT NULL,
    start_ts INTEGER NOT NULL,
    end_ts INTEGER NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    radius REAL NOT NULL,
    point_count INTEGER NOT NULL,
    place_id TEXT,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER
  );
  CREATE INDEX visits_start ON visits (start_ts);
  CREATE TABLE trips (
    id TEXT PRIMARY KEY NOT NULL,
    start_ts INTEGER NOT NULL,
    end_ts INTEGER NOT NULL,
    from_visit TEXT,
    to_visit TEXT,
    distance_m REAL NOT NULL,
    mode TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER
  );
  CREATE INDEX trips_start ON trips (start_ts);
  CREATE TABLE places (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    radius REAL NOT NULL,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER
  );
  CREATE TABLE meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  `,
  // Tombstones, so a deletion can reach the backup.
  `
  CREATE TABLE deletions (
    client_id TEXT PRIMARY KEY NOT NULL,
    kind TEXT NOT NULL,
    deleted_at INTEGER NOT NULL,
    synced_at INTEGER
  );
  `,
];

const databaseKey = async (): Promise<string> => {
  const options = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
  const existing = await SecureStore.getItemAsync(KEY_NAME, options);
  if (existing) return existing;
  const bytes = await Crypto.getRandomBytesAsync(32);
  const key = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  await SecureStore.setItemAsync(KEY_NAME, key, options);
  return key;
};

let queue: Promise<unknown> = Promise.resolve();

/**
 * A transaction on the one keyed connection. Not `withExclusiveTransactionAsync`:
 * that opens a second connection, which never gets `PRAGMA key` and so cannot
 * read the encrypted file. Transactions are queued, so the background task and
 * the app never interleave statements inside one.
 */
const transaction = (db: SQLite.SQLiteDatabase, task: (txn: SQLite.SQLiteDatabase) => Promise<void>): Promise<void> => {
  const run = async () => {
    await db.execAsync("BEGIN IMMEDIATE");
    try {
      await task(db);
      await db.execAsync("COMMIT");
    } catch (error) {
      await db.execAsync("ROLLBACK").catch(() => undefined);
      throw error;
    }
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
};

const migrate = async (db: SQLite.SQLiteDatabase) => {
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    const next = version + 1;
    await transaction(db, async (txn) => {
      await txn.execAsync(sql);
      await txn.execAsync(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }
};

const open = async () => {
  const key = await databaseKey();
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  // Must come first. The key is hex from our own RNG, so it is safe to inline.
  await db.execAsync(`PRAGMA key = "x'${key}'"`);
  await db.execAsync("PRAGMA journal_mode = WAL");
  await migrate(db);
  return db;
};

let database: Promise<SQLite.SQLiteDatabase> | null = null;

export const timelineDb = () => {
  database ??= open().catch((error) => {
    database = null;
    throw error;
  });
  return database;
};

const getMeta = async (db: SQLite.SQLiteDatabase, key: string) =>
  (await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = ?", key))?.value ?? null;

const setMeta = (db: Pick<SQLite.SQLiteDatabase, "runAsync">, key: string, value: string) =>
  db.runAsync("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", key, value);

/**
 * The earliest start from which visits and trips changed since the last
 * backup; "none" when nothing did. Missing means never backed up: everything.
 */
const SEGMENTS_DIRTY = "segments_dirty_from";
/** Bumped on every change to visits or trips, so a backup can tell whether it missed one. */
const SEGMENTS_VERSION = "segments_version";

type MetaDb = Pick<SQLite.SQLiteDatabase, "runAsync" | "getFirstAsync">;

const readMeta = async (db: MetaDb, key: string) =>
  (await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = ?", key))?.value ?? null;

const markSegmentsDirty = async (db: MetaDb, from: number) => {
  const version = Number((await readMeta(db, SEGMENTS_VERSION)) ?? 0);
  await setMeta(db, SEGMENTS_VERSION, String(version + 1));
  const current = await readMeta(db, SEGMENTS_DIRTY);
  if (current === null) return; // never backed up: everything is due anyway
  await setMeta(db, SEGMENTS_DIRTY, String(current === "none" ? from : Math.min(Number(current), from)));
};

export type NewFix = Fix & { speed?: number | null; heading?: number | null; alt?: number | null };

export const insertFixes = async (fixes: readonly NewFix[]) => {
  if (fixes.length === 0) return;
  const db = await timelineDb();
  const now = Date.now();
  await transaction(db, async (txn) => {
    for (const f of fixes) {
      await txn.runAsync(
        "INSERT INTO points (id, ts, lat, lon, acc, speed, heading, alt, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        Crypto.randomUUID(),
        f.ts,
        f.lat,
        f.lon,
        f.acc ?? null,
        f.speed ?? null,
        f.heading ?? null,
        f.alt ?? null,
        now,
      );
    }
  });
};

const nearestPlace = (places: readonly PlaceRow[], at: { lat: number; lon: number }) => {
  let best: PlaceRow | null = null;
  let bestDistance = Infinity;
  for (const place of places) {
    const d = haversine(place, at);
    if (d <= place.radius && d < bestDistance) {
      best = place;
      bestDistance = d;
    }
  }
  return best;
};

/**
 * Turns the fixes recorded since the last run into visits and trips. Starts
 * again from the last visit found, since that one (and whatever came after
 * it) may still be growing.
 */
export const updateSegments = async (options: SegmentOptions = DEFAULT_SEGMENT_OPTIONS, now = Date.now()) => {
  const db = await timelineDb();
  const from = Number((await getMeta(db, "segmented_from")) ?? 0);
  const fixes = await db.getAllAsync<Fix>("SELECT ts, lat, lon, acc FROM points WHERE ts >= ? ORDER BY ts", from);
  if (fixes.length === 0) return;
  const { visits, trips } = segment(fixes, options, now);
  const places = await db.getAllAsync<PlaceRow>("SELECT id, name, lat, lon, radius FROM places");
  const visitId = (i: number | null) => (i === null ? null : `v${visits[i].start}`);
  const stamp = Date.now();

  await transaction(db, async (txn) => {
    await txn.runAsync("DELETE FROM visits WHERE start_ts >= ?", from);
    await txn.runAsync("DELETE FROM trips WHERE start_ts >= ?", from);
    for (const [i, v] of visits.entries()) {
      await txn.runAsync(
        "INSERT OR REPLACE INTO visits (id, start_ts, end_ts, lat, lon, radius, point_count, place_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        visitId(i),
        v.start,
        v.end,
        v.lat,
        v.lon,
        v.radius,
        v.count,
        nearestPlace(places, v)?.id ?? null,
        stamp,
      );
    }
    for (const t of trips) {
      await txn.runAsync(
        "INSERT OR REPLACE INTO trips (id, start_ts, end_ts, from_visit, to_visit, distance_m, mode, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        `t${t.start}`,
        t.start,
        t.end,
        visitId(t.from),
        visitId(t.to),
        t.distance,
        t.mode,
        stamp,
      );
    }
    if (visits.length > 0) await setMeta(txn, "segmented_from", String(visits[visits.length - 1].start));
    await markSegmentsDirty(txn, from);
  });
};

/**
 * Recomputes visits and trips from every fix still kept, for when the
 * segmentation settings changed. Visits from before the oldest kept fix
 * (retention deleted their fixes) stay as they were.
 */
export const resegment = async (options: SegmentOptions) => {
  const db = await timelineDb();
  const oldest = await db.getFirstAsync<{ first: number | null }>("SELECT MIN(ts) AS first FROM points");
  if (oldest?.first == null) return;
  await setMeta(db, "segmented_from", String(oldest.first));
  await updateSegments(options);
};

/** Everything that touches [from, to). */
export const loadRange = async (from: number, to: number) => {
  const db = await timelineDb();
  const [points, visits, trips, places] = await Promise.all([
    db.getAllAsync<PointRow>("SELECT id, ts, lat, lon, acc, speed FROM points WHERE ts >= ? AND ts < ? ORDER BY ts", from, to),
    db.getAllAsync<VisitRow>(
      "SELECT id, start_ts, end_ts, lat, lon, radius, point_count, place_id FROM visits WHERE end_ts >= ? AND start_ts < ? ORDER BY start_ts",
      from,
      to,
    ),
    db.getAllAsync<TripRow>(
      "SELECT id, start_ts, end_ts, from_visit, to_visit, distance_m, mode FROM trips WHERE end_ts >= ? AND start_ts < ? ORDER BY start_ts",
      from,
      to,
    ),
    db.getAllAsync<PlaceRow>("SELECT id, name, lat, lon, radius FROM places"),
  ]);
  return { points, visits, trips, places };
};

export const loadPlace = async (id: string) => {
  const db = await timelineDb();
  const place = await db.getFirstAsync<PlaceRow>("SELECT id, name, lat, lon, radius FROM places WHERE id = ?", id);
  const visits = await db.getAllAsync<VisitRow>(
    "SELECT id, start_ts, end_ts, lat, lon, radius, point_count, place_id FROM visits WHERE place_id = ? ORDER BY start_ts DESC LIMIT 200",
    id,
  );
  return { place, visits };
};

/** Tags every visit within `radius` of the place with it. */
const tagVisits = async (db: SQLite.SQLiteDatabase, place: PlaceRow) => {
  const visits = await db.getAllAsync<{ id: string; lat: number; lon: number }>("SELECT id, lat, lon FROM visits");
  const inside = visits.filter((v) => haversine(place, v) <= place.radius);
  const now = Date.now();
  for (const v of inside) await db.runAsync("UPDATE visits SET place_id = ?, updated_at = ? WHERE id = ?", place.id, now, v.id);
  const first = await db.getFirstAsync<{ start: number | null }>(
    "SELECT MIN(start_ts) AS start FROM visits WHERE place_id = ?",
    place.id,
  );
  if (first?.start != null) await markSegmentsDirty(db, first.start);
};

export const createPlace = async (name: string, at: { lat: number; lon: number }, radius = 150) => {
  const db = await timelineDb();
  const place: PlaceRow = { id: Crypto.randomUUID(), name, lat: at.lat, lon: at.lon, radius };
  await db.runAsync(
    "INSERT INTO places (id, name, lat, lon, radius, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    place.id,
    place.name,
    place.lat,
    place.lon,
    place.radius,
    Date.now(),
  );
  await tagVisits(db, place);
  return place;
};

export const renamePlace = async (id: string, name: string) => {
  const db = await timelineDb();
  await db.runAsync("UPDATE places SET name = ?, updated_at = ? WHERE id = ?", name, Date.now(), id);
};

export const deletePlace = async (id: string) => {
  const db = await timelineDb();
  await transaction(db, async (txn) => {
    const now = Date.now();
    const first = await txn.getFirstAsync<{ start: number | null }>(
      "SELECT MIN(start_ts) AS start FROM visits WHERE place_id = ?",
      id,
    );
    await txn.runAsync("UPDATE visits SET place_id = NULL, updated_at = ? WHERE place_id = ?", now, id);
    await txn.runAsync("DELETE FROM places WHERE id = ?", id);
    await txn.runAsync(
      "INSERT OR REPLACE INTO deletions (client_id, kind, deleted_at, synced_at) VALUES (?, 'place', ?, NULL)",
      id,
      now,
    );
    if (first?.start != null) await markSegmentsDirty(txn, first.start);
  });
};

/**
 * Deletes raw fixes older than `days`; visits and trips stay. With
 * `keepUnsynced`, fixes not yet backed up are kept whatever their age.
 */
export const pruneFixes = async (days: number, { keepUnsynced = false }: { keepUnsynced?: boolean } = {}) => {
  if (days <= 0) return;
  const db = await timelineDb();
  const before = Date.now() - days * 24 * 60 * 60 * 1000;
  const segmentedFrom = Number((await getMeta(db, "segmented_from")) ?? 0);
  // Never what the next segmentation still has to read.
  await db.runAsync(
    `DELETE FROM points WHERE ts < ?${keepUnsynced ? " AND synced_at IS NOT NULL" : ""}`,
    Math.min(before, segmentedFrom),
  );
};

export const timelineStats = async () => {
  const db = await timelineDb();
  const row = await db.getFirstAsync<{ n: number; first: number | null }>("SELECT COUNT(*) AS n, MIN(ts) AS first FROM points");
  const visits = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM visits");
  return { points: row?.n ?? 0, since: row?.first ?? null, visits: visits?.n ?? 0 };
};

export const deleteEverything = async () => {
  const db = await timelineDb();
  await transaction(db, async (txn) => {
    for (const table of ["points", "visits", "trips", "places", "deletions", "meta"]) await txn.execAsync(`DELETE FROM ${table}`);
  });
  await db.execAsync("VACUUM");
};

export const allForExport = async () => {
  const db = await timelineDb();
  const [points, visits, trips, places] = await Promise.all([
    db.getAllAsync<PointRow & { heading: number | null; alt: number | null }>(
      "SELECT id, ts, lat, lon, acc, speed, heading, alt FROM points ORDER BY ts",
    ),
    db.getAllAsync<VisitRow>(
      "SELECT id, start_ts, end_ts, lat, lon, radius, point_count, place_id FROM visits ORDER BY start_ts",
    ),
    db.getAllAsync<TripRow>("SELECT id, start_ts, end_ts, from_visit, to_visit, distance_m, mode FROM trips ORDER BY start_ts"),
    db.getAllAsync<PlaceRow>("SELECT id, name, lat, lon, radius FROM places"),
  ]);
  return { points, visits, trips, places };
};

// ── Backup ──────────────────────────────────────────────────────────────────
// What `lib/timeline/sync.ts` sends and restores. Timestamps stay epoch ms here.

export type SyncPoint = PointRow & { heading: number | null; alt: number | null };
export type SyncPlace = PlaceRow & { updated_at: number };
export type SyncDeletion = { client_id: string; deleted_at: number };

export const unsyncedPoints = async (limit: number) => {
  const db = await timelineDb();
  return db.getAllAsync<SyncPoint>(
    "SELECT id, ts, lat, lon, acc, speed, heading, alt FROM points WHERE synced_at IS NULL ORDER BY ts LIMIT ?",
    limit,
  );
};

export const markPointsSynced = async (ids: readonly string[], at = Date.now()) => {
  const db = await timelineDb();
  await transaction(db, async (txn) => {
    for (const id of ids) await txn.runAsync("UPDATE points SET synced_at = ? WHERE id = ?", at, id);
  });
};

export type DirtySegments = { from: number; version: string | null };

/** Where the backup's visits and trips must be replaced from; null when they are up to date. */
export const segmentsDirtyFrom = async (): Promise<DirtySegments | null> => {
  const db = await timelineDb();
  const [value, version] = await Promise.all([getMeta(db, SEGMENTS_DIRTY), getMeta(db, SEGMENTS_VERSION)]);
  if (value === "none") return null;
  return { from: value === null ? 0 : Number(value), version };
};

export const segmentsSince = async (from: number) => {
  const db = await timelineDb();
  const [visits, trips] = await Promise.all([
    db.getAllAsync<VisitRow>(
      "SELECT id, start_ts, end_ts, lat, lon, radius, point_count, place_id FROM visits WHERE start_ts >= ? ORDER BY start_ts",
      from,
    ),
    db.getAllAsync<TripRow>(
      "SELECT id, start_ts, end_ts, from_visit, to_visit, distance_m, mode FROM trips WHERE start_ts >= ? ORDER BY start_ts",
      from,
    ),
  ]);
  return { visits, trips };
};

/**
 * Records that the backup has every segment from `sent.from` on. If
 * segmentation changed anything since they were read (the version moved),
 * that change stays due for the next backup.
 */
export const markSegmentsSynced = async (sent: DirtySegments, at = Date.now()) => {
  const db = await timelineDb();
  await transaction(db, async (txn) => {
    if ((await readMeta(txn, SEGMENTS_VERSION)) !== sent.version) return;
    await setMeta(txn, SEGMENTS_DIRTY, "none");
    await txn.runAsync("UPDATE visits SET synced_at = ? WHERE start_ts >= ?", at, sent.from);
    await txn.runAsync("UPDATE trips SET synced_at = ? WHERE start_ts >= ?", at, sent.from);
  });
};

export const unsyncedPlaces = async () => {
  const db = await timelineDb();
  const [places, deletions] = await Promise.all([
    db.getAllAsync<SyncPlace>(
      "SELECT id, name, lat, lon, radius, updated_at FROM places WHERE synced_at IS NULL OR updated_at > synced_at",
    ),
    db.getAllAsync<SyncDeletion>("SELECT client_id, deleted_at FROM deletions WHERE kind = 'place' AND synced_at IS NULL"),
  ]);
  return { places, deletions };
};

export type IncomingPlace = { id: string; name: string; lat: number; lon: number; radius: number; updated_at: number };

/**
 * Applies what the backup knows better (newer places, deletions), then marks
 * what was sent as synced. Incoming rows count as synced as of their own
 * `updated_at`, so they are not sent straight back.
 */
export const applyPlaceSync = async (
  sent: { places: readonly SyncPlace[]; deletions: readonly SyncDeletion[] },
  incoming: { places: readonly IncomingPlace[]; deleted: readonly string[] },
  at = Date.now(),
) => {
  const db = await timelineDb();
  await transaction(db, async (txn) => {
    for (const p of sent.places)
      await txn.runAsync("UPDATE places SET synced_at = ? WHERE id = ? AND updated_at = ?", at, p.id, p.updated_at);
    for (const d of sent.deletions) await txn.runAsync("UPDATE deletions SET synced_at = ? WHERE client_id = ?", at, d.client_id);
    for (const p of incoming.places) {
      await txn.runAsync(
        "INSERT OR REPLACE INTO places (id, name, lat, lon, radius, updated_at, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        p.id,
        p.name,
        p.lat,
        p.lon,
        p.radius,
        p.updated_at,
        p.updated_at,
      );
    }
    for (const id of incoming.deleted) {
      await txn.runAsync("UPDATE visits SET place_id = NULL WHERE place_id = ?", id);
      await txn.runAsync("DELETE FROM places WHERE id = ?", id);
    }
  });
  // Visits near places that arrived get their names, as when a place is made here.
  for (const p of incoming.places) await tagVisits(db, p);
};

/** Nothing recorded and nothing named: a restore target. */
export const isEmpty = async () => {
  const db = await timelineDb();
  const row = await db.getFirstAsync<{ n: number }>(
    "SELECT (SELECT COUNT(*) FROM points) + (SELECT COUNT(*) FROM places) + (SELECT COUNT(*) FROM visits) AS n",
  );
  return (row?.n ?? 0) === 0;
};

export type RestorePage = {
  points: SyncPoint[];
  visits: VisitRow[];
  trips: TripRow[];
  places: IncomingPlace[];
};

/** Writes one page of a restore; everything arrives already backed up. */
export const restorePage = async (page: RestorePage, at = Date.now()) => {
  const db = await timelineDb();
  await transaction(db, async (txn) => {
    for (const p of page.points) {
      await txn.runAsync(
        "INSERT OR IGNORE INTO points (id, ts, lat, lon, acc, speed, heading, alt, updated_at, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        p.id,
        p.ts,
        p.lat,
        p.lon,
        p.acc,
        p.speed,
        p.heading,
        p.alt,
        at,
        at,
      );
    }
    for (const v of page.visits) {
      await txn.runAsync(
        "INSERT OR IGNORE INTO visits (id, start_ts, end_ts, lat, lon, radius, point_count, place_id, updated_at, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        v.id,
        v.start_ts,
        v.end_ts,
        v.lat,
        v.lon,
        v.radius,
        v.point_count,
        v.place_id,
        at,
        at,
      );
    }
    for (const t of page.trips) {
      await txn.runAsync(
        "INSERT OR IGNORE INTO trips (id, start_ts, end_ts, from_visit, to_visit, distance_m, mode, updated_at, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        t.id,
        t.start_ts,
        t.end_ts,
        t.from_visit,
        t.to_visit,
        t.distance_m,
        t.mode,
        at,
        at,
      );
    }
    for (const p of page.places) {
      await txn.runAsync(
        "INSERT OR REPLACE INTO places (id, name, lat, lon, radius, updated_at, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        p.id,
        p.name,
        p.lat,
        p.lon,
        p.radius,
        p.updated_at,
        p.updated_at,
      );
    }
  });
};

/**
 * After a restore: go on segmenting from the latest restored visit, not from
 * the beginning (which would send all of history back as this device's), and
 * count everything restored as backed up.
 */
export const finishRestore = async () => {
  const db = await timelineDb();
  await transaction(db, async (txn) => {
    const last = await txn.getFirstAsync<{ start: number | null }>("SELECT MAX(start_ts) AS start FROM visits");
    if (last?.start != null) await setMeta(txn, "segmented_from", String(last.start));
    await setMeta(txn, SEGMENTS_DIRTY, "none");
  });
};

/**
 * Forgets what was backed up, so the next backup sends everything. For a
 * backup that starts over: switched on (maybe to another organization), or
 * after its server copy was deleted. Safe, since lokate dedupes.
 */
export const resetSyncMarks = async () => {
  const db = await timelineDb();
  await transaction(db, async (txn) => {
    for (const table of ["points", "visits", "trips", "places"]) await txn.execAsync(`UPDATE ${table} SET synced_at = NULL`);
    await txn.execAsync("DELETE FROM deletions");
    await txn.runAsync("DELETE FROM meta WHERE key = ?", SEGMENTS_DIRTY);
  });
};
