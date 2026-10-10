/**
 * A replyer is a rekuest action that takes a chat message and returns one.
 * The chat runs it after each message; whatever answers writes its reply into
 * the room itself.
 *
 * Orkestrator shows a form for the replyer's other arguments. Pokket has no
 * such form, so it runs a replyer with the arguments of its last run.
 */
export const MESSAGE_IDENTIFIER = "@alpaka/message";

export type ReplyerPort = {
  key: string;
  kind: string;
  identifier?: string | null;
  nullable: boolean;
  default?: unknown;
};

export type Replyer = {
  id: string;
  name: string;
  description?: string | null;
  args: readonly ReplyerPort[];
  latestTask?: { args?: unknown } | null;
};

const isMessagePort = (port: ReplyerPort) => port.kind === "STRUCTURE" && port.identifier === MESSAGE_IDENTIFIER;

/** The argument the message goes into. */
export const messageKey = (replyer: Replyer): string | null => replyer.args.find(isMessagePort)?.key ?? null;

const lastArgs = (replyer: Replyer): Record<string, unknown> => {
  const args = replyer.latestTask?.args;
  return args && typeof args === "object" && !Array.isArray(args) ? (args as Record<string, unknown>) : {};
};

/**
 * The arguments this replyer needs that pokket cannot supply: required, with
 * no default, and not given in its last run.
 */
export const missingArgs = (replyer: Replyer): string[] => {
  const known = lastArgs(replyer);
  return replyer.args
    .filter((port) => !isMessagePort(port) && !port.nullable && port.default == null && known[port.key] == null)
    .map((port) => port.key);
};

/** Can it be run from here? If not, why. */
export const replyerBlocker = (replyer: Replyer): string | null => {
  if (!messageKey(replyer)) return "It does not take a message.";
  const missing = missingArgs(replyer);
  if (missing.length === 0) return null;
  return `Run it once from orkestrator first: it needs ${missing.join(", ")}.`;
};

/** The arguments to assign it with, for one message. Only keys the action declares are sent. */
export const replyerArgs = (replyer: Replyer, messageId: string): Record<string, unknown> => {
  const key = messageKey(replyer);
  if (!key) throw new Error(`${replyer.name} does not take a message`);
  const known = lastArgs(replyer);
  const args: Record<string, unknown> = {};
  for (const port of replyer.args) {
    if (port.key in known) args[port.key] = known[port.key];
  }
  args[key] = { __identifier: MESSAGE_IDENTIFIER, object: messageId };
  return args;
};

/** "none" is a choice too: a room can be a plain message board. */
export const NO_REPLYER = "none";

/**
 * The replyer a room uses: the one chosen for it if it still exists, else the
 * first that can run, as orkestrator picks the first.
 */
export const chooseReplyer = (replyers: readonly Replyer[], chosen: string | null | undefined): Replyer | null => {
  if (chosen === NO_REPLYER) return null;
  return (
    replyers.find((replyer) => replyer.id === chosen) ??
    replyers.find((replyer) => replyerBlocker(replyer) === null) ??
    null
  );
};
