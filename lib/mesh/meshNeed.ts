import type { ActiveFakts } from "@/lib/arkitekt/fakts/faktsSchema";
import { controlDomain, isMeshLiteral, normalizeHost } from "./classify";
import type { ProfileMesh } from "./record";

/**
 * Does this host live on the mesh?
 *
 * When it is pinned to it, sits under the control server's domain or the
 * node's MagicDNS suffix, or is a mesh literal (100.64/10, the tailnet IPv6
 * range, `*.ts.net`). A bare single label does NOT count: in practice that
 * is a docker or LAN hostname, and counting it would route every compose
 * deployment through the mesh. (Same rules as orkestrator's `meshNeed.ts`.)
 */
export const onMesh = (rawHost: string, mesh: ProfileMesh): boolean => {
  const host = normalizeHost(rawHost);
  if (mesh.hosts.map(normalizeHost).includes(host)) return true;
  const domain = controlDomain(mesh.controlUrl);
  if (domain && host.endsWith(`.${domain}`)) return true;
  const suffix = mesh.magicDnsSuffix ? normalizeHost(mesh.magicDnsSuffix) : undefined;
  if (suffix && (host === suffix || host.endsWith(`.${suffix}`))) return true;
  return isMeshLiteral(host);
};

/** The session's addresses that go through this mesh, deduplicated, in fakts order. */
export const meshAliases = (fakts: ActiveFakts | undefined, mesh: ProfileMesh | undefined): string[] => {
  if (!fakts || !mesh) return [];
  const hosts = [
    ...Object.values(fakts.instances).flatMap((instance) => instance.aliases.map((alias) => alias.host)),
    fakts.self.alias.host,
  ];
  return [...new Set(hosts.map(normalizeHost).filter((host) => onMesh(host, mesh)))];
};

/**
 * Only a session with an address on the mesh needs the node running;
 * otherwise it would sit there on every launch buying nothing.
 */
export const meshNeeded = (fakts: ActiveFakts | undefined, mesh: ProfileMesh | undefined): boolean =>
  meshAliases(fakts, mesh).length > 0;
