import { desktopPrefixes } from "../lovekit/call/structures";

/**
 * Links shared from the desktop app. It answers to the same `orkestrator://`
 * scheme and shares `arkitekt.live/deeplink?orkestrator=<path>`, so such a
 * link opens the phone app too, naming a page by the desktop's path. Most
 * services are laid out differently there (`/rekuest/tasks/5` is `/tasks/5`
 * here), and much of the desktop has no page on the phone at all.
 */
export const NOT_HERE_PATH = "/not-here";

/** A service's front page on the desktop, and the phone page that stands for it. */
const HOMES: Record<string, string> = {
  rekuest: "/tasks",
  kuvert: "/mail",
  lovekit: "/calls",
  lokate: "/lokate",
};

/** Desktop modules the phone has nothing for, or lays out under another name (see HOMES and the kinds table). */
const DESKTOP_ONLY = new Set(["rekuest", "kuvert", "lovekit", "lokate", "fluss", "kabinet", "kraph", "lok", "elektro", "omeroark", "omero_ark", "dokuments"]);

/**
 * Modules both apps call the same. Their sub-pages are the same too, for the
 * ones the phone has; the rest only exist on the desktop.
 */
const SHARED: Record<string, readonly string[]> = {
  mikro: ["arraydatasets", "lenses", "folders", "files", "scenes", "tabledatasets", "charts", "annotations"],
  alpaka: ["rooms"],
  bank: ["transaction"],
};

const notHere = (path: string) => `${NOT_HERE_PATH}?path=${encodeURIComponent(path)}`;

/**
 * The phone's path for a path a desktop link names. A path that is already a
 * phone path (someone typed `orkestrator://tasks`) passes through; one the
 * phone has no page for leads to the page that says so.
 */
export const fromDesktopPath = (path: string): string => {
  const [pathname, query] = path.split(/\?(.*)/s);
  const withQuery = (to: string) => (query ? `${to}?${query}` : to);
  const segments = pathname.split("/").filter(Boolean);
  const [module, section] = segments;
  if (!module) return path;

  for (const { desktop, phone } of desktopPrefixes()) {
    if (pathname.startsWith(desktop) && /^\d+$/.test(pathname.slice(desktop.length))) {
      return withQuery(phone + pathname.slice(desktop.length));
    }
  }

  if (module in SHARED) {
    return !section || SHARED[module].includes(section) ? path : notHere(path);
  }
  if (DESKTOP_ONLY.has(module)) {
    // Its front page (also `/rekuest/home`, as the desktop names it) has a stand-in; anything deeper does not.
    const front = segments.length === 1 || (segments.length === 2 && section === "home");
    return front && HOMES[module] ? HOMES[module] : notHere(path);
  }
  return path;
};
