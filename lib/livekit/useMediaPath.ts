import * as React from "react";
import type { RoomConnectOptions } from "livekit-client";
import type { MediaPath } from "@/lib/mesh/integration";
import type { LivekitClient } from "./client";

export type MediaPathState =
  | { status: "pending" }
  | { status: "ready"; path: MediaPath; connectOptions: RoomConnectOptions }
  | { status: "error"; error: string };

/** What `LiveKitRoom` connects with on this path: the bridge as ICE server, or nothing extra. */
export const connectOptionsFor = (path: MediaPath): RoomConnectOptions =>
  path.kind === "media-bridge" ? { rtcConfig: path.rtcConfig } : {};

/** How live media travels on this path, in words (Settings → Connection says the same on desktop). */
export const describeMediaPath = (path: MediaPath): string =>
  path.kind === "media-bridge" ? `UDP · media bridge (${path.meshLabel} mesh)` : "UDP · direct";

/**
 * The media path to LiveKit for a room about to be joined (`LivekitClient.mediaPath`): asked
 * once per `attempt`, so a retry asks again (a node restarted since has a new bridge). A room
 * connects only once this is ready: joining without the bridge would leave a mesh-only LiveKit
 * with signalling and no media.
 */
export const useMediaPath = (client: LivekitClient | undefined, attempt = 0): MediaPathState => {
  const [state, setState] = React.useState<MediaPathState>({ status: "pending" });

  React.useEffect(() => {
    if (!client) return;
    let current = true;
    setState({ status: "pending" });
    client
      .mediaPath()
      .then((path) => {
        if (current) setState({ status: "ready", path, connectOptions: connectOptionsFor(path) });
      })
      .catch((error) => {
        if (current) setState({ status: "error", error: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      current = false;
    };
    // One LiveKit per session: the url names it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.url, client?.host, attempt]);

  return state;
};
