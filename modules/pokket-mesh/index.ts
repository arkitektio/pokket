import { requireOptionalNativeModule, type NativeModule } from "expo";

/**
 * The mesh sidecar's native half (modules/pokket-mesh): an in-app Tailscale
 * node per organisation mesh, and a loopback reverse proxy per alias on it.
 *
 * Absent in Expo Go and on the web, and `isAvailable()` is false in a native
 * build made without the gomobile library (`pnpm build:mesh`). Every caller
 * goes through `meshNative()` and treats `null` as "no mesh on this build".
 */

/** Same states as orkestrator's `MeshNodeState`. */
export type MeshNodeState =
  | "stopped"
  | "starting"
  | "needs-login"
  | "needs-machine-auth"
  | "running"
  | "error";

export type MeshPeer = {
  dnsName?: string;
  hostName?: string;
  ips: string[];
  online: boolean;
  expired?: boolean;
  os?: string;
  /** A direct endpoint ("ip:port") once traffic has flowed that way. */
  curAddr?: string;
  /** The DERP relay region traffic goes through, when not direct. */
  relay?: string;
  active?: boolean;
  lastHandshake?: string;
};

/** A full snapshot of one node, re-sent whenever any of it changes. */
export type MeshNodeStatus = {
  id: string;
  state: MeshNodeState;
  magicDnsSuffix?: string;
  tailnetName?: string;
  selfIps?: string[];
  selfDnsName?: string;
  peers?: MeshPeer[];
  /** The backend's own state name, and its health warnings. */
  backendState?: string;
  health?: string[];
  error?: string;
};

type PokketMeshEvents = {
  onStatus: (event: { status: string }) => void;
  onLog: (event: { id: string; message: string }) => void;
};

declare class PokketMeshModule extends NativeModule<PokketMeshEvents> {
  isAvailable(): boolean;
  version(): string | null;
  /** Send tsnet's internal log to logcat / the console (diagnostics only). */
  setVerbose(on: boolean): void;
  /** Join (or rejoin from on-disk state when `authKey` is empty). */
  start(id: string, controlUrl: string, hostname: string, authKey?: string | null): Promise<void>;
  /** The 127.0.0.1 port that reaches host:port over the mesh. */
  forward(id: string, host: string, port: number, tls: boolean): Promise<number>;
  stop(id: string): Promise<void>;
  /** Stop and delete the node's identity; the next join needs a fresh key. */
  forget(id: string): Promise<void>;
  status(id: string): Promise<string | null>;
  /** Re-hand the device's interfaces to tsnet (Android; a no-op on iOS). */
  refreshNetwork(): Promise<void>;
  /**
   * The node's media bridge, relaying to `hosts` (the media server's, `host` or
   * `host:port`), as JSON (`MeshMediaBridge`): a TURN server on 127.0.0.1 whose
   * traffic goes over the mesh. Absent from a native build made before it.
   */
  mediaBridge?(id: string, hosts: string[]): Promise<string>;
}

/** The media bridge as one ICE server (go/mediabridge.go `mediaBridgeInfo`). */
export type MeshMediaBridge = {
  urls: string[];
  username: string;
  credential: string;
  /** The mesh addresses it relays to. */
  allowed: string[];
};

export const parseMediaBridge = (json: string | null | undefined): MeshMediaBridge | null => {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return parsed &&
      Array.isArray(parsed.urls) &&
      parsed.urls.length > 0 &&
      typeof parsed.username === "string" &&
      typeof parsed.credential === "string"
      ? { urls: parsed.urls, username: parsed.username, credential: parsed.credential, allowed: parsed.allowed ?? [] }
      : null;
  } catch {
    return null;
  }
};

const native = requireOptionalNativeModule<PokketMeshModule>("PokketMesh");

export const meshNative = (): PokketMeshModule | null => {
  try {
    return native?.isAvailable() ? native : null;
  } catch {
    return null;
  }
};

export const parseMeshStatus = (json: string | null | undefined): MeshNodeStatus | null => {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed.id === "string" && typeof parsed.state === "string"
      ? (parsed as MeshNodeStatus)
      : null;
  } catch {
    return null;
  }
};
