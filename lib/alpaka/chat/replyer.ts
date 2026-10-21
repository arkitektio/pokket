import type { StructureInput } from "../api/graphql";
import { subjectWire } from "./replyerSubject";

/**
 * A replyer is a rekuest action that takes a chat message and returns one.
 * The chat runs it after each message; whatever answers writes its reply into
 * the room itself.
 *
 * Its other arguments (which model, what tone) are its settings: set once in
 * the chat's replyer sheet and remembered on the phone, else those of its
 * last run. A specific replyer also takes the structure the room is about
 * (`replyerSubject`): the chat fills that one, never its settings.
 */
export const MESSAGE_IDENTIFIER = "@alpaka/message";

type Subject = Pick<StructureInput, "identifier"> | null | undefined;

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

/** The argument it takes the subject in: a structure of its kind, never the message. */
export const subjectKey = (replyer: Replyer, subject: Subject): string | null => {
  if (!subject) return null;
  const message = messageKey(replyer);
  return (
    replyer.args.find((port) => port.key !== message && port.kind === "STRUCTURE" && port.identifier === subject.identifier)?.key ??
    null
  );
};

/** Does it take the subject: one of the replyers made for this kind of structure? */
export const isSpecific = (replyer: Replyer, subject: Subject): boolean => subjectKey(replyer, subject) !== null;

/** The specific replyers first, each group in its own order. */
export const bySubject = <R extends Replyer>(replyers: readonly R[], subject: Subject): R[] =>
  subject
    ? [...replyers.filter((replyer) => isSpecific(replyer, subject)), ...replyers.filter((replyer) => !isSpecific(replyer, subject))]
    : [...replyers];

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
export const missingArgs = (replyer: Replyer, remembered?: Record<string, unknown> | null, subject?: Subject): string[] => {
  const known = settings(replyer, remembered);
  const about = subjectKey(replyer, subject);
  return replyer.args
    .filter((port) => !isMessagePort(port) && port.key !== about && !port.nullable && port.default == null && known[port.key] == null)
    .map((port) => port.key);
};

/** Does it have settings at all: anything to set besides the message and the subject? */
export const hasSettings = (replyer: Replyer, subject?: Subject): boolean => {
  const about = subjectKey(replyer, subject);
  return replyer.args.some((port) => !isMessagePort(port) && port.key !== about);
};

/** Can it run as it stands? If not, why. */
export const replyerBlocker = (replyer: Replyer, remembered?: Record<string, unknown> | null, subject?: Subject): string | null => {
  if (!messageKey(replyer)) return "It does not take a message.";
  const missing = missingArgs(replyer, remembered, subject);
  if (missing.length === 0) return null;
  return `Needs settings: ${missing.join(", ")}.`;
};

/**
 * The arguments to assign it with, for one message, and the subject when it
 * takes one. Only keys the action declares are sent.
 */
export const replyerArgs = (
  replyer: Replyer,
  messageId: string,
  remembered?: Record<string, unknown> | null,
  subject?: StructureInput | null,
): Record<string, unknown> => {
  const key = messageKey(replyer);
  if (!key) throw new Error(`${replyer.name} does not take a message`);
  const known = settings(replyer, remembered);
  const args: Record<string, unknown> = {};
  for (const port of replyer.args) {
    if (port.key in known) args[port.key] = known[port.key];
  }
  args[key] = { __identifier: MESSAGE_IDENTIFIER, object: messageId };
  const about = subjectKey(replyer, subject);
  if (about && subject) args[about] = subjectWire(subject);
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
