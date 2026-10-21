/**
 * The message a room is opened with from the chat home. The home creates the
 * room; the room sends the message, through the same path as any other, so it
 * shows as pending and gets its reply. Held in memory and taken once: a room
 * reopened from its saved tab must not send it again.
 */
const waiting = new Map<string, string>();

export const leaveFirstMessage = (roomId: string, text: string) => {
  waiting.set(roomId, text);
};

export const takeFirstMessage = (roomId: string): string | null => {
  const text = waiting.get(roomId) ?? null;
  waiting.delete(roomId);
  return text;
};

/**
 * The words a room opened from "Talk about this" waits with in its composer:
 * a question about the thing, there to send or rewrite. Not sent for the
 * user, as orkestrator prefills its composer. Taken once, as above.
 */
const drafts = new Map<string, string>();

export const leaveDraft = (roomId: string, text: string) => {
  drafts.set(roomId, text);
};

export const takeDraft = (roomId: string): string | null => {
  const text = drafts.get(roomId) ?? null;
  drafts.delete(roomId);
  return text;
};
