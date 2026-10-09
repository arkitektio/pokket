/**
 * Who is in a call, for someone who is not: one name per person. One person
 * may be in from two devices; they are one name with a count.
 */
export const participantNames = (participants: readonly { identity: string; name?: string | null }[]): string[] => {
  const devices = new Map<string, number>();
  for (const participant of participants) {
    const name = participant.name || participant.identity;
    devices.set(name, (devices.get(name) ?? 0) + 1);
  }
  return [...devices].map(([name, count]) => (count > 1 ? `${name} (${count} devices)` : name));
};

/** The lobby's one line about them. */
export const lobbyLine = (names: readonly string[]): string => {
  if (names.length === 0) return "Nobody is in the call yet";
  if (names.length === 1) return `${names[0]} is in the call`;
  return `${names.length} in the call: ${names.join(", ")}`;
};

/** Minutes and seconds since `since`, for the call's clock. */
export const callClock = (since: number, now: number): string => {
  const total = Math.max(0, Math.floor((now - since) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

/** Two letters for a tile or a row without a picture. */
export const initials = (name: string): string =>
  name
    .split(/[\s._@-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
