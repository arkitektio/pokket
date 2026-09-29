import * as React from "react";
import { AppState, Platform } from "react-native";
import { catchUp, reconcileTimeline } from "./tracking";

/**
 * Keeps the recording in line with the setting on launch, and turns what
 * was recorded in the background into visits and trips whenever the app
 * comes back. Renders nothing; never prompts.
 */
export function TimelineSync() {
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
