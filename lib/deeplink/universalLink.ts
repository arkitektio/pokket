import { StoredProfile } from "../arkitekt/fakts/profileStorageSchema";
import { objectForRoute } from "../lovekit/call/structures";
import { toDesktopPath } from "./desktopPaths";
import { scopeDigest } from "./digest";
import { encodeOpaqueScope, encodeShareScope, profileScope, ShareScope } from "./shareScope";

/**
 * A link to a page of this app that works from anywhere — orkestrator's
 * universal link, under pokket's own parameter.
 *
 * `arkitekt.live/deeplink` hands the path to the installed app
 * (`pokket://…`), so the same URL can go in a chat or an email. Pages here
 * show one organization's things, so a link is SCOPED by default: see
 * `shareScope.ts` and the gate that receives it.
 */
export const UNIVERSAL_LINK_BASE = "https://arkitekt.live/deeplink";
export const UNIVERSAL_LINK_PARAM = "pokket";
export const APP_SCHEME = "pokket";

const wrap = (path: string): string => `${UNIVERSAL_LINK_BASE}?${UNIVERSAL_LINK_PARAM}=${encodeURIComponent(path)}`;

/** A portable link: no scope, opens in whatever organization the app is on. */
export const universalLinkFor = (route: string): string => wrap(route);

/** A link to a page as it exists in ONE organization. */
export const scopedLinkFor = (route: string, scope: ShareScope): string => wrap(encodeShareScope(scope, route));

/** The same, with the deployment and organization hashed away. */
export const privateLinkFor = async (route: string, scope: ShareScope): Promise<string> =>
  wrap(encodeOpaqueScope(await scopeDigest(scope), route));

/**
 * Where an organization's links are served: kontrol, the deployment's own
 * front door (`frontend_url` in lok's `/.well-known/fakts`). It walks whoever
 * opens one through signing in, joining the organization and installing an
 * app, then hands the link to the app the organization opens links with: the
 * desktop's on a computer, this one on a phone. These are the forms the
 * desktop copies too (its `core/links/LINKS.md`).
 */
export type LinkHost = {
  frontendUrl: string;
  /** The organization's slug. */
  slug: string;
  /** lok's id of the hub. */
  hub: string;
  /** lok's id of whoever shares the link; kontrol shows them as the sharer. */
  user?: string | null;
};

/** The app kontrol's page links are addressed to. The phone answers to its scheme, and reads its paths. */
const DESKTOP_APP = "orkestrator";
const SHARER_PARAM = "user_id";

/**
 * Where a login's links are served, or null when they cannot be: the
 * deployment names no front door, the organization has no slug, or the login
 * has not heard its slug or hub yet.
 */
export const profileLinkHost = (profile: StoredProfile): LinkHost | null => {
  const frontendUrl = profile.session.endpoint.frontend_url;
  const slug = profile.label.organizationSlug;
  const hub = profile.identity.hubId;
  return frontendUrl && slug && hub ? { frontendUrl, slug, hub, user: profile.identity.userId } : null;
};

const origin = (host: LinkHost) => host.frontendUrl.replace(/\/+$/, "");

const withSharer = (link: string, host: LinkHost): string =>
  host.user ? `${link}${link.includes("?") ? "&" : "?"}${SHARER_PARAM}=${encodeURIComponent(host.user)}` : link;

/**
 * A link to one object, named by identifier and id rather than by an app's
 * route to it (`<frontend>/smartlink/<org>/<hub>/<identifier>/<id>`), so the
 * desktop and the phone each open their own page for it. The identifier is
 * one encoded segment. Arrives back as `…://smart/…` (`smartLink.ts`).
 */
export const smartLinkFor = (host: LinkHost, structure: { identifier: string; id: string }): string =>
  withSharer(
    [origin(host), "smartlink", ...[host.slug, host.hub, structure.identifier, structure.id].map(encodeURIComponent)].join("/"),
    host,
  );

/**
 * A link to a page inside one organization
 * (`<frontend>/deeplink/<org>/orkestrator/open?…`): the `/open` gate, with
 * the page named the desktop's way so that either app can open it. Null for
 * a page only the phone has, which the desktop could not show.
 */
export const orgLinkFor = (host: LinkHost, route: string, scope: ShareScope): string | null => {
  const path = toDesktopPath(route);
  if (!path) return null;
  return withSharer(
    `${origin(host)}/deeplink/${encodeURIComponent(host.slug)}/${DESKTOP_APP}/${encodeShareScope(scope, path).replace(/^\/+/, "")}`,
    host,
  );
};

/**
 * The link to share for a page. Through the organization's front door when
 * it has one: an object is named as itself (a smartlink), a page both apps
 * have by the desktop's path, and either opens in the desktop app too. A
 * page only the phone has, or a login whose links kontrol cannot serve,
 * keeps the arkitekt.live form that opens this app.
 */
export const shareLinkFor = (route: string, profile: StoredProfile | null): string => {
  if (!profile) return universalLinkFor(route);
  const scope = profileScope(profile);
  const host = profileLinkHost(profile);
  if (host) {
    const object = objectForRoute(route.split("?")[0]);
    if (object) return smartLinkFor(host, { identifier: object.identifier, id: String(object.object) });
    const link = orgLinkFor(host, route, scope);
    if (link) return link;
  }
  return scopedLinkFor(route, scope);
};
