/**
 * A replyer is a rekuest action that takes a chat message and returns one.
 * The chat runs it after each message; whatever answers writes its reply into
 * the room itself.
 *
 * Its other arguments (which model, what tone) are its settings: set once in
 * the chat's replyer sheet and remembered on the phone, else those of its
 * last run.
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

/**
 * The arguments a replyer runs with besides the message: its settings as
 * saved on this phone, else those of its last run anywhere.
 */
const settings = (replyer: Replyer, remembered?: Record<string, unknown> | null): Record<string, unknown> => {
  if (remembered) return remembered;
  const args = replyer.latestTask?.args;
  return args && typeof args === "object" && !Array.isArray(args) ? (args as Record<string, unknown>) : {};
};

/** The arguments this replyer needs and has no value for: required, without a default, never set. */
export const missingArgs = (replyer: Replyer, remembered?: Record<string, unknown> | null): string[] => {
  const known = settings(replyer, remembered);
  return replyer.args
    .filter((port) => !isMessagePort(port) && !port.nullable && port.default == null && known[port.key] == null)
    .map((port) => port.key);
};

/** Does it have settings at all: anything to set besides the message? */
export const hasSettings = (replyer: Replyer): boolean => replyer.args.some((port) => !isMessagePort(port));

/** Can it run as it stands? If not, why. */
export const replyerBlocker = (replyer: Replyer, remembered?: Record<string, unknown> | null): string | null => {
  if (!messageKey(replyer)) return "It does not take a message.";
  const missing = missingArgs(replyer, remembered);
  if (missing.length === 0) return null;
  return `Needs settings: ${missing.join(", ")}.`;
};

/** The arguments to assign it with, for one message. Only keys the action declares are sent. */
export const replyerArgs = (replyer: Replyer, messageId: string, remembered?: Record<string, unknown> | null): Record<string, unknown> => {
  const key = messageKey(replyer);
  if (!key) throw new Error(`${replyer.name} does not take a message`);
  const known = settings(replyer, remembered);
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
export const chooseReplyer = <R extends Replyer>(
  replyers: readonly R[],
  chosen: string | null | undefined,
  blocker: (replyer: R) => string | null = replyerBlocker,
): R | null => {
  if (chosen === NO_REPLYER) return null;
  return replyers.find((replyer) => replyer.id === chosen) ?? replyers.find((replyer) => blocker(replyer) === null) ?? null;
};
