import { fromDesktopPath } from "./desktopPaths";
import { decodeQuery, decodeShareRequest, normalizeLinkPath, SHARE_GATE_PATH, ShareRequest } from "./shareScope";

/**
 * The app's own scheme and wrapper parameter, and the desktop app's, which it
 * answers to as well. A link by the desktop's names a page the desktop's way
 * (`desktopPaths.ts`); one by its own is taken as it is.
 */
const SCHEME = "pokket";
const DESKTOP_SCHEME = "orkestrator";
const UNIVERSAL_HOST = "arkitekt.live";
const UNIVERSAL_PATH = "/deeplink";
const UNIVERSAL_PARAM = "pokket";
const DESKTOP_PARAM = "orkestrator";

/** The same request, its page named the phone's way. */
const translated = (request: ShareRequest | null): ShareRequest | null => {
  if (!request) return null;
  const path = normalizeLinkPath(fromDesktopPath(request.path));
  return path ? { ...request, path } : null;
};

/** What stays with the router: the on-device self-test and the dev client's own links. */
const LEFT_TO_ROUTER = new Set(["mesh-selftest", "expo-development-client"]);

/** `/open?…` is the gate (its query is the request); anything else is a page to open as it is. */
const fromAppPath = (appPath: string): ShareRequest | null => {
  const at = appPath.indexOf("?");
  const pathname = at < 0 ? appPath : appPath.slice(0, at);
  if (pathname.replace(/\/+$/, "") === SHARE_GATE_PATH) return decodeShareRequest(at < 0 ? "" : appPath.slice(at + 1));
  const path = normalizeLinkPath(appPath);
  return path ? { scope: null, digest: null, path } : null;
};

/**
 * The request in a URL the system handed the app, or null when it is not a
 * link to a page (the bare app, the self-test, another scheme).
 *
 * `pokket://bank/x` and `pokket:///bank/x` are the same link: where the
 * slashes fall depends on who wrote it, so leading ones are collapsed. The
 * `arkitekt.live/deeplink?pokket=…` wrapper is read too, for the day the
 * site opens the app directly.
 */
export const parseIncomingLink = (url: string): ShareRequest | null => {
  const match = /^([a-z][a-z0-9+.-]*):\/\/([^#]*)/i.exec(url.trim());
  if (!match) return null;
  const scheme = match[1].toLowerCase();
  const rest = match[2];

  if (scheme === "https") {
    const [location, query = ""] = rest.split("?");
    const [host, ...segments] = location.split("/");
    if (host.toLowerCase() !== UNIVERSAL_HOST) return null;
    if (`/${segments.join("/")}`.replace(/\/+$/, "") !== UNIVERSAL_PATH) return null;
    const params = decodeQuery(query);
    const own = params[UNIVERSAL_PARAM];
    if (own) return fromAppPath("/" + own.replace(/^\/+/, ""));
    const desktop = params[DESKTOP_PARAM];
    return desktop ? translated(fromAppPath("/" + desktop.replace(/^\/+/, ""))) : null;
  }

  if (scheme !== SCHEME && scheme !== DESKTOP_SCHEME) return null;
  const appPath = rest.replace(/^\/+/, "");
  const first = appPath.split(/[/?]/)[0];
  if (!first || LEFT_TO_ROUTER.has(first)) return null;
  const request = fromAppPath("/" + appPath);
  return scheme === DESKTOP_SCHEME ? translated(request) : request;
};
