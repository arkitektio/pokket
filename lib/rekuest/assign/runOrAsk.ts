/**
 * Running an action on the object on show: orkestrator's rule for its "Run"
 * rows (`rekuest/smart/actions.tsx`). The object goes into the action's first
 * argument. If that is all the action takes, it runs at once; if it takes
 * anything else, its form opens with the object already filled in.
 */
export type ObjectRef = { identifier: string; object: string | number };

type Arg = { key: string; kind: string; identifier?: string | null };

/** The first argument filled with the object, or null when the action's first argument is not such an object. */
export const objectArgs = (args: readonly Arg[], on: ObjectRef): Record<string, unknown> | null => {
  const first = args[0];
  if (!first || first.kind !== "STRUCTURE" || first.identifier !== on.identifier) return null;
  return { [first.key]: { __identifier: on.identifier, object: String(on.object) } };
};

export type RunDecision =
  | { kind: "run"; args: Record<string, unknown> }
  | { kind: "ask"; args: Record<string, unknown>; hidden: string[] }
  | { kind: "unfit" };

export const runOrAsk = (args: readonly Arg[], on: ObjectRef): RunDecision => {
  const filled = objectArgs(args, on);
  if (!filled) return { kind: "unfit" };
  return args.length === 1 ? { kind: "run", args: filled } : { kind: "ask", args: filled, hidden: Object.keys(filled) };
};

/** `@mikro/arraydataset:7` in a route, and back. The id may itself hold a colon; the identifier never does. */
export const formatOn = (on: ObjectRef): string => `${on.identifier}:${on.object}`;

export const parseOn = (param: string | null | undefined): ObjectRef | null => {
  if (!param) return null;
  const at = param.indexOf(":");
  if (at <= 0 || at === param.length - 1) return null;
  return { identifier: param.slice(0, at), object: param.slice(at + 1) };
};

/** The route of an action's form, optionally started on an object or from a task's arguments. */
export const actionRoute = (id: string, from?: { on?: ObjectRef; task?: string }): string => {
  const query = [
    from?.on ? `on=${encodeURIComponent(formatOn(from.on))}` : "",
    from?.task ? `task=${encodeURIComponent(from.task)}` : "",
  ].filter(Boolean);
  return `/actions/${id}${query.length ? `?${query.join("&")}` : ""}`;
};
