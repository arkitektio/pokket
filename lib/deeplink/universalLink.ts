import { StoredProfile } from "../arkitekt/fakts/profileStorageSchema";
import { objectForRoute } from "../lovekit/call/structures";
import { toDesktopPath } from "./desktopPaths";
import { encodeShareScope, profileScope, ShareScope } from "./shareScope";

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
 * Where a login's links are served. Throws, saying which, when they cannot
 * be: the deployment names no front door, the organization has no slug, or
 * the login has not heard its hub.
 */
export const profileLinkHost = (profile: StoredProfile): LinkHost => {
  const frontendUrl = profile.session.endpoint.frontend_url;
  const slug = profile.label.organizationSlug;
  const hub = profile.identity.hubId;
  if (!frontendUrl) throw new Error("this deployment names no front door for links");
  if (!slug) throw new Error("this organization has no slug to link by");
  if (!hub) throw new Error("this login has not heard its hub yet; reconnect and try again");
  return { frontendUrl, slug, hub, user: profile.identity.userId };
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
 * The link to share for a page, always through the organization's front
 * door: an object is named as itself (a smartlink), a page by the desktop's
 * path, and either opens in the desktop app too. There is no other form to
 * fall back to: what cannot be linked this way throws, saying why.
 */
export const shareLinkFor = (route: string, profile: StoredProfile | null): string => {
  if (!profile) throw new Error("sign in to an organization first");
  const host = profileLinkHost(profile);
  const object = objectForRoute(route.split("?")[0]);
  if (object) return smartLinkFor(host, { identifier: object.identifier, id: String(object.object) });
  const link = orgLinkFor(host, route, profileScope(profile));
  if (!link) throw new Error("this page exists only on the phone");
  return link;
};
