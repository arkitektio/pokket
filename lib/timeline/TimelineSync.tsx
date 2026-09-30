import * as React from "react";
import { AppState, Platform } from "react-native";
import { reconcileBackupSchedule } from "./backgroundBackup";
import { useTimelineSettings } from "./settings";
import { catchUp, reconcileTimeline } from "./tracking";

/**
 * Keeps the recording in line with the setting on launch, and turns what
 * was recorded in the background into visits and trips whenever the app
 * comes back, and keeps the background backup scheduled as its settings say.
 * Renders nothing; never prompts.
 */
export function TimelineSync() {
  const { settings, loaded } = useTimelineSettings();
  const { backupProfileId, backupIntervalMin } = settings;
  React.useEffect(() => {
    if (!loaded || Platform.OS === "web") return;
    void reconcileBackupSchedule().catch((error) => console.warn("[timeline] backup schedule failed:", error));
  }, [loaded, backupProfileId, backupIntervalMin]);

  React.useEffect(() => {
    if (Platform.OS === "web") return;
    void reconcileTimeline().catch((error) => console.warn("[timeline] reconcile failed:", error));
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void catchUp();
    });
    return () => subscription.remove();
  }, []);
  return null;
}
