import { requireOptionalNativeModule, type NativeModule } from "expo";

/**
 * The call service's native half (modules/pokket-call): an Android
 * foreground service that runs for as long as a call does.
 *
 * Android stops an app's microphone and, soon after, the app itself once it
 * is in the background, unless a foreground service of the right type says
 * what it is doing. LiveKit ships none for calls (only one for sharing the
 * screen), so this is it. iOS needs no counterpart: the `audio` background
 * mode in app.json is enough there, and this module is absent.
 *
 * Callers go through `lib/lovekit/call/callService.ts`, which treats a
 * missing module as "nothing to do".
 */
declare class PokketCallModule extends NativeModule {
  /**
   * Start the service, or update the one running. `microphone` says whether
   * the call records: Android refuses a microphone service to an app that
   * was not granted the microphone.
   */
  start(title: string, microphone: boolean): void;
  stop(): void;
}

export const callNative = requireOptionalNativeModule<PokketCallModule>("PokketCall");
