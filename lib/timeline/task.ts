import type { LocationObject } from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { insertFixes } from "./db";

/**
 * The background half of the timeline. Defined at import time, from the top
 * of the root layout, because the OS may start the app headless just to hand
 * it locations — before any screen, provider or login exists. So this only
 * writes fixes to the database; turning them into visits and trips waits for
 * the app to be opened.
 */
export const TIMELINE_TASK = "pokket-timeline-location";

const record: TaskManager.TaskManagerTaskExecutor<{ locations: LocationObject[] }> = async ({ data, error }) => {
  if (error) {
    console.warn("[timeline] location task error:", error.message);
    return;
  }
  const locations = data?.locations ?? [];
  try {
    await insertFixes(
      locations.map((l) => ({
        ts: l.timestamp,
        lat: l.coords.latitude,
        lon: l.coords.longitude,
        acc: l.coords.accuracy,
        speed: l.coords.speed,
        heading: l.coords.heading,
        alt: l.coords.altitude,
      })),
    );
  } catch (e) {
    console.warn("[timeline] could not store locations:", e);
  }
};

// There is no background location on the web.
if (Platform.OS !== "web") TaskManager.defineTask(TIMELINE_TASK, record);
