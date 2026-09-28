/**
 * What an alias host looks like, judged from the string alone — the part of
 * orkestrator's connection doctor (`lib/arkitekt/doctor/classify.ts`) and
 * mesh protocol (`main/mesh/protocol.ts`) the mesh routing needs. Pure.
 */

export const normalizeHost = (host: string): string => {
  const trimmed = (host || "").trim().toLowerCase();
  const unbracketed =
    trimmed.startsWith("[") && trimmed.endsWith("]") ? trimmed.slice(1, -1) : trimmed;
  return unbracketed.endsWith(".") ? unbracketed.slice(0, -1) : unbracketed;
};

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/**
 * A tailnet literal: an address in 100.64.0.0/10 (CGNAT, in practice
 * Tailscale) or fd7a:115c:a1e0::/48, or a `*.ts.net` MagicDNS name.
 */
export const isMeshLiteral = (rawHost: string): boolean => {
  const host = normalizeHost(rawHost);
  if (host.includes(":")) return host.startsWith("fd7a:115c:a1e0");
  const match = IPV4.exec(host);
  if (match) {
    const [a, b] = [Number(match[1]), Number(match[2])];
    return a === 100 && b >= 64 && b <= 127;
  }
  return host.endsWith(".ts.net");
};

/**
 * A control URL we may hand the node: https, or http to loopback only (a
 * local ionscale while developing); no credentials, query or fragment.
 */
export const isValidControlUrl = (value: string): boolean => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.username || url.password || url.search || url.hash) return false;
  if (url.protocol === "https:") return true;
  if (url.protocol === "http:") {
    return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  }
  return false;
};

/**
 * The control server's domain, whose strict subdomains are mesh machines
 * (`mikro.mesh.arkitekt.live` under `mesh.arkitekt.live`). Undefined for a
 * single label or an IP, which name no domain.
 */
export const controlDomain = (controlUrl: string): string | undefined => {
  let host: string;
  try {
    host = normalizeHost(new URL(controlUrl).hostname);
  } catch {
    return undefined;
  }
  if (!host.includes(".") || /^[0-9.]+$/.test(host) || host.includes(":")) return undefined;
  return host;
};
