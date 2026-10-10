import { structurePage } from "../lovekit/call/structures";
import { NOT_HERE_PATH } from "./desktopPaths";

/**
 * A smartlink — orkestrator's `core/links/smartLink.ts`. One object, named
 * the way every service names it (`identifier` + `id`) rather than by either
 * app's route to it, inside one organization and hub. Kontrol, a deployment's
 * front door, serves `https://<frontend>/smartlink/<org>/<hub>/<identifier>/<id>`
 * and hands it to the app as `orkestrator://smart/<org>/<hub>/<identifier>/<id>`.
 */
export type SmartLink = {
  /** The organization's slug. */
  org: string;
  /** lok's id of the hub. Untrusted: kontrol does not check it belongs to `org`. */
  hub: string;
  identifier: string;
  id: string;
};

/** The first path segment of a smartlink; never a page of the app. */
export const SMART_LINK_NAMESPACE = "smart";

/** Names whoever shared the link. For kontrol's page only: the app drops it. */
const SHARER_PARAM = "user_id";

const decode = (segment: string): string | null => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
};

/**
 * Read a smartlink off a path. Split on `/` FIRST, then decode each segment:
 * `@mikro/image` travels as one segment (`%40mikro%2Fimage`), and decoding
 * before splitting would break it in two. An identifier written with literal
 * slashes is accepted too: everything between the hub and the id is it.
 */
export const parseSmartPath = (pathname: string): SmartLink | null => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.shift() !== SMART_LINK_NAMESPACE || segments.length < 4) return null;
  const decoded = segments.map(decode);
  if (decoded.some((segment) => !segment)) return null;
  const [org, hub, ...rest] = decoded as string[];
  const id = rest.pop()!;
  const identifier = rest.join("/");
  return identifier.startsWith("@") ? { org, hub, identifier, id } : null;
};

/**
 * The phone's page for the object, with the link's query minus the sharer.
 * An object the phone has no page for leads to the page that says so.
 */
export const smartLinkPage = ({ identifier, id }: SmartLink, query = ""): string => {
  const page = structurePage(identifier, id);
  if (!page) return `${NOT_HERE_PATH}?path=${encodeURIComponent(`${identifier}/${id}`)}`;
  const kept = query
    .split("&")
    .filter((pair) => pair && pair.split("=")[0] !== SHARER_PARAM)
    .join("&");
  return kept ? `${page}?${kept}` : page;
};
