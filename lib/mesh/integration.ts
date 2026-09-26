import * as Device from "expo-device";
import { AppState } from "react-native";
import type { FaktsEndpoint } from "@/lib/arkitekt/fakts/endpointSchema";
import type { ActiveFakts, Alias } from "@/lib/arkitekt/fakts/faktsSchema";
import type { GrantedMesh } from "@/lib/arkitekt/fakts/meshGrant";
import type { AliasRouter, MeshIntegration } from "@/lib/arkitekt/types";
import { meshNative } from "@/modules/pokket-mesh";
import { meshNeeded, onMesh } from "./meshNeed";
import {
  loadMeshRecord,
  meshFromGrant,
  normalizeBaseUrl,
  writeMeshRecord,
  type MeshRecord,
  type ProfileMesh,
} from "./record";
import { ensureStatusSubscription, nodeStatus, onNodeStatus, waitForRunning } from "./status";

/**
 * pokket's side of the organisation mesh, handed to the arkitekt provider.
 *
 *  - A login to a deployment whose `.well-known/fakts` names a mesh asks lok
 *    for a one-shot key, unless the mesh is switched off (Mesh screen).
 *  - If the approver allows it, the key comes back with the tokens; the node
 *    joins with it at once, and the record keeps the mesh — never the key.
 *  - From then on the node rejoins from its own state whenever the session's
 *    fakts put an alias on the mesh.
 *  - Aliases on the mesh are reached through a loopback reverse proxy per
 *    alias (`forward`), which is what service clients are built against.
 *
 * Nothing here opens a sign-in page, and no failure here fails a login: the
 * provider calls every hook best-effort.
 */

/** How long a check of a mesh alias waits for the node to come up. */
const PREPARE_TIMEOUT_MS = 15_000;
/** How long a node that is not needed runs after joining, to register itself. */
const JOIN_AND_PARK_TIMEOUT_MS = 30_000;

const aliasKey = (alias: Alias) => `${alias.host}|${alias.port ?? 0}|${alias.ssl}`;

/** A DNS-safe node name, e.g. `pokket-pixel-8`. */
const nodeHostname = (): string => {
  const device = (Device.deviceName || Device.modelName || "device")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `pokket-${device || "device"}`.slice(0, 63).replace(/-+$/, "");
};

export type MeshController = MeshIntegration & {
  /** The current record, for the Mesh screen. */
  record: () => MeshRecord | null;
  subscribeRecord: (listener: () => void) => () => void;
  /** The Mesh screen's switch. */
  setEnabled: (enabled: boolean, fakts?: ActiveFakts) => Promise<void>;
};

export const createMeshIntegration = (): MeshController => {
  ensureStatusSubscription();
  let record: MeshRecord | null = null;
  const loaded = loadMeshRecord().then((stored) => {
    record = stored;
    recordListeners.forEach((listener) => listener());
  });

  /** alias key → the loopback stand-in currently serving it. */
  const forwards = new Map<string, { alias: Alias; standIn: Alias }>();
  const routeListeners = new Set<() => void>();
  const recordListeners = new Set<() => void>();

  const notifyRoutes = () => routeListeners.forEach((listener) => listener());

  const saveRecord = async (next: MeshRecord | null) => {
    record = next;
    recordListeners.forEach((listener) => listener());
    await writeMeshRecord(next);
  };

  const activeMesh = (): ProfileMesh | undefined =>
    record?.mesh.enabled && meshNative() ? record.mesh : undefined;

  const start = async (mesh: ProfileMesh, authKey?: string) => {
    const native = meshNative();
    if (!native) return;
    ensureStatusSubscription();
    await native.start(mesh.id, mesh.controlUrl, nodeHostname(), authKey ?? null);
  };

  const stop = async (mesh: ProfileMesh) => {
    forwards.clear();
    await meshNative()?.stop(mesh.id);
  };

  /** Leave the mesh for good: the node's identity goes with it. */
  const forget = async () => {
    const previous = record;
    forwards.clear();
    if (previous) await meshNative()?.forget(previous.mesh.id);
    await saveRecord(null);
  };

  /** Join with the one-shot key, then let the node go once it ran (or gave up). */
  const joinAndPark = async (mesh: ProfileMesh, authKey: string) => {
    await start(mesh, authKey);
    await waitForRunning(mesh.id, { timeoutMs: JOIN_AND_PARK_TIMEOUT_MS });
    // Only park it if nothing started needing it in the meantime.
    if (forwards.size === 0) await meshNative()?.stop(mesh.id);
  };

  // Keep what the running node teaches us (its MagicDNS suffix makes short
  // names count as on-mesh), and tell the provider when a node comes up, so
  // services waiting on it are re-checked.
  let lastState: Record<string, string> = {};
  onNodeStatus((status) => {
    const was = lastState[status.id];
    lastState = { ...lastState, [status.id]: status.state };
    if (!record || record.mesh.id !== status.id) return;
    if (status.magicDnsSuffix && status.magicDnsSuffix !== record.mesh.magicDnsSuffix) {
      void saveRecord({ ...record, mesh: { ...record.mesh, magicDnsSuffix: status.magicDnsSuffix } });
    }
    if (status.state === "running" && was !== undefined && was !== "running") notifyRoutes();
  });

  // Coming back from the background: tsnet may have lost its sockets (iOS
  // reclaims them), and the network may be a different one. Re-hand the
  // interfaces, restart a node that went away and re-bind the forwards; the
  // provider re-checks the mesh services when anything moved.
  AppState.addEventListener("change", (state) => {
    if (state !== "active") return;
    const mesh = activeMesh();
    const native = meshNative();
    if (!mesh || !native || forwards.size === 0) return;
    void (async () => {
      try {
        await native.refreshNetwork();
        if (nodeStatus(mesh.id)?.state !== "running") await start(mesh);
        let moved = false;
        for (const [key, entry] of forwards) {
          const port = await native.forward(mesh.id, entry.alias.host, entry.alias.port ?? 0, entry.alias.ssl);
          if (port !== entry.standIn.port) {
            forwards.set(key, { alias: entry.alias, standIn: { ...entry.standIn, port } });
            moved = true;
          }
        }
        if (moved) notifyRoutes();
      } catch (error) {
        console.warn("[mesh] resume failed:", error);
      }
    })();
  });

  const router: AliasRouter = {
    isRouted: (alias) => {
      const mesh = activeMesh();
      return !!mesh && onMesh(alias.host, mesh);
    },

    prepare: async (alias, controller) => {
      await loaded;
      const mesh = activeMesh();
      const native = meshNative();
      if (!mesh || !native || !onMesh(alias.host, mesh)) return alias;

      if (nodeStatus(mesh.id)?.state !== "running") {
        await start(mesh);
        const up = await waitForRunning(mesh.id, { timeoutMs: PREPARE_TIMEOUT_MS, signal: controller.signal });
        if (!up) return null;
      }

      const port = await native.forward(mesh.id, alias.host, alias.port ?? 0, alias.ssl);
      // The app speaks plain HTTP to the loopback proxy; the proxy speaks TLS
      // to the alias when it is https, with the alias' own name.
      const standIn: Alias = { ...alias, host: "127.0.0.1", port, ssl: false };
      forwards.set(aliasKey(alias), { alias, standIn });
      return standIn;
    },

    resolve: (alias) => forwards.get(aliasKey(alias))?.standIn ?? alias,
  };

  return {
    router,

    record: () => record,

    subscribeRecord: (listener) => {
      recordListeners.add(listener);
      return () => recordListeners.delete(listener);
    },

    wantsKey: (endpoint: FaktsEndpoint) => {
      if (!meshNative() || !endpoint.mesh_coord_url) return false;
      // The switch belongs to the deployment it was flipped for.
      if (record && normalizeBaseUrl(record.baseUrl) === normalizeBaseUrl(endpoint.base_url)) {
        return record.mesh.enabled;
      }
      return true;
    },

    onGrant: async ({ endpoint, fakts, granted }: { endpoint: FaktsEndpoint; fakts: ActiveFakts; granted?: GrantedMesh }) => {
      await loaded;
      const baseUrl = endpoint.base_url;
      const sameDeployment = !!record && normalizeBaseUrl(record.baseUrl) === normalizeBaseUrl(baseUrl);
      // A different deployment's node must not carry over into this session.
      if (record && !sameDeployment) await forget();

      const previous = sameDeployment ? record?.mesh : undefined;
      const mesh = meshFromGrant(endpoint, granted, previous);

      if (mesh && granted) {
        // Another control server means another node: drop the old identity.
        if (previous && previous.id !== mesh.id) await meshNative()?.forget(previous.id);
        await saveRecord({ baseUrl, mesh });
        if (!mesh.enabled) return;
        // A node still up (say, one whose membership lapsed) would ignore the
        // new key: start is idempotent. Restart it so the key is applied.
        if (nodeStatus(mesh.id) && nodeStatus(mesh.id)?.state !== "stopped") await stop(mesh);
        if (meshNeeded(fakts, mesh)) {
          // Joining now; the alias checks wait for it to come up.
          await start(mesh, granted.authKey);
        } else {
          // Not needed yet, but the key is one-shot: register the node now so
          // the day an alias moves onto the mesh needs no new sign-in.
          void joinAndPark(mesh, granted.authKey).catch((error) =>
            console.warn("[mesh] join-and-park failed:", error),
          );
        }
        return;
      }

      // No key this time (not asked, not granted): a node that joined earlier
      // may still get in from its own state.
      if (previous?.enabled && meshNeeded(fakts, previous)) await start(previous);
    },

    onRestore: async ({ endpoint, fakts }) => {
      await loaded;
      if (!record || normalizeBaseUrl(record.baseUrl) !== normalizeBaseUrl(endpoint.base_url)) return;
      const mesh = activeMesh();
      if (!mesh) return;
      if (meshNeeded(fakts, mesh)) {
        // Don't wait: the checks of mesh aliases do.
        await start(mesh);
      } else if (forwards.size > 0 || nodeStatus(mesh.id)?.state === "running") {
        await stop(mesh);
      }
    },

    onDisconnect: async () => {
      await loaded;
      await forget();
    },

    subscribe: (listener) => {
      routeListeners.add(listener);
      return () => routeListeners.delete(listener);
    },

    setEnabled: async (enabled, fakts) => {
      await loaded;
      if (!record) return;
      const mesh = { ...record.mesh, enabled };
      await saveRecord({ ...record, mesh });
      if (!meshNative()) return;
      if (enabled) {
        if (meshNeeded(fakts, mesh)) await start(mesh);
      } else {
        await stop(mesh);
      }
      notifyRoutes();
    },
  };
};

/** The app's one mesh integration. */
export const mesh = createMeshIntegration();
