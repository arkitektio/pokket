import { DEFAULT_AGENT_NAME } from "./agentName";

type Agent = { name?: string | null; user?: { id: string; preferredUsername?: string | null } | null };
type Me = { id: string; username?: string | null };

/**
 * Is this message mine? Orkestrator asks whether the agent is named
 * `default`, the name every app joins a room under, which also claims what
 * other people wrote from their apps. Here it has to be my agent: the user
 * behind it is me, by id, or by name where the two services number their
 * users differently.
 *
 * Before we know who we are, `default` is all there is to go on.
 */
export const isOwnMessage = (agent: Agent | null | undefined, me: Me | null | undefined): boolean => {
  if (!agent) return false;
  if (!me) return agent.name === DEFAULT_AGENT_NAME;
  if (!agent.user) return false;
  if (agent.user.id === me.id) return true;
  return agent.name === DEFAULT_AGENT_NAME && !!me.username && agent.user.preferredUsername === me.username;
};

/** Messages oldest first; the room hands them over in no promised order. */
export const byCreation = <T extends { createdAt: string }>(messages: readonly T[]): T[] =>
  [...messages].sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));

/** `14:05` for a message's corner. */
export const messageTime = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};
