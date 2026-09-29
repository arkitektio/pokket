import * as Location from "expo-location";
import { Platform } from "react-native";
import { insertFixes, pruneFixes, resegment, updateSegments } from "./db";
import {
  AccuracyLevel,
  ActivityKind,
  loadTimelineSettings,
  RECORDING_KEYS,
  saveTimelineSettings,
  SEGMENTATION_KEYS,
  segmentOptionsOf,
  setTrackingStatus,
  TimelineSettings,
} from "./settings";
import { TIMELINE_TASK } from "./task";

/**
 * Starting and stopping the recording. As with push, nothing here prompts on
 * its own: the system permissions are asked for only when the user switches
 * the timeline on.
 */

const ACCURACY: Record<AccuracyLevel, Location.Accuracy> = {
  lowest: Location.Accuracy.Lowest,
  low: Location.Accuracy.Low,
  balanced: Location.Accuracy.Balanced,
  high: Location.Accuracy.High,
  highest: Location.Accuracy.Highest,
  navigation: Location.Accuracy.BestForNavigation,
};

const ACTIVITY: Record<ActivityKind, Location.LocationActivityType> = {
  other: Location.LocationActivityType.Other,
  automotive: Location.LocationActivityType.AutomotiveNavigation,
  fitness: Location.LocationActivityType.Fitness,
  otherNavigation: Location.LocationActivityType.OtherNavigation,
  airborne: Location.LocationActivityType.Airborne,
};

const startUpdates = async (settings: TimelineSettings) => {
  if (await Location.hasStartedLocationUpdatesAsync(TIMELINE_TASK)) {
    await Location.stopLocationUpdatesAsync(TIMELINE_TASK);
  }
  await Location.startLocationUpdatesAsync(TIMELINE_TASK, {
    accuracy: ACCURACY[settings.accuracy],
    distanceInterval: settings.distanceIntervalM,
    // Hand locations over in batches rather than one by one; kinder to the battery.
    deferredUpdatesDistance: settings.deferredDistanceM,
    deferredUpdatesInterval: settings.deferredIntervalMin * 60 * 1000,
    activityType: ACTIVITY[settings.activityType],
    pausesUpdatesAutomatically: settings.pauseAutomatically,
    showsBackgroundLocationIndicator: settings.showIndicator,
    foregroundService: {
      notificationTitle: "Recording your timeline",
      notificationBody: "Stored on this phone only.",
      killServiceOnDestroy: false,
    },
  });
};

const permissionsGranted = async () => {
  const foreground = await Location.getForegroundPermissionsAsync();
  const background = await Location.getBackgroundPermissionsAsync();
  return { foreground: foreground.granted, background: background.granted };
};

/** On: ask for "while using", then "always", then start. */
export const enableTimeline = async (): Promise<boolean> => {
  setTrackingStatus({ kind: "working", step: "Asking for permission" });
  try {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (!foreground.granted) {
      setTrackingStatus({ kind: "denied", background: false });
      return false;
    }
    // Android 11+ only offers "Allow all the time" in the system settings;
    // this call takes the user there. iOS shows its upgrade prompt.
    const background = await Location.requestBackgroundPermissionsAsync();
    if (!background.granted) {
      setTrackingStatus({ kind: "denied", background: true });
      return false;
    }
    const settings = await saveTimelineSettings({ enabled: true });
    setTrackingStatus({ kind: "working", step: "Starting" });
    await startUpdates(settings);
    setTrackingStatus({ kind: "on" });
    return true;
  } catch (error) {
    setTrackingStatus({ kind: "error", message: error instanceof Error ? error.message : String(error) });
    return false;
  }
};

export const disableTimeline = async () => {
  setTrackingStatus({ kind: "working", step: "Stopping" });
  try {
    if (await Location.hasStartedLocationUpdatesAsync(TIMELINE_TASK)) {
      await Location.stopLocationUpdatesAsync(TIMELINE_TASK);
    }
  } catch (error) {
    console.warn("[timeline] stop failed:", error);
  }
  await saveTimelineSettings({ enabled: false });
  setTrackingStatus({ kind: "off" });
};

/**
 * Saves changed settings and makes them take effect: recording restarts
 * with the new knobs, and new segmentation rules redo the visits and trips
 * from every fix still kept.
 */
export const applyTimelineSettings = async (patch: Partial<TimelineSettings>) => {
  const before = await loadTimelineSettings();
  const after = await saveTimelineSettings(patch);
  const changed = (keys: readonly (keyof TimelineSettings)[]) => keys.some((k) => before[k] !== after[k]);
  if (after.enabled && changed(RECORDING_KEYS) && (await Location.hasStartedLocationUpdatesAsync(TIMELINE_TASK))) {
    await startUpdates(after);
  }
  if (changed(SEGMENTATION_KEYS)) {
    // Not while a catch-up is writing the same rows.
    await catchingUp;
    await resegment(segmentOptionsOf(after));
  }
  if (after.retentionDays !== before.retentionDays) {
    await pruneFixes(after.retentionDays, { keepUnsynced: after.backupProfileId !== null });
  }
  return after;
};

/**
 * On every launch: bring the OS in line with the setting (the user may have
 * withdrawn the permission, or the OS dropped the task), then catch up on
 * segmentation and retention. Never prompts.
 */
export const reconcileTimeline = async () => {
  const settings = await loadTimelineSettings();
  const running = await Location.hasStartedLocationUpdatesAsync(TIMELINE_TASK).catch(() => false);
  if (!settings.enabled) {
    if (running) await Location.stopLocationUpdatesAsync(TIMELINE_TASK).catch(() => undefined);
    return;
  }
  const granted = await permissionsGranted();
  if (!granted.foreground || !granted.background) {
    setTrackingStatus({ kind: "denied", background: granted.foreground });
  } else {
    try {
      if (!running) await startUpdates(settings);
      setTrackingStatus({ kind: "on" });
    } catch (error) {
      setTrackingStatus({ kind: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }
  await catchUp();
};

let catchingUp: Promise<void> | null = null;

/**
 * Segments what was recorded and applies retention. Cheap when nothing is
 * new. Calls that overlap (focus and resume together) share one run.
 */
export const catchUp = (): Promise<void> => {
  catchingUp ??= (async () => {
    try {
      const settings = await loadTimelineSettings();
      await updateSegments(segmentOptionsOf(settings));
      // Nothing is deleted before the backup has it.
      await pruneFixes(settings.retentionDays, { keepUnsynced: settings.backupProfileId !== null });
    } catch (error) {
      console.warn("[timeline] catch-up failed:", error);
    } finally {
      catchingUp = null;
    }
  })();
  return catchingUp;
};

export type RecordNowResult = { kind: "recorded"; accuracy: number | null } | { kind: "denied" };

/**
 * One precise location, now, straight into the timeline. It works whether
 * or not background recording is on. It asks for the "while using" permission,
 * since the user asked for this.
 */
export const recordNow = async (): Promise<RecordNowResult> => {
  let permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return { kind: "denied" };
  const l = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  await insertFixes([
    {
      ts: l.timestamp,
      lat: l.coords.latitude,
      lon: l.coords.longitude,
      acc: l.coords.accuracy,
      speed: l.coords.speed,
      heading: l.coords.heading,
      alt: l.coords.altitude,
    },
  ]);
  await catchUp();
  return { kind: "recorded", accuracy: l.coords.accuracy };
};

export const deniedHint = (background: boolean) =>
  !background
    ? "Location is turned off for pokket in the system settings."
    : Platform.OS === "ios"
      ? "pokket may only use location while open. Set Location to “Always” in the system settings."
      : "pokket may only use location while open. Choose “Allow all the time” in the system settings.";
