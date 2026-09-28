import { useSyncExternalStore } from "react";
import { meshNative, parseMeshStatus, type MeshNodeStatus } from "@/modules/pokket-mesh";

/**
 * The live picture of every mesh node, fed by the sidecar's status events
 * (full snapshots, so the latest one per node is the whole truth), plus a
 * short tail of its log lines for the Mesh screen.
 */

export type MeshLogLine = { id: string; message: string; at: number };

type Snapshot = {
  nodes: Record<string, MeshNodeStatus>;
  logs: MeshLogLine[];
};

const MAX_LOGS = 50;

let snapshot: Snapshot = { nodes: {}, logs: [] };
const listeners = new Set<() => void>();
const statusListeners = new Set<(status: MeshNodeStatus) => void>();

const publish = (next: Snapshot) => {
  snapshot = next;
  listeners.forEach((listener) => listener());
};

export const setNodeStatus = (status: MeshNodeStatus) => {
  publish({ ...snapshot, nodes: { ...snapshot.nodes, [status.id]: status } });
  statusListeners.forEach((listener) => listener(status));
};

let subscribed = false;

/** Start listening to the native module; idempotent, and a no-op without it. */
export const ensureStatusSubscription = () => {
  if (subscribed) return;
  const native = meshNative();
  if (!native) return;
  subscribed = true;
  native.addListener("onStatus", ({ status }) => {
    const parsed = parseMeshStatus(status);
    if (parsed) setNodeStatus(parsed);
  });
  native.addListener("onLog", ({ id, message }) => {
    if (!message) return;
    const logs = [...snapshot.logs, { id, message, at: Date.now() }].slice(-MAX_LOGS);
    publish({ ...snapshot, logs });
  });
};

export const nodeStatus = (id: string): MeshNodeStatus | undefined => snapshot.nodes[id];

/** Every status snapshot as it arrives, for the integration's own bookkeeping. */
export const onNodeStatus = (listener: (status: MeshNodeStatus) => void): (() => void) => {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
};

export const useMeshSnapshot = (): Snapshot =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => snapshot,
  );

/** States a node does not leave by itself: waiting on them is pointless. */
const STUCK = new Set(["needs-login", "needs-machine-auth", "error"]);

/** Grace for a node that reports a stuck state while its key is still being applied. */
const STUCK_GRACE_MS = 3000;

/**
 * Wait until a node runs. Resolves false when it gives up: the timeout, an
 * abort, or a state it will not leave by itself (seen past a short grace, as
 * a node starting with a fresh key may briefly report needs-login).
 */
export const waitForRunning = (
  id: string,
  { timeoutMs = 15_000, signal }: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<boolean> =>
  new Promise((resolve) => {
    const startedAt = Date.now();
    let done = false;
    let unsubscribe = () => {};
    const finish = (value: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      clearInterval(poll);
      unsubscribe();
      signal?.removeEventListener("abort", onAbort);
      resolve(value);
    };
    const check = () => {
      const state = snapshot.nodes[id]?.state;
      if (state === "running") finish(true);
      else if (state && STUCK.has(state) && Date.now() - startedAt > STUCK_GRACE_MS) finish(false);
    };
    const onAbort = () => finish(false);
    const timer = setTimeout(() => finish(false), timeoutMs);
    // Re-check a stuck state once the grace has passed, even without a new event.
    const poll = setInterval(check, 1000);
    signal?.addEventListener("abort", onAbort);
    listeners.add(check);
    unsubscribe = () => listeners.delete(check);
    check();
  });
