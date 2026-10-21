import { roomRoute } from "@/components/alpaka/RoomRow";
import { structureKindName } from "@/lib/lovekit/call/structures";
import { showDetail } from "@/lib/navigation";
import { useCallback, useState } from "react";

import { type StructureInput, useCreateRoomMutation } from "../api/graphql";
import { leaveDraft } from "./firstMessage";
import { saveTalkingAbout } from "./talkingAbout";

export type TalkableStructure = StructureInput & { label: string };

/** "Talk about Task 42". */
export const talkTitle = (structure: TalkableStructure): string => `Talk about ${structure.label}`;

/** What the room's composer waits with: a question about the thing, to send or rewrite. */
export const talkOpener = (structure: Pick<StructureInput, "identifier">): string =>
  `Please tell me more about this ${structureKindName(structure.identifier).toLowerCase()}.`;

/**
 * "Talk about this" — orkestrator's `useTalkAbout`: starts an Alpaka room
 * about a structure and lands in it, the structure staged on its first
 * message and a question waiting in the composer. Remembers what the room is
 * about, so its replyers are asked about it.
 *
 * Alpaka GraphQL: the caller must only mount where the organization has alpaka.
 */
export const useTalkAbout = () => {
  const [createRoom] = useCreateRoomMutation({ refetchQueries: ["RecentRooms"] });
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const talk = useCallback(
    async (structure: TalkableStructure) => {
      const about: StructureInput[] = [{ identifier: structure.identifier, object: structure.object }];
      setOpening(true);
      setError(null);
      try {
        const result = await createRoom({
          variables: {
            input: {
              title: talkTitle(structure),
              description: `Conversation about ${structure.label}`,
              talkingAbout: about,
            },
          },
        });
        const room = result.data?.createRoom;
        if (!room) throw new Error("The chat was not created");
        // Kept before the room opens: it reads what it is about as it mounts.
        await saveTalkingAbout(room.id, about).catch(() => undefined);
        leaveDraft(room.id, talkOpener(structure));
        showDetail(roomRoute(room.id));
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Could not start the chat");
      } finally {
        setOpening(false);
      }
    },
    [createRoom],
  );

  return { talk, opening, error };
};
