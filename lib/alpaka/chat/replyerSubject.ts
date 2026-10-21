import type { StructureInput } from "../api/graphql";

/**
 * What a room's replyers are asked about: the structure the conversation is
 * on — orkestrator's `replyerSubject`. A replyer may take it beside the
 * message (`replyer(message, image)`): those are the specific ones, listed
 * first and handed the structure.
 */

type Attached = { attachedStructures: readonly StructureInput[]; createdAt: string };

/**
 * The structure the next reply is about: what is staged in the composer, else
 * what the latest message carried, else what the room was opened about.
 * `messages` in any order; the latest by `createdAt` (ISO-8601) wins.
 */
export const replyerSubject = ({
  staged,
  messages,
  about,
}: {
  staged: readonly StructureInput[];
  messages: readonly Attached[];
  about: readonly StructureInput[];
}): StructureInput | null => {
  if (staged.length > 0) return staged[0];
  let latest: Attached | undefined;
  for (const message of messages) {
    if (message.attachedStructures.length === 0) continue;
    if (!latest || message.createdAt > latest.createdAt) latest = message;
  }
  return latest?.attachedStructures[0] ?? about[0] ?? null;
};

/** Alpaka's numeric id as rekuest's wire form takes a structure. */
export const subjectWire = (subject: StructureInput) => ({
  __identifier: subject.identifier,
  object: String(subject.object),
});

/** Same structure: one subject replacing another only re-renders when it differs. */
export const sameSubject = (a: StructureInput | null, b: StructureInput | null): boolean =>
  a === b || (!!a && !!b && a.identifier === b.identifier && a.object === b.object);
