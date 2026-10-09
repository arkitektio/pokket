import { callNative } from "@/modules/pokket-call";

/**
 * The Android service that keeps a call going in the background
 * (modules/pokket-call). On iOS, and on a build made before the module
 * existed, there is none and these do nothing: the call still works while
 * pokket is on screen.
 *
 * It must start while the app is in the foreground, which it is: a call is
 * joined by a tap.
 */
export const startCallService = (title: string, microphone: boolean) => {
  try {
    callNative?.start(title, microphone);
  } catch (error) {
    console.warn("[calls] the call service did not start:", error);
  }
};

export const stopCallService = () => {
  try {
    callNative?.stop();
  } catch (error) {
    console.warn("[calls] the call service did not stop:", error);
  }
};
