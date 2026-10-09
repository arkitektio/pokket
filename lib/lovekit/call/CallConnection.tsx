import { App } from "@/lib/app/App";
import type { LivekitClient } from "@/lib/livekit/client";
import {
  AndroidAudioTypePresets,
  AudioSession,
  LiveKitRoom,
  useConnectionState,
  useRoomContext,
} from "@livekit/react-native";
import { ConnectionState } from "livekit-client";
import * as React from "react";
import { AppState } from "react-native";
import { toast } from "sonner-native";

import { startCallService, stopCallService } from "./callService";
import { callStore, useCallState } from "./store";

/**
 * Hands the connected `Room` to the store, for the page and the bar, and
 * does what a phone asks of a call: the microphone comes on once connected
 * (not through `LiveKitRoom`'s `audio`, whose failure it reports as the
 * connection's), and the camera goes off while pokket is in the background,
 * where neither platform lets it record.
 */
const RoomBridge = ({ audio }: { audio: boolean }) => {
  const room = useRoomContext();
  const connection = useConnectionState(room);
  const connected = connection === ConnectionState.Connected;

  React.useEffect(() => {
    callStore.getState().setRoom(room);
    return () => callStore.getState().setRoom(null);
  }, [room]);

  React.useEffect(() => {
    if (!connected || !audio) return;
    room.localParticipant
      .setMicrophoneEnabled(true)
      .catch(() => toast.error("The microphone could not be started"));
  }, [room, connected, audio]);

  React.useEffect(() => {
    let paused = false;
    const subscription = AppState.addEventListener("change", (state) => {
      const local = room.localParticipant;
      if (state === "background" && local.isCameraEnabled) {
        paused = true;
        void local.setCameraEnabled(false).catch(() => undefined);
      } else if (state === "active" && paused) {
        paused = false;
        void local.setCameraEnabled(true).catch(() => undefined);
      }
    });
    return () => subscription.remove();
  }, [room]);

  return null;
};

/**
 * One connection, from token to hang-up. The audio session and, on Android,
 * the call service (modules/pokket-call) run exactly as long as it does; the
 * room connects only once the session is configured, which LiveKit asks for.
 */
const Connection = ({ token, callId, title }: { token: string; callId: string; title: string }) => {
  // The media server the deployment configured, which lovekit needs but does not own.
  const { url } = App.useService("livekit").client as LivekitClient;
  const audio = useCallState((state) => state.media.audio);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await AudioSession.configureAudio({
          android: { audioTypeOptions: AndroidAudioTypePresets.communication },
          ios: { defaultOutput: "speaker" },
        });
        await AudioSession.startAudioSession();
      } catch (error) {
        console.warn("[calls] the audio session did not start:", error);
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
      void AudioSession.stopAudioSession().catch(() => undefined);
    };
  }, []);

  // Again when the microphone is granted mid-call: the service takes it on.
  React.useEffect(() => {
    startCallService(title, audio);
  }, [title, audio]);
  React.useEffect(() => stopCallService, []);

  if (!ready) return null;

  // Only the connection the store still holds: by the time an old room
  // reports, another call or a rejoin may have replaced it.
  const current = () => {
    const state = callStore.getState();
    return state.call?.id === callId && state.token === token ? state : null;
  };

  return (
    <LiveKitRoom
      token={token}
      serverUrl={url}
      connect
      audio={false}
      video={false}
      onConnected={() => current()?.connected()}
      onDisconnected={() => current()?.fail("The connection was lost")}
      onError={(error) => current()?.fail(error.message)}
      onMediaDeviceFailure={() => toast.error("The camera or microphone could not be started")}
    >
      <RoomBridge audio={audio} />
    </LiveKitRoom>
  );
};

/**
 * The call's LiveKit connection — orkestrator's `CallConnection`. Mounted at
 * the root of the app (`CallHost`), so a call outlives the page it was
 * joined from. Renders nothing; the call page and the bar are its views.
 * Remote audio needs no renderer here: on a phone LiveKit plays it natively.
 */
export const CallConnection = () => {
  const token = useCallState((state) => state.token);
  const call = useCallState((state) => state.call);
  if (!token || !call) return null;
  // Keyed by token: joining another call, or the same one again, is a new
  // connection and never the old one re-pointed.
  return <Connection key={token} token={token} callId={call.id} title={call.title} />;
};
