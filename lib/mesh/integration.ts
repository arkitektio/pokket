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
  writeMeshRecord,
  type MeshRecord,
  type ProfileMesh,
} from "./record";
import { ensureStatusSubscription, nodeStatus, onNodeStatus, waitForRunning } from "./status";

/**
 * pokket's side of the organisation mesh, handed to the arkitekt provider.
 *
 * The mesh is conditional, and per login: a login uses it only when its hub
 * exposes one — the deployment's `.well-known/fakts` names a control server
 * and lok granted this login a node — and only while some alias needs it.
 *
 *  - A login to a deployment that names a mesh asks lok for a one-shot key,
 *    unless that login's mesh is switched off (Mesh screen).
 *  - If the approver allows it, the key comes back with the tokens; the node
 *    joins with it at once, and the login's profile keeps the mesh — never
 *    the key. The provider stores it (`onGrant` returns it).
 *  - From then on the node rejoins from its own state whenever the active
 *    login's fakts put an alias on the mesh.
 *  - Switching to another login stops this login's node but keeps its state,
 *    so switching back rejoins without a key; a login with no mesh runs none.
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
  /** The active login's mesh, for the Mesh screen; null when it has none. */
  record: () => MeshRecord | null;
  subscribeRecord: (listener: () => void) => () => void;
  /** The Mesh screen's switch. */
  setEnabled: (enabled: boolean, fakts?: ActiveFakts) => Promise<void>;
};

export const createMeshIntegration = (): MeshController => {
  ensureStatusSubscription();
  /** The ACTIVE login's mesh; every other login's node is stopped. */
  let record: MeshRecord | null = null;
  /** Where changes to a login's mesh (switch, learned suffix) are kept: its profile. */
  let persist: ((mesh: ProfileMesh) => void) | undefined;

  /** alias key → the loopback stand-in currently serving it. */
  const forwards = new Map<string, { alias: Alias; standIn: Alias }>();
  const routeListeners = new Set<() => void>();
  const recordListeners = new Set<() => void>();

  const notifyRoutes = () => routeListeners.forEach((listener) => listener());

  const notifyRecord = () => recordListeners.forEach((listener) => listener());

  /** The active login's mesh changed: tell the Mesh screen, and its profile. */
  const saveRecord = (next: MeshRecord) => {
    record = next;
    notifyRecord();
    persist?.(next.mesh);
  };

  const activeMesh = (): ProfileMesh | undefined =>
    record?.mesh.enabled && meshNative() ? record.mesh : undefined;

  /**
   * Nodes this process started and has not stopped. Status events arrive
   * asynchronously, so a node started a moment ago may not report yet; this
   * is what makes a quick switch away still stop it.
   */
  const started = new Set<string>();

  const start = async (mesh: ProfileMesh, authKey?: string) => {
    const native = meshNative();
    if (!native) return;
    ensureStatusSubscription();
    started.add(mesh.id);
    await native.start(mesh.id, mesh.controlUrl, nodeHostname(), authKey ?? null);
  };

  const stop = async (mesh: ProfileMesh) => {
    forwards.clear();
    started.delete(mesh.id);
    await meshNative()?.stop(mesh.id);
  };

  const isUp = (mesh: ProfileMesh) => {
    const state = nodeStatus(mesh.id)?.state;
    return started.has(mesh.id) || (state !== undefined && state !== "stopped");
  };

  /**
   * Make `next` the active login's mesh. Another login's node is stopped —
   * not forgotten: its state on disk is how switching back rejoins with no
   * key. Its forwards go with it, so routes change.
   */
  const activate = async (next: MeshRecord | null) => {
    const previous = record;
    record = next;
    notifyRecord();
    if (previous && previous.mesh.id !== next?.mesh.id) {
      const hadRoutes = forwards.size > 0;
      forwards.clear();
      if (isUp(previous.mesh)) await stop(previous.mesh);
      if (hadRoutes) notifyRoutes();
    }
  };

  /** Join with the one-shot key, then let the node go once it ran (or gave up). */
  const joinAndPark = async (mesh: ProfileMesh, authKey: string) => {
    await start(mesh, authKey);
    await waitForRunning(mesh.id, { timeoutMs: JOIN_AND_PARK_TIMEOUT_MS });
    // Only park it if nothing started needing it in the meantime.
    if (forwards.size === 0 && record?.mesh.id === mesh.id) await stop(mesh);
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
      saveRecord({ ...record, mesh: { ...record.mesh, magicDnsSuffix: status.magicDnsSuffix } });
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

    // One forward serves every alias on the same host, port and TLS — services
    // behind one gateway differ only by path. So the stand-in lends its port,
    // and the alias keeps its own path, id and challenge: handing back the
    // stored stand-in whole would send one service's queries to whichever
    // service was prepared first on that host.
    resolve: (alias) => {
      const entry = forwards.get(aliasKey(alias));
      return entry ? { ...alias, host: entry.standIn.host, port: entry.standIn.port, ssl: false } : alias;
    },
  };

  return {
    router,

    record: () => record,

    subscribeRecord: (listener) => {
      recordListeners.add(listener);
      return () => recordListeners.delete(listener);
    },

    bind: (listener) => {
      persist = listener;
    },

    takeLegacy: async () => {
      const legacy = await loadMeshRecord();
      if (legacy) await writeMeshRecord(null);
      return legacy;
    },

    wantsKey: (endpoint: FaktsEndpoint, mesh?: ProfileMesh) => {
      // No control server named: this hub exposes no mesh, so none is asked for.
      if (!meshNative() || !endpoint.mesh_coord_url) return false;
      // The switch belongs to the login it was flipped for.
      return mesh?.enabled ?? true;
    },

    onGrant: async ({ endpoint, fakts, granted, previous }) => {
      const baseUrl = endpoint.base_url;
      const mesh = meshFromGrant(endpoint, granted, previous);

      if (mesh && granted) {
        // Another control server means another node: drop the old identity.
        if (previous && previous.id !== mesh.id) await meshNative()?.forget(previous.id);
        await activate({ baseUrl, mesh });
        if (!mesh.enabled) return mesh;
        // A node still up (say, one whose membership lapsed) would ignore the
        // new key: start is idempotent. Restart it so the key is applied.
        if (isUp(mesh)) await stop(mesh);
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
        return mesh;
      }

      // No key this time (not asked, not granted): a node this login joined
      // earlier may still get in from its own state.
      await activate(previous ? { baseUrl, mesh: previous } : null);
      if (previous?.enabled && meshNeeded(fakts, previous)) await start(previous);
      return previous;
    },

    onRestore: async ({ endpoint, fakts, mesh: profileMesh }) => {
      await activate(profileMesh ? { baseUrl: endpoint.base_url, mesh: profileMesh } : null);
      const mesh = activeMesh();
      if (!mesh) {
        // Switched off: nothing of it may keep running.
        if (profileMesh && isUp(profileMesh)) await stop(profileMesh);
        return;
      }
      if (meshNeeded(fakts, mesh)) {
        // Don't wait: the checks of mesh aliases do.
        await start(mesh);
      } else if (forwards.size > 0 || nodeStatus(mesh.id)?.state === "running") {
        await stop(mesh);
      }
    },

    onPark: async () => {
      await activate(null);
    },

    onDisconnect: async (mesh) => {
      const target = mesh ?? record?.mesh;
      if (record && (!mesh || record.mesh.id === mesh.id)) {
        forwards.clear();
        record = null;
        notifyRecord();
        notifyRoutes();
      }
      if (target) {
        started.delete(target.id);
        await meshNative()?.forget(target.id);
      }
    },

    subscribe: (listener) => {
      routeListeners.add(listener);
      return () => routeListeners.delete(listener);
    },

    setEnabled: async (enabled, fakts) => {
      if (!record) return;
      const mesh = { ...record.mesh, enabled };
      saveRecord({ ...record, mesh });
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
