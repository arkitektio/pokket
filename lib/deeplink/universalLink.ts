import { scopeDigest } from "./digest";
import { encodeOpaqueScope, encodeShareScope, ShareScope } from "./shareScope";

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
