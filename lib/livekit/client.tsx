import { mesh, type MediaPath } from "@/lib/mesh/integration";

export type LivekitClient = {
  /** Where signalling goes: a loopback forward when LiveKit is on the mesh. */
  url: string;
  /** LiveKit's own host (the fakts' alias), what decides how media travels. */
  host: string;
  /**
   * How media reaches LiveKit from this phone: direct, or the mesh's media
   * bridge when LiveKit is only on the mesh. Asked before every join, never
   * kept: a bridge goes with the node that ran it. Throws a `MediaBridgeError`
   * when LiveKit is on the mesh and no bridge can be had.
   */
  mediaPath: () => Promise<MediaPath>;
};

export type LivekitConfig = {
  url: string;
  host: string;
};

export const createLivekitClient = (config: LivekitConfig): LivekitClient => {
  return {
    url: config.url,
    host: config.host,
    mediaPath: () => mesh.mediaPathFor(config.host),
  };
};
