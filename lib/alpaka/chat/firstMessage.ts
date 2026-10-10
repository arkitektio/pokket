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
