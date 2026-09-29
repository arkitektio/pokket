/**
 * From raw fixes to a day's story: where the user stayed (visits) and how
 * they got between those places (trips). Pure, so it runs anywhere and is
 * tested without a device.
 *
 * Stay-point detection: a run of fixes that all lie within `radiusM` of the
 * run's first fix and span at least `minStayMs` is a visit. Tracking reports
 * by distance, so a phone lying still reports nothing — two fixes close
 * together hours apart are one long stay, which this handles as it is.
 */

export type Fix = { ts: number; lat: number; lon: number; acc?: number | null };

export type Visit = {
  start: number;
  end: number;
  lat: number;
  lon: number;
  /** How far the visit's fixes lie from its centre, at most. */
  radius: number;
  count: number;
};

export type TripMode = "walk" | "bike" | "vehicle" | "unknown";

export type Trip = {
  start: number;
  end: number;
  /** Index into `visits` of where it began / ended, if at one. */
  from: number | null;
  to: number | null;
  distance: number;
  mode: TripMode;
};

export type Segments = { visits: Visit[]; trips: Trip[] };

export type SegmentOptions = {
  radiusM: number;
  minStayMs: number;
  /** Fixes less accurate than this are dropped. */
  maxAccuracyM: number;
  /** A fix that implies moving faster than this since the last is a glitch. */
  maxSpeedMps: number;
  /** Trips averaging up to this are walks, up to `bikeMaxMps` bike rides, above it vehicles. */
  walkMaxMps: number;
  bikeMaxMps: number;
};

export const DEFAULT_SEGMENT_OPTIONS: SegmentOptions = {
  radiusM: 120,
  minStayMs: 5 * 60 * 1000,
  maxAccuracyM: 150,
  maxSpeedMps: 90,
  walkMaxMps: 2.2,
  bikeMaxMps: 7,
};

const EARTH_RADIUS_M = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. */
export const haversine = (a: { lat: number; lon: number }, b: { lat: number; lon: number }): number => {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
};

/** Drops inaccurate fixes and teleports; expects fixes sorted by time. */
export const clean = (fixes: readonly Fix[], options: SegmentOptions = DEFAULT_SEGMENT_OPTIONS): Fix[] => {
  const kept: Fix[] = [];
  for (const fix of fixes) {
    if (fix.acc != null && fix.acc > options.maxAccuracyM) continue;
    const last = kept[kept.length - 1];
    if (last) {
      if (fix.ts <= last.ts) continue;
      const speed = haversine(last, fix) / ((fix.ts - last.ts) / 1000);
      if (speed > options.maxSpeedMps) continue;
    }
    kept.push(fix);
  }
  return kept;
};

const pathLength = (fixes: readonly Fix[]) => {
  let total = 0;
  for (let i = 1; i < fixes.length; i++) total += haversine(fixes[i - 1], fixes[i]);
  return total;
};

/** A guess from the average speed; good enough to pick an icon. */
export const guessMode = (
  distanceM: number,
  durationMs: number,
  options: Pick<SegmentOptions, "walkMaxMps" | "bikeMaxMps"> = DEFAULT_SEGMENT_OPTIONS,
): TripMode => {
  if (durationMs <= 0 || distanceM < 50) return "unknown";
  const speed = distanceM / (durationMs / 1000);
  if (speed < options.walkMaxMps) return "walk";
  if (speed < options.bikeMaxMps) return "bike";
  return "vehicle";
};

const toVisit = (run: readonly Fix[]): Visit => {
  const lat = run.reduce((s, f) => s + f.lat, 0) / run.length;
  const lon = run.reduce((s, f) => s + f.lon, 0) / run.length;
  const centre = { lat, lon };
  return {
    start: run[0].ts,
    end: run[run.length - 1].ts,
    lat,
    lon,
    radius: Math.max(...run.map((f) => haversine(centre, f))),
    count: run.length,
  };
};

/**
 * Splits fixes into visits and the trips between them. `now`, when given,
 * lets a stay still in progress (the last fixes, all close together) count
 * as a visit before it has lasted `minStayMs` in fixes alone.
 */
export const segment = (
  raw: readonly Fix[],
  options: SegmentOptions = DEFAULT_SEGMENT_OPTIONS,
  now?: number,
): Segments => {
  const fixes = clean(raw, options);
  const visits: Visit[] = [];
  /** Per visit, the index of its first and last fix. */
  const bounds: [number, number][] = [];

  let i = 0;
  while (i < fixes.length) {
    let j = i + 1;
    while (j < fixes.length && haversine(fixes[i], fixes[j]) <= options.radiusM) j++;
    const lastTs = fixes[j - 1].ts;
    const ongoing = j === fixes.length && now !== undefined && now - fixes[i].ts >= options.minStayMs;
    if (lastTs - fixes[i].ts >= options.minStayMs || ongoing) {
      visits.push(toVisit(fixes.slice(i, j)));
      bounds.push([i, j - 1]);
      i = j;
    } else {
      i++;
    }
  }

  const trips: Trip[] = [];
  const addTrip = (fromFix: number, toFix: number, from: number | null, to: number | null) => {
    if (toFix <= fromFix) return;
    const path = fixes.slice(fromFix, toFix + 1);
    const start = path[0].ts;
    const end = path[path.length - 1].ts;
    const distance = pathLength(path);
    trips.push({ start, end, from, to, distance, mode: guessMode(distance, end - start, options) });
  };

  if (visits.length === 0) {
    addTrip(0, fixes.length - 1, null, null);
    return { visits, trips };
  }
  // Before the first visit, between each pair, and after the last. Each trip
  // shares its end fixes with the visits it joins, so its path is unbroken.
  addTrip(0, bounds[0][0], null, 0);
  for (let v = 0; v < visits.length - 1; v++) addTrip(bounds[v][1], bounds[v + 1][0], v, v + 1);
  const last = visits.length - 1;
  addTrip(bounds[last][1], fixes.length - 1, last, null);
  return { visits, trips };
};
