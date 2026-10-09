import { permissions } from "@livekit/react-native-webrtc";

/**
 * The microphone, asked for the way pokket asks for anything: only when the
 * member does the thing that needs it (taps Join), never on its own. The
 * camera is not asked for here: LiveKit asks when the camera is first
 * switched on in a call.
 *
 * Through LiveKit's WebRTC module, which already carries the W3C permission
 * calls for both platforms; nothing else in pokket needs these two.
 */
const MICROPHONE = { name: "microphone" };

/** Is the microphone already granted? Never prompts. */
export const hasMicrophone = async (): Promise<boolean> => {
  try {
    return (await permissions.query(MICROPHONE)) === permissions.RESULT.GRANTED;
  } catch {
    return false;
  }
};

/** Ask for the microphone; the system prompts if it has not been answered. */
export const requestMicrophone = async (): Promise<boolean> => {
  try {
    const answer: unknown = await permissions.request(MICROPHONE);
    return answer === true || answer === permissions.RESULT.GRANTED;
  } catch {
    return false;
  }
};
