import * as Notifications from "expo-notifications";
import { AppRegistry, AppState, Platform } from "react-native";
import { UPLOAD_TASK_KEY, uploadNative } from "@/modules/pokket-upload";

/**
 * The Android service that keeps an upload going in the background
 * (modules/pokket-upload). On iOS, and on a build made before the module
 * existed, there is none and these do nothing. None of this may get in the
 * way of the upload itself, so a failure here is only ever a warning.
 *
 * It must start while the app is in the foreground, which it is: an upload
 * starts with a tap.
 */

// The native side holds this task open for as long as it is uploading, which
// is what keeps the timers running, and ends it itself: it never finishes here.
AppRegistry.registerHeadlessTask(UPLOAD_TASK_KEY, () => () => new Promise<void>(() => {}));

/** Android drops notifications updated too often, and a percent is all that shows. */
const PROGRESS_INTERVAL_MS = 1000;

let shownText: string | null = null;
let shownAt = 0;

const attempt = (what: string, work: () => void) => {
  try {
    work();
  } catch (error) {
    console.warn(`[uploads] the upload service did not ${what}:`, error);
  }
};

/**
 * Android 13 and later hide the notification without this. The service runs
 * either way, so a refusal changes nothing but what the user sees.
 */
const askToShowProgress = async () => {
  if (Platform.OS !== "android") return;
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status !== "granted" && canAskAgain) await Notifications.requestPermissionsAsync();
  } catch (error) {
    console.warn("[uploads] could not ask to show the upload's progress:", error);
  }
};

export const startUploadService = async (): Promise<void> => {
  if (!uploadNative) return;
  await askToShowProgress();
  shownText = null;
  attempt("start", () => uploadNative?.start("Uploading"));
};

export const updateUploadService = (text: string, fraction: number): void => {
  const now = Date.now();
  if (text === shownText && now - shownAt < PROGRESS_INTERVAL_MS) return;
  shownText = text;
  shownAt = now;
  attempt("update", () => uploadNative?.update(text, fraction));
};

/** `summary` is for someone who is not looking: it is dropped while the app is on screen. */
export const stopUploadService = (summary: string | null = null): void => {
  attempt("stop", () => uploadNative?.stop(AppState.currentState === "active" ? null : summary));
};
