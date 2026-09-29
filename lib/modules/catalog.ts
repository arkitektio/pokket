import { VIEW_META } from "../bank/viewMeta";
import { MAILBOX_META } from "../kuvert/mailboxMeta";

/**
 * pokket's modules as plain data — orkestrator's `defineModule` +
 * `NavLinkDecl` (core/modules/host/define.ts). The sidebar draws its grid and
 * each module's links from this, and the search palette its "Go to" and
 * "Pages". Icons are names, resolved in `registry.ts`, so this file (and the
 * tabs and search that use it) stays free of UI.
 */
export type NavLinkDecl = {
  label: string;
  /** pathname, optionally with a query (`/mail?box=unread`). */
  route: string;
  /** Search-only words. */
  keywords?: readonly string[];
  /** Heading among the module's links; first appearance sets the order. */
  group?: string;
  /** One line under the label; a group whose links have none renders as chips. */
  description?: string;
  icon?: string;
  /** The module's landing page: the links' header, not a row. */
  home?: boolean;
};

export type ModuleDecl = {
  key: string;
  label: string;
  icon: string;
  /** The fakts service it needs; absent for modules of the device itself. */
  serviceKey?: string;
  /** Where "Open ›" goes when no link is marked `home`. */
  route: string;
  navLinks: NavLinkDecl[];
};

const MAILBOX_ICONS: Record<string, string> = { inbox: "inbox", unread: "mail-open", flagged: "flag", sent: "send" };
const VIEW_ICONS: Record<string, string> = { recent: "receipt", spends: "trending-down", income: "trending-up" };

export const MODULE_CATALOG: ModuleDecl[] = [
  { key: "home", label: "Home", icon: "home", route: "/", navLinks: [] },
  {
    key: "mail",
    label: "Mail",
    icon: "mail",
    serviceKey: "kuvert",
    route: "/mail",
    navLinks: [
      { label: "All Inboxes", route: "/mail", home: true, keywords: MAILBOX_META[0].keywords },
      ...MAILBOX_META.filter((box) => box.key !== "inbox").map((box) => ({
        label: box.label,
        route: `/mail?box=${box.key}`,
        group: "Mail",
        icon: MAILBOX_ICONS[box.key],
        keywords: box.keywords,
      })),
    ],
  },
  {
    key: "bank",
    label: "Bank",
    icon: "landmark",
    serviceKey: "bank",
    route: "/bank",
    navLinks: [
      { label: "Overview", route: "/bank", home: true, keywords: ["money", "accounts", "balance"] },
      ...VIEW_META.map((view) => ({
        label: view.label,
        route: `/bank?view=${view.key}`,
        group: "Explore",
        icon: VIEW_ICONS[view.key],
        description: view.description,
        keywords: ["bank", "money", "transactions", ...view.keywords],
      })),
    ],
  },
  {
    key: "tasks",
    label: "Tasks",
    icon: "list-checks",
    serviceKey: "rekuest",
    route: "/tasks",
    navLinks: [{ label: "Tasks", route: "/tasks", home: true, keywords: ["rekuest", "jobs", "assignations"] }],
  },
  {
    key: "broadcasts",
    label: "Broadcasts",
    icon: "radio",
    serviceKey: "lovekit",
    route: "/broadcasts",
    navLinks: [
      { label: "Broadcasts", route: "/broadcasts", home: true, keywords: ["live", "stream", "video"] },
      {
        label: "Start solo broadcast",
        route: "/solo-broadcast/start",
        group: "Live",
        icon: "radio-tower",
        description: "Stream this phone's camera",
        keywords: ["camera", "stream", "go live"],
      },
    ],
  },
  {
    key: "notifications",
    label: "Notifications",
    icon: "bell",
    route: "/notifications",
    navLinks: [{ label: "Notifications", route: "/notifications", home: true, keywords: ["alerts"] }],
  },
  {
    key: "device",
    label: "Device",
    icon: "smartphone",
    route: "/wifi",
    navLinks: [
      { label: "Wi-Fi profiles", route: "/wifi", group: "Wi-Fi", keywords: ["network", "wlan"] },
      { label: "Eduroam", route: "/wifi/eduroam", group: "Wi-Fi", keywords: ["university", "wifi"] },
      { label: "Standard Wi-Fi", route: "/wifi/standard", group: "Wi-Fi", keywords: ["wpa", "wifi"] },
      {
        label: "Provision",
        route: "/provision",
        group: "Setup",
        icon: "bluetooth",
        description: "Set up a device over Bluetooth",
        keywords: ["bluetooth", "ble", "device"],
      },
      {
        label: "Mesh",
        route: "/mesh",
        group: "Setup",
        icon: "network",
        description: "The organization's private network",
        keywords: ["tailscale", "vpn", "tailnet"],
      },
    ],
  },
  {
    key: "timeline",
    label: "Timeline",
    icon: "route",
    route: "/timeline",
    navLinks: [
      {
        label: "Timeline",
        route: "/timeline",
        home: true,
        keywords: ["location", "places", "trips", "history", "map", "gps"],
      },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: "settings",
    route: "/settings",
    navLinks: [
      {
        label: "Settings",
        route: "/settings",
        home: true,
        keywords: ["preferences", "push", "notifications", "permissions", "location"],
      },
    ],
  },
  {
    key: "debug",
    label: "Debug",
    icon: "bug",
    route: "/debug",
    navLinks: [{ label: "Debug", route: "/debug", home: true, keywords: ["logs", "errors", "diagnostics"] }],
  },
];

export const moduleByKey = (key: string) => MODULE_CATALOG.find((m) => m.key === key);

/** The pathname of a route, without its query. */
export const pathOf = (route: string) => route.split("?")[0] || "/";

/** The query of a route as a record (`/mail?box=unread` → `{ box: "unread" }`). */
export const queryOf = (route: string): Record<string, string> => {
  const query = route.split("?")[1];
  if (!query) return {};
  return Object.fromEntries(
    query
      .split("&")
      .filter(Boolean)
      .map((pair) => {
        const [k, v = ""] = pair.split("=");
        return [decodeURIComponent(k), decodeURIComponent(v)];
      }),
  );
};

/** A route from a pathname and its params (expo-router's search params). */
export const routeOf = (pathname: string, params: Record<string, string | string[] | undefined>): string => {
  const query = Object.entries(params)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1] !== "")
    // Dynamic segments (`[id]`) come as params too; only real query params stay.
    .filter(([key, value]) => !pathname.split("/").includes(value) || key === "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  return query ? `${pathname}?${query}` : pathname;
};

/** Which module a page belongs to: the longest route prefix, else Home. */
export const moduleForPath = <M extends ModuleDecl>(pathname: string, modules: readonly M[]): M | undefined => {
  let best: M | undefined;
  let bestLength = -1;
  for (const module of modules) {
    for (const route of [module.route, ...module.navLinks.map((l) => l.route)]) {
      const path = pathOf(route);
      const matches = path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);
      if (matches && path.length > bestLength) {
        best = module;
        bestLength = path.length;
      }
    }
  }
  return best ?? modules.find((m) => m.key === "home");
};

/** The query params a module's links switch on, e.g. `box` for Mail. */
export const linkParams = (module: Pick<ModuleDecl, "navLinks">): string[] => [
  ...new Set(module.navLinks.flatMap((link) => Object.keys(queryOf(link.route)))),
];

/**
 * Is `route` the page on show? Its path must match and every param it names
 * too; a link without a query only matches while none of its siblings'
 * params is set (so "All Inboxes" is not lit while "Unread" is shown).
 */
export const isRouteActive = (
  route: string,
  pathname: string,
  params: Record<string, string | string[] | undefined>,
  siblingParams: string[] = [],
): boolean => {
  if (pathOf(route) !== pathname) return false;
  const query = queryOf(route);
  const keys = Object.keys(query);
  if (keys.length === 0) return siblingParams.every((key) => !params[key]);
  return keys.every((key) => params[key] === query[key]);
};

/** A label for a route, good enough until its page reports a title. */
export const labelForRoute = (route: string): string => {
  const path = pathOf(route);
  for (const module of MODULE_CATALOG) {
    const link = module.navLinks.find((l) => l.route === route);
    if (link) return link.home || link.label === module.label ? module.label : `${module.label} · ${link.label}`;
  }
  if (path === "/") return "Home";
  const module = moduleForPath(path, MODULE_CATALOG);
  if (module && module.key !== "home") return module.label;
  const segment = path.split("/").filter(Boolean)[0] ?? "";
  return segment ? segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ") : "Home";
};
