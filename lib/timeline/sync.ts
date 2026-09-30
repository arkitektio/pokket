import type { ApolloClient } from "@apollo/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import {
  ChangesDocument,
  ChangesQuery,
  ChangesQueryVariables,
  DeleteServerCopyDocument,
  DeleteServerCopyMutation,
  DeleteServerCopyMutationVariables,
  LokatePlaceFragment,
  LokateTripFragment,
  LokateVisitFragment,
  PointInput,
  ReplaceSegmentsDocument,
  ReplaceSegmentsMutation,
  ReplaceSegmentsMutationVariables,
  SyncPlacesDocument,
  SyncPlacesMutation,
  SyncPlacesMutationVariables,
  TripInput,
  TripMode,
  UploadPointsDocument,
  UploadPointsMutation,
  UploadPointsMutationVariables,
  VisitInput,
} from "@/lib/lokate/api/graphql";
import {
  applyPlaceSync,
  finishRestore,
  IncomingPlace,
  isEmpty,
  markPointsSynced,
  markSegmentsSynced,
  resetSyncMarks,
  restorePage,
  segmentsDirtyFrom,
  segmentsSince,
  SyncPoint,
  TripRow,
  unsyncedPlaces,
  unsyncedPoints,
  VisitRow,
} from "./db";
import type { TripMode as LocalTripMode } from "./segment";
import { saveTimelineSettings } from "./settings";
import { catchUp } from "./tracking";

/**
 * Backup to the organization's lokate. The phone stays in charge: it records
 * and segments, lokate keeps a copy. Every call is safe to repeat (lokate
 * dedupes on the token's device and each row's client id), so a sync cut off
 * halfway just runs again next time. It runs while the app is open
 * (LokateBackup.tsx), and, if an interval is set, in the background
 * (backgroundBackup.ts) — never both at once.
 *
 * Order: points, then visits and trips, then places.
 */

export const POINT_BATCH = 500;
export const SEGMENT_BATCH = 500;
const CHANGES_PAGE = 1000;

/** What sync needs from lokate; `apolloLokate` is the real one, tests pass a fake. */
export type LokateApi = {
  uploadPoints(points: PointInput[]): Promise<void>;
  replaceSegments(from: string, visits: VisitInput[], trips: TripInput[]): Promise<void>;
  syncPlaces(
    places: SyncPlacesMutationVariables["places"],
    deleted: SyncPlacesMutationVariables["deleted"],
  ): Promise<LokatePlaceFragment[]>;
  changes(cursor: string | null, limit: number): Promise<ChangesQuery["changes"]>;
  deleteServerCopy(): Promise<number>;
};

export const apolloLokate = (client: ApolloClient<unknown>): LokateApi => ({
  async uploadPoints(points) {
    await client.mutate<UploadPointsMutation, UploadPointsMutationVariables>({ mutation: UploadPointsDocument, variables: { points } });
  },
  async replaceSegments(from, visits, trips) {
    await client.mutate<ReplaceSegmentsMutation, ReplaceSegmentsMutationVariables>({
      mutation: ReplaceSegmentsDocument,
      variables: { from, visits, trips },
    });
  },
  async syncPlaces(places, deleted) {
    const result = await client.mutate<SyncPlacesMutation, SyncPlacesMutationVariables>({
      mutation: SyncPlacesDocument,
      variables: { places, deleted },
    });
    return result.data?.syncPlaces.stale ?? [];
  },
  async changes(cursor, limit) {
    const result = await client.query<ChangesQuery, ChangesQueryVariables>({
      query: ChangesDocument,
      variables: { cursor, limit },
      fetchPolicy: "no-cache",
    });
    return result.data.changes;
  },
  async deleteServerCopy() {
    const result = await client.mutate<DeleteServerCopyMutation, DeleteServerCopyMutationVariables>({
      mutation: DeleteServerCopyDocument,
      variables: { confirm: "DELETE" },
    });
    return result.data?.deleteServerCopy ?? 0;
  },
});

// ── Mapping ──────────────────────────────────────────────────────────────────

const iso = (ms: number) => new Date(ms).toISOString();
const ms = (value: string) => Date.parse(value);

const TO_SERVER_MODE: Record<LocalTripMode, TripMode> = {
  walk: TripMode.Walk,
  bike: TripMode.Bike,
  vehicle: TripMode.Vehicle,
  unknown: TripMode.Unknown,
};
const FROM_SERVER_MODE: Record<TripMode, LocalTripMode> = {
  [TripMode.Walk]: "walk",
  [TripMode.Bike]: "bike",
  [TripMode.Vehicle]: "vehicle",
  [TripMode.Unknown]: "unknown",
};

export const toPointInput = (p: SyncPoint): PointInput => ({
  clientId: p.id,
  ts: iso(p.ts),
  lat: p.lat,
  lon: p.lon,
  acc: p.acc,
  speed: p.speed,
  heading: p.heading,
  alt: p.alt,
});

export const toVisitInput = (v: VisitRow): VisitInput => ({
  clientId: v.id,
  start: iso(v.start_ts),
  end: iso(v.end_ts),
  lat: v.lat,
  lon: v.lon,
  radius: v.radius,
  pointCount: v.point_count,
  placeClientId: v.place_id,
});

export const toTripInput = (t: TripRow): TripInput => ({
  clientId: t.id,
  start: iso(t.start_ts),
  end: iso(t.end_ts),
  fromVisit: t.from_visit,
  toVisit: t.to_visit,
  distance: t.distance_m,
  mode: TO_SERVER_MODE[t.mode] ?? TripMode.Unknown,
});

const fromVisit = (v: LokateVisitFragment): VisitRow => ({
  id: v.clientId,
  start_ts: ms(v.start),
  end_ts: ms(v.end),
  lat: v.lat,
  lon: v.lon,
  radius: v.radius,
  point_count: v.pointCount,
  place_id: v.placeClientId ?? null,
});

const fromTrip = (t: LokateTripFragment): TripRow => ({
  id: t.clientId,
  start_ts: ms(t.start),
  end_ts: ms(t.end),
  from_visit: t.fromVisit ?? null,
  to_visit: t.toVisit ?? null,
  distance_m: t.distance,
  mode: FROM_SERVER_MODE[t.mode] ?? "unknown",
});

/** A live place, or null for a tombstone (or one missing what a place needs). */
const fromPlace = (p: LokatePlaceFragment): IncomingPlace | null =>
  p.deletedAt || p.name == null || p.lat == null || p.lon == null || p.radius == null
    ? null
    : { id: p.clientId, name: p.name, lat: p.lat, lon: p.lon, radius: p.radius, updated_at: ms(p.updatedAt) };

type Segment = { start: number; visit?: VisitRow; trip?: TripRow };

/**
 * Splits segments (sorted by start) into `replaceSegments` calls of at most
 * `size`. Each call replaces from its own first start, so the calls must
 * never split rows sharing a start — the later call would delete the earlier
 * one's. The first call starts at `from`, so rows gone locally go there too.
 */
export const chunkSegments = (from: number, visits: readonly VisitRow[], trips: readonly TripRow[], size = SEGMENT_BATCH) => {
  const all: Segment[] = [
    ...visits.map((visit) => ({ start: visit.start_ts, visit })),
    ...trips.map((trip) => ({ start: trip.start_ts, trip })),
  ].sort((a, b) => a.start - b.start);
  const chunks: { from: number; visits: VisitRow[]; trips: TripRow[] }[] = [];
  let current = { from, visits: [] as VisitRow[], trips: [] as TripRow[] };
  let count = 0;
  for (const [i, s] of all.entries()) {
    const boundary = count >= size && all[i - 1].start < s.start;
    if (boundary) {
      chunks.push(current);
      current = { from: s.start, visits: [], trips: [] };
      count = 0;
    }
    if (s.visit) current.visits.push(s.visit);
    if (s.trip) current.trips.push(s.trip);
    count++;
  }
  chunks.push(current);
  return chunks;
};

// ── Push and restore ─────────────────────────────────────────────────────────

export const pushPoints = async (api: LokateApi) => {
  let sent = 0;
  for (;;) {
    const batch = await unsyncedPoints(POINT_BATCH);
    if (batch.length === 0) return sent;
    await api.uploadPoints(batch.map(toPointInput));
    await markPointsSynced(batch.map((p) => p.id));
    sent += batch.length;
  }
};

export const pushSegments = async (api: LokateApi) => {
  const dirty = await segmentsDirtyFrom();
  if (!dirty) return 0;
  const { visits, trips } = await segmentsSince(dirty.from);
  for (const chunk of chunkSegments(dirty.from, visits, trips)) {
    await api.replaceSegments(iso(chunk.from), chunk.visits.map(toVisitInput), chunk.trips.map(toTripInput));
  }
  await markSegmentsSynced(dirty);
  return visits.length + trips.length;
};

export const pushPlaces = async (api: LokateApi) => {
  const sent = await unsyncedPlaces();
  if (sent.places.length === 0 && sent.deletions.length === 0) return 0;
  const stale = await api.syncPlaces(
    sent.places.map((p) => ({ clientId: p.id, name: p.name, lat: p.lat, lon: p.lon, radius: p.radius, updatedAt: iso(p.updated_at) })),
    sent.deletions.map((d) => ({ clientId: d.client_id, deletedAt: iso(d.deleted_at) })),
  );
  const incoming = stale.map(fromPlace);
  await applyPlaceSync(sent, {
    places: incoming.filter((p): p is IncomingPlace => p !== null),
    deleted: stale.filter((_, i) => incoming[i] === null).map((p) => p.clientId),
  });
  return sent.places.length + sent.deletions.length;
};

/** Everything of the user's, from all their devices, into this (empty) timeline. */
export const restore = async (api: LokateApi, onPage?: (rows: number) => void) => {
  let cursor: string | null = null;
  let rows = 0;
  for (;;) {
    const page: ChangesQuery["changes"] = await api.changes(cursor, CHANGES_PAGE);
    await restorePage({
      points: page.points.map((p) => ({
        id: p.clientId,
        ts: ms(p.ts),
        lat: p.lat,
        lon: p.lon,
        acc: p.acc ?? null,
        speed: p.speed ?? null,
        heading: p.heading ?? null,
        alt: p.alt ?? null,
      })),
      visits: page.visits.map(fromVisit),
      trips: page.trips.map(fromTrip),
      places: page.places.map(fromPlace).filter((p): p is IncomingPlace => p !== null),
    });
    rows += page.points.length + page.visits.length + page.trips.length + page.places.length;
    onPage?.(rows);
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  await finishRestore();
  return rows;
};

// ── Status, and the one client in use ────────────────────────────────────────

export type BackupStatus =
  | { kind: "idle"; lastAt: number | null }
  | { kind: "working"; step: string }
  | { kind: "error"; message: string; lastAt: number | null };

let status: BackupStatus = { kind: "idle", lastAt: null };
let api: LokateApi | null = null;
const listeners = new Set<() => void>();
const publish = (next: BackupStatus) => {
  status = next;
  listeners.forEach((l) => l());
};
const lastAt = () => (status.kind === "working" ? null : status.lastAt);

/** When the last backup finished, kept across launches: background runs happen while no screen shows it. */
const LAST_BACKUP_KEY = "pokket:timeline:backup:last:v1";
void AsyncStorage.getItem(LAST_BACKUP_KEY)
  .then((raw) => {
    const at = Number(raw);
    if (at > 0 && status.kind === "idle" && status.lastAt === null) publish({ kind: "idle", lastAt: at });
  })
  .catch(() => undefined);

export const useBackupStatus = (): BackupStatus =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => status,
    () => status,
  );

/** A switch-on waiting for the organization's client (see `startBackup`). */
let pendingStart = false;

/** Set by `LokateBackup` while the backup's organization is connected. */
export const setBackupApi = (next: LokateApi | null) => {
  api = next;
  if (next && pendingStart) {
    pendingStart = false;
    void backupNow({ reset: true, restoreIfEmpty: true });
  }
};

export const backupAvailable = () => api !== null;

let running: Promise<void> | null = null;

/**
 * One backup run: catch up segmentation, then push what is new. With
 * `restoreIfEmpty` (only when the backup is switched on, never on its own —
 * or "Delete everything" here would quietly come back), an empty timeline is
 * first filled from the backup. Overlapping calls share the run, whichever
 * client they came with.
 */
export const backupWith = (
  target: LokateApi | null,
  { restoreIfEmpty = false, reset = false }: { restoreIfEmpty?: boolean; reset?: boolean } = {},
): Promise<void> => {
  running ??= (async () => {
    if (!target) return;
    const previous = lastAt();
    try {
      if (reset) await resetSyncMarks();
      await catchUp();
      if (restoreIfEmpty && (await isEmpty())) {
        publish({ kind: "working", step: "Restoring" });
        await restore(target, (rows) => publish({ kind: "working", step: `Restoring (${rows.toLocaleString()})` }));
      }
      publish({ kind: "working", step: "Backing up locations" });
      await pushPoints(target);
      publish({ kind: "working", step: "Backing up visits and trips" });
      await pushSegments(target);
      publish({ kind: "working", step: "Backing up places" });
      await pushPlaces(target);
      const at = Date.now();
      publish({ kind: "idle", lastAt: at });
      await AsyncStorage.setItem(LAST_BACKUP_KEY, String(at)).catch(() => undefined);
    } catch (error) {
      publish({ kind: "error", message: error instanceof Error ? error.message : String(error), lastAt: previous });
      throw error;
    } finally {
      running = null;
    }
  })();
  return running;
};

/** A backup run with the client of the organization connected now (see `setBackupApi`). Never throws. */
export const backupNow = (options: { restoreIfEmpty?: boolean; reset?: boolean } = {}): Promise<void> =>
  backupWith(api, options).catch(() => undefined);

/**
 * A backup starting over, right after it is switched on: everything is due,
 * and an empty phone is restored first. Runs as soon as `LokateBackup` hands
 * over the organization's client — which it does only after the switch.
 */
export const startBackup = () => {
  if (api) return backupNow({ reset: true, restoreIfEmpty: true });
  pendingStart = true;
  return Promise.resolve();
};

/**
 * Deletes everything lokate has of the user and switches the backup off —
 * left on, the next run would upload it all again. The phone keeps its timeline.
 */
export const deleteServerCopy = async () => {
  const target = api;
  if (!target) throw new Error("The backup is not reachable right now.");
  await running;
  await saveTimelineSettings({ backupProfileId: null });
  const deleted = await target.deleteServerCopy();
  await resetSyncMarks();
  publish({ kind: "idle", lastAt: null });
  return deleted;
};
