import { useFocusEffect } from "expo-router";
import * as React from "react";
import { loadRange, PlaceRow, PointRow, TripRow, VisitRow } from "./db";
import { catchUp } from "./tracking";

export type DayEntry = { kind: "visit"; visit: VisitRow; place: PlaceRow | null } | { kind: "trip"; trip: TripRow };

export type TimelineDay = {
  points: PointRow[];
  entries: DayEntry[];
  places: PlaceRow[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const startOfDay = (ts: number) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** The next local midnight; not `+ 24h`, which is wrong on DST days. */
export const nextDay = (dayStart: number) => startOfDay(dayStart + DAY_MS + 2 * 60 * 60 * 1000);
export const previousDay = (dayStart: number) => startOfDay(dayStart - 2 * 60 * 60 * 1000);

const loadDay = async (dayStart: number): Promise<TimelineDay> => {
  await catchUp();
  const { points, visits, trips, places } = await loadRange(dayStart, nextDay(dayStart));
  const byId = new Map(places.map((p) => [p.id, p]));
  const entries: DayEntry[] = [
    ...visits.map((visit) => ({ kind: "visit" as const, visit, place: (visit.place_id && byId.get(visit.place_id)) || null })),
    ...trips.map((trip) => ({ kind: "trip" as const, trip })),
  ].sort((a, b) => startOf(a) - startOf(b));
  return { points, entries, places };
};

/** One day of the timeline, segmented fresh whenever the screen gains focus. */
export const useTimelineDay = (dayStart: number) => {
  const [day, setDay] = React.useState<TimelineDay | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(() => {
    let cancelled = false;
    loadDay(dayStart).then(
      (next) => {
        if (cancelled) return;
        setDay(next);
        setError(null);
      },
      (e) => !cancelled && setError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      cancelled = true;
    };
  }, [dayStart]);

  useFocusEffect(reload);

  return { day, error, reload };
};

const startOf = (entry: DayEntry) => (entry.kind === "visit" ? entry.visit.start_ts : entry.trip.start_ts);
