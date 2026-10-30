import { requireOptionalNativeModule, type NativeModule } from "expo";

/**
 * The upload service's native half (modules/pokket-upload): an Android
 * foreground service that runs for as long as files are uploading.
 *
 * Without one, Android may kill an app in the background, or cut its network,
 * in the middle of a large file. It also keeps JS's timers running while the
 * service is up: React Native pauses them in the background, and what follows
 * the bytes (finishing the store, making the file, the next file) is JS. iOS
 * has its own background upload session, and this module is absent there.
 *
 * Callers go through `lib/share/uploadService.ts`, which treats a missing
 * module as "nothing to do".
 */
declare class PokketUploadModule extends NativeModule {
  /** Start the service. Android only allows this while the app is on screen. */
  start(text: string): void;
  /** What the notification says, and how far along it is, from 0 to 1. */
  update(text: string, fraction: number): void;
  /** Stop the service. `summary`, if any, stays behind as a notification of its own. */
  stop(summary: string | null): void;
}

export const uploadNative = requireOptionalNativeModule<PokketUploadModule>("PokketUpload");

/** The headless task the native side holds open to keep the timers running. */
export const UPLOAD_TASK_KEY = "PokketUpload";
