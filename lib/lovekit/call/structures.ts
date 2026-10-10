/**
 * The objects a call can be about that pokket has a page for.
 *
 * Orkestrator asks its smart registry for an object's name and page; pokket
 * has no registry, so the few it knows are this one table. It is read both
 * ways: a call's topic to the page that shows it ("Talking about"), and the
 * page on show to the object a call can be started about (`CallAboutButton`).
 */
type StructureKind = {
  identifier: string;
  name: string;
  /** The detail page is this followed by the id. */
  prefix: string;
  /** A call can be started about it from its page. */
  callable: boolean;
};

const KINDS: readonly StructureKind[] = [
  { identifier: "@rekuest/task", name: "Task", prefix: "/tasks/", callable: true },
  { identifier: "@rekuest/action", name: "Action", prefix: "/actions/", callable: false },
  { identifier: "@bank/transaction", name: "Transaction", prefix: "/bank/transaction/", callable: true },
  { identifier: "@kuvert/thread", name: "Thread", prefix: "/mail/thread/", callable: true },
  { identifier: "@lovekit/solo_broadcast", name: "Broadcast", prefix: "/solo-broadcast/", callable: true },
  { identifier: "@lovekit/call", name: "Call", prefix: "/calls/", callable: false },
  { identifier: "@mikro/arraydataset", name: "Dataset", prefix: "/mikro/arraydatasets/", callable: true },
  { identifier: "@mikro/lens", name: "Lens", prefix: "/mikro/lenses/", callable: true },
  { identifier: "@mikro/folder", name: "Folder", prefix: "/mikro/folders/", callable: true },
  { identifier: "@mikro/file", name: "File", prefix: "/mikro/files/", callable: true },
  { identifier: "@mikro/scene", name: "Scene", prefix: "/mikro/scenes/", callable: true },
  { identifier: "@mikro/tabledataset", name: "Table", prefix: "/mikro/tabledatasets/", callable: true },
  { identifier: "@mikro/chart", name: "Chart", prefix: "/mikro/charts/", callable: true },
  { identifier: "@mikro/annotation", name: "Annotation", prefix: "/mikro/annotations/", callable: true },
  { identifier: "@alpaka/room", name: "Chat", prefix: "/alpaka/rooms/", callable: false },
];

export type CallStructure = { identifier: string; object: number };

const kindOf = (identifier: string) => KINDS.find((kind) => kind.identifier === identifier);

/** "Task"; for something pokket does not know, its identifier's last word. */
export const structureKindName = (identifier: string): string =>
  kindOf(identifier)?.name ?? identifier.split("/").pop() ?? identifier;

/** "Task 42". */
export const structureLabel = ({ identifier, object }: CallStructure): string =>
  `${structureKindName(identifier)} ${object}`;

/** The page that shows it, when pokket has one. */
export const structureRoute = ({ identifier, object }: CallStructure): string | null => {
  const kind = kindOf(identifier);
  return kind ? `${kind.prefix}${object}` : null;
};

/**
 * The object the page at `pathname` shows, if a call can be about it: one of
 * the pages above, with the whole-number id lovekit asks for.
 */
export const structureForRoute = (pathname: string): (CallStructure & { label: string }) | null => {
  for (const kind of KINDS) {
    if (!kind.callable || !pathname.startsWith(kind.prefix)) continue;
    const rest = pathname.slice(kind.prefix.length);
    if (!/^\d+$/.test(rest)) continue;
    const structure = { identifier: kind.identifier, object: Number(rest) };
    return { ...structure, label: structureLabel(structure) };
  }
  return null;
};

/**
 * The object the page at `pathname` shows, whether or not a call can be about
 * it: what an action can be run on.
 */
export const objectForRoute = (pathname: string): CallStructure | null => {
  for (const kind of KINDS) {
    if (!pathname.startsWith(kind.prefix)) continue;
    const rest = pathname.slice(kind.prefix.length);
    if (/^\d+$/.test(rest)) return { identifier: kind.identifier, object: Number(rest) };
  }
  return null;
};
