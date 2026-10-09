/**
 * What an event of lovekit's `callInvites` subscription does to the list of
 * invitations ringing on this device. Returns the list it was given when the
 * event changes nothing, so the cache is not written for no reason.
 */
export const applyInviteEvent = <T extends { id: string }>(
  current: readonly T[],
  event: { create?: T | null; delete?: string | null } | null | undefined,
): readonly T[] => {
  if (!event) return current;
  if (event.delete) {
    return current.some((invite) => invite.id === event.delete)
      ? current.filter((invite) => invite.id !== event.delete)
      : current;
  }
  const created = event.create;
  if (created && !current.some((invite) => invite.id === created.id)) return [created, ...current];
  return current;
};
