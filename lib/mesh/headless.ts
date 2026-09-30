import { AppState } from "react-native";
import type { Alias } from "@/lib/arkitekt/fakts/faktsSchema";
import { meshNative, parseMeshStatus } from "@/modules/pokket-mesh";
import { nodeHostname } from "./hostname";
import type { ProfileMesh } from "./record";
import { ensureStatusSubscription, setNodeStatus, waitForRunning } from "./status";

/**
 * One alias reached through an organization's mesh, outside the app's own
 * mesh integration (lib/mesh/integration.ts) — for work the OS starts in the
 * background, with no provider or login in memory (the timeline backup).
 *
 * The node rejoins from its state on disk, so no key is needed. A node that
 * is already up (the app's, while it sits in the background) is used as it
 * is and left running; one this route started is stopped again on release.
 */
export type MeshRoute = {
  /** The loopback stand-in to build clients against. */
  alias: Alias;
  /** Let the node go, if this route started it. */
  release: () => Promise<void>;
};

/** How long a node gets to come up; background work has minutes, not seconds. */
const DEFAULT_TIMEOUT_MS = 60_000;

/** Null when this build has no mesh, or the node did not come up. */
export const openMeshRoute = async (
  mesh: ProfileMesh,
  alias: Alias,
  { timeoutMs = DEFAULT_TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<MeshRoute | null> => {
  const native = meshNative();
  if (!native) return null;
  ensureStatusSubscription();

  // A fresh JS context has seen no status events: ask the node itself.
  const current = parseMeshStatus(await native.status(mesh.id));
  if (current) setNodeStatus(current);
  const wasUp = !!current && current.state !== "stopped";

  if (!wasUp) {
    // Android: tsnet needs the device's interfaces handed over first.
    await native.refreshNetwork().catch(() => undefined);
    await native.start(mesh.id, mesh.controlUrl, nodeHostname(), null);
  }
  if (current?.state !== "running" && !(await waitForRunning(mesh.id, { timeoutMs }))) {
    if (!wasUp) await native.stop(mesh.id).catch(() => undefined);
    return null;
  }

  const port = await native.forward(mesh.id, alias.host, alias.port ?? 0, alias.ssl);
  let released = false;
  return {
    // Plain HTTP to the loopback proxy; it speaks TLS to the alias itself.
    alias: { ...alias, host: "127.0.0.1", port, ssl: false },
    release: async () => {
      if (released) return;
      released = true;
      // Came to the foreground meanwhile: the app's integration may be using
      // it now, and its resume handler takes care of a node either way.
      if (wasUp || AppState.currentState === "active") return;
      await native.stop(mesh.id).catch(() => undefined);
    },
  };
};
