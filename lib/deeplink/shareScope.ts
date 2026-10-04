import { normalizeBaseUrl, StoredProfile } from "../arkitekt/fakts/profileStorageSchema";

/**
 * Where a shared link's object lives — orkestrator's `shareScope.ts`, for
 * pokket.
 *
 * `5` in `/bank/transaction/5` is not a global name: it means one transaction
 * in one organization on one coord server, and another one on the next
 * deployment. A link that carried only the path would not fail in the wrong
 * organization, it would quietly open the wrong thing. So a link carries its
 * scope, and the receiving app refuses to guess.
 *
 * Deliberately NOT the user: a colleague opening the link is a different user
 * of the same organization.
 */
export type ShareScope = {
  /** `endpoint.base_url`, normalized — the coord server. */
  baseUrl: string;
  /** lok organization id; null on deployments with no organization concept. */
  org: string | null;
  /**
   * lok hub id. Pokket's profiles do not record one, so its own links leave
   * it out; it is read (and compared only when both sides name one) so that a
   * link in orkestrator's shape still parses.
   */
  hub: string | null;
};

/** What a scoped link is addressed to: the gate, not a page. */
export const SHARE_GATE_PATH = "/open";

const normalizeScope = (scope: ShareScope): ShareScope => ({
  baseUrl: normalizeBaseUrl(scope.baseUrl),
  org: scope.org ?? null,
  hub: scope.hub ?? null,
});

const encodeQuery = (pairs: [string, string | null][]) =>
  pairs
    .filter((pair): pair is [string, string] => !!pair[1])
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

/** A query as a record; `+` is a space, as `URLSearchParams` (orkestrator's encoder) writes it. */
export const decodeQuery = (query: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const pair of query.replace(/^\?/, "").split("&")) {
    if (!pair) continue;
    const at = pair.indexOf("=");
    const [key, value] = at < 0 ? [pair, ""] : [pair.slice(0, at), pair.slice(at + 1)];
    try {
      out[decodeURIComponent(key.replace(/\+/g, " "))] = decodeURIComponent(value.replace(/\+/g, " "));
    } catch {
      // A pair that is not valid percent-encoding says nothing.
    }
  }
  return out;
};

/**
 * The gate location for a scoped link. The target path is one encoded
 * parameter, so the page's own query cannot collide with the scope's.
 */
export const encodeShareScope = (scope: ShareScope, path: string): string => {
  const { baseUrl, org, hub } = normalizeScope(scope);
  return `${SHARE_GATE_PATH}?${encodeQuery([["to", baseUrl], ["org", org], ["hub", hub], ["path", path]])}`;
};

/** The same, with the scope reduced to a digest that names no host. */
export const encodeOpaqueScope = (digest: string, path: string): string =>
  `${SHARE_GATE_PATH}?${encodeQuery([["s", digest], ["path", path]])}`;

/**
 * What a link asks for: a path to land on, and where. `scope` and `digest`
 * are both null for a portable link, which opens wherever the app is.
 */
export type ShareRequest = {
  scope: ShareScope | null;
  digest: string | null;
  path: string;
};

/** Root screens a link must not reach: the gate itself, and the ones outside the app frame. */
const CLOSED_TO_LINKS = new Set(["open", "login", "search", "mesh-selftest"]);

/**
 * A link's target as an app path: exactly one leading slash (so `//host/x`
 * can never be read as somewhere else), and not a screen closed to links.
 */
export const normalizeLinkPath = (path: string): string | null => {
  const clean = "/" + path.trim().replace(/^\/+/, "");
  const first = clean.slice(1).split(/[/?#]/)[0];
  return CLOSED_TO_LINKS.has(first) ? null : clean;
};

/** The request in a gate link's query; null when it names no page, or no place. */
export const decodeShareRequest = (search: string): ShareRequest | null => {
  const params = decodeQuery(search);
  const path = params.path ? normalizeLinkPath(params.path) : null;
  if (!path) return null;

  if (params.s) return { scope: null, digest: params.s, path };
  if (!params.to) return null;

  return {
    scope: normalizeScope({ baseUrl: params.to, org: params.org || null, hub: params.hub || null }),
    digest: null,
    path,
  };
};

/**
 * The scope as one string, for hashing. JSON, so a missing component cannot
 * be confused with one whose value looks like a placeholder.
 */
export const scopeKey = (scope: ShareScope): string => {
  const { baseUrl, org, hub } = normalizeScope(scope);
  return JSON.stringify([baseUrl, org, hub]);
};

/**
 * Does the link's scope describe this connection? Server and organization
 * must agree; the hub only when BOTH sides name one — silence is "cannot
 * tell", not "different".
 */
export const matchScope = (link: ShareScope, active: ShareScope): boolean => {
  const a = normalizeScope(link);
  const b = normalizeScope(active);
  if (a.baseUrl !== b.baseUrl) return false;
  if (a.org !== b.org) return false;
  if (a.hub !== null && b.hub !== null && a.hub !== b.hub) return false;
  return true;
};

/**
 * The scope a kept login stands for. Read from its stored identity, so a
 * parked profile can be matched against a link without connecting to it.
 */
export const profileScope = (profile: StoredProfile): ShareScope => ({
  baseUrl: profile.identity.baseUrl,
  org: profile.identity.organizationId,
  hub: null,
});
