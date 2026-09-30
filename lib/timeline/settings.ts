import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { z } from "zod";
import type { SegmentOptions } from "./segment";

/**
 * The location timeline, as a setting. It is the device's alone: what it
 * records stays in an encrypted database on this phone, and the only
 * requests it ever makes are for map tiles (and place names, if a geocoder
 * is set) — to servers the user picks here.
 *
 * Every knob is here, each with a default that suits most people; the
 * presets only fill in the recording ones.
 */
export const TIMELINE_STORAGE_KEY = "pokket:timeline:v1";

/** Public OSM-based vector tiles; no key, no account, no tracking. */
export const DEFAULT_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export const ACCURACIES = ["lowest", "low", "balanced", "high", "highest", "navigation"] as const;
export type AccuracyLevel = (typeof ACCURACIES)[number];

export const ACTIVITY_TYPES = ["other", "automotive", "fitness", "otherNavigation", "airborne"] as const;
export type ActivityKind = (typeof ACTIVITY_TYPES)[number];

/** A number with bounds; out-of-range or garbage falls back to the default. */
const num = (min: number, max: number, fallback: number) =>
  z.number().min(min).max(max).catch(fallback).default(fallback);

/** The intervals offered for the automatic backup, in minutes; 0 is off. The OS runs background work at most every 15. */
export const BACKUP_INTERVALS = [0, 15, 30, 60, 180, 360, 720, 1440] as const;

export const TimelineSettingsSchema = z.object({
  enabled: z.boolean().default(false),

  // Recording — what the OS is asked for.
  /** How hard the OS tries for a precise fix; higher costs battery. */
  accuracy: z.enum(ACCURACIES).catch("balanced").default("balanced"),
  /** Metres moved before the next fix is reported. */
  distanceIntervalM: num(0, 5000, 60),
  /** Fixes are handed over in batches once this far has been covered… */
  deferredDistanceM: num(0, 50_000, 250),
  /** …or this many minutes have passed. */
  deferredIntervalMin: num(0, 120, 5),
  /** iOS: let the OS pause updates when it thinks you are not moving. */
  pauseAutomatically: z.boolean().default(false),
  /** iOS: what kind of moving to optimise for. */
  activityType: z.enum(ACTIVITY_TYPES).catch("other").default("other"),
  /** iOS: the blue status-bar pill while recording in the background. */
  showIndicator: z.boolean().default(false),

  // Segmentation — how fixes become visits and trips.
  /** Fixes within this many metres of each other are one place. */
  stayRadiusM: num(20, 2000, 120),
  /** Staying this many minutes makes a visit. */
  minStayMin: num(1, 240, 5),
  /** Fixes less accurate than this are ignored. */
  maxAccuracyM: num(10, 5000, 150),
  /** Jumps implying more than this speed are glitches. */
  maxSpeedKmh: num(10, 1200, 325),
  /** Trips averaging up to this are walks… */
  walkMaxKmh: num(1, 50, 8),
  /** …up to this, bike rides; faster, vehicles. */
  bikeMaxKmh: num(2, 100, 25),

  // Places and retention.
  /** How far around a named place its visits are matched. */
  placeRadiusM: num(20, 2000, 150),
  /** Raw fixes older than this many days are deleted; 0 keeps them. Visits and trips stay. */
  retentionDays: num(0, 36_500, 90),

  // Servers.
  styleUrl: z.string().default(DEFAULT_STYLE_URL),
  /** A Photon-compatible reverse geocoder; empty means never ask anyone. */
  geocoderUrl: z.string().default(""),

  // Backup.
  /** The profile (organization) whose lokate keeps a backup; null: no backup. */
  backupProfileId: z.string().nullable().catch(null).default(null),
  /**
   * Also back up every this many minutes: while pokket is open, and in the
   * background as often as the OS allows (lib/timeline/backgroundBackup.ts).
   * 0: only when pokket opens, and on "Back up now".
   */
  backupIntervalMin: z
    .number()
    .refine((v) => (BACKUP_INTERVALS as readonly number[]).includes(v))
    .catch(0)
    .default(0),
});


export type TimelineSettings = z.infer<typeof TimelineSettingsSchema>;

export const defaultTimelineSettings = (): TimelineSettings => TimelineSettingsSchema.parse({});

export const parseTimelineSettings = (raw: string | null): TimelineSettings => {
  if (!raw) return defaultTimelineSettings();
  try {
    const parsed = TimelineSettingsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : defaultTimelineSettings();
  } catch {
    return defaultTimelineSettings();
  }
};

export const RECORDING_KEYS = [
  "accuracy",
  "distanceIntervalM",
  "deferredDistanceM",
  "deferredIntervalMin",
  "pauseAutomatically",
  "activityType",
  "showIndicator",
] as const satisfies readonly (keyof TimelineSettings)[];

export const SEGMENTATION_KEYS = [
  "stayRadiusM",
  "minStayMin",
  "maxAccuracyM",
  "maxSpeedKmh",
  "walkMaxKmh",
  "bikeMaxKmh",
] as const satisfies readonly (keyof TimelineSettings)[];

type RecordingSettings = Pick<TimelineSettings, (typeof RECORDING_KEYS)[number]>;

/** Shortcuts for the recording knobs; everything else keeps its value. */
export const PRESETS = {
  /** Street-level trips, more battery. */
  precise: {
    label: "Precise",
    values: { accuracy: "high", distanceIntervalM: 20, deferredDistanceM: 100, deferredIntervalMin: 2, pauseAutomatically: false },
  },
  /** Places and trips; the defaults. */
  balanced: {
    label: "Balanced",
    values: { accuracy: "balanced", distanceIntervalM: 60, deferredDistanceM: 250, deferredIntervalMin: 5, pauseAutomatically: false },
  },
  /** Places only, roughly; least battery. */
  saver: {
    label: "Battery saver",
    values: { accuracy: "low", distanceIntervalM: 250, deferredDistanceM: 1000, deferredIntervalMin: 15, pauseAutomatically: true },
  },
} as const satisfies Record<string, { label: string; values: Partial<RecordingSettings> }>;

export type Preset = keyof typeof PRESETS;

/** The preset the recording knobs currently match, if any. */
export const presetOf = (settings: TimelineSettings): Preset | null => {
  for (const [key, preset] of Object.entries(PRESETS) as [Preset, (typeof PRESETS)[Preset]][]) {
    const values = preset.values as Partial<RecordingSettings>;
    if ((Object.keys(values) as (keyof RecordingSettings)[]).every((k) => settings[k] === values[k])) return key;
  }
  return null;
};

const KMH = 1000 / 3600;

export const segmentOptionsOf = (settings: TimelineSettings): SegmentOptions => ({
  radiusM: settings.stayRadiusM,
  minStayMs: settings.minStayMin * 60 * 1000,
  maxAccuracyM: settings.maxAccuracyM,
  maxSpeedMps: settings.maxSpeedKmh * KMH,
  walkMaxMps: settings.walkMaxKmh * KMH,
  bikeMaxMps: Math.max(settings.bikeMaxKmh, settings.walkMaxKmh) * KMH,
});

export type TrackingStatus =
  | { kind: "off" }
  | { kind: "working"; step: string }
  | { kind: "on" }
  /** Switched on, but the system permission is missing or only "while using". */
  | { kind: "denied"; background: boolean }
  | { kind: "error"; message: string };

type Snapshot = { settings: TimelineSettings; loaded: boolean; status: TrackingStatus };

let snapshot: Snapshot = { settings: defaultTimelineSettings(), loaded: false, status: { kind: "off" } };
const listeners = new Set<() => void>();
const publish = (next: Partial<Snapshot>) => {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((l) => l());
};

const loaded = AsyncStorage.getItem(TIMELINE_STORAGE_KEY)
  .then((raw) => {
    const settings = parseTimelineSettings(raw);
    publish({ settings, loaded: true, status: settings.enabled ? { kind: "on" } : { kind: "off" } });
  })
  .catch(() => publish({ loaded: true }));

export const loadTimelineSettings = () => loaded.then(() => snapshot.settings);

export const saveTimelineSettings = async (patch: Partial<TimelineSettings>) => {
  const settings = TimelineSettingsSchema.parse({ ...snapshot.settings, ...patch });
  publish({ settings });
  await AsyncStorage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify(settings)).catch(() => undefined);
  return settings;
};

export const setTrackingStatus = (status: TrackingStatus) => publish({ status });

export const useTimelineSettings = (): Snapshot =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => snapshot,
  );
