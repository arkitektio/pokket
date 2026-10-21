import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StructureInput } from "../api/graphql";

/**
 * What each room was started about, remembered on this phone — orkestrator's
 * `roomTalkingAbout`. Alpaka takes `talkingAbout` when a room is created but
 * does not hand it back, so "Talk about this" keeps it here: the room's first
 * message carries it, and its replyers are asked about it.
 *
 * Pairs of room id and structures, oldest first, as `replyerChoice` keeps its
 * choices: room ids are numbers, and an object orders such keys by value.
 */
export type TalkingAbout = readonly (readonly [room: string, about: readonly StructureInput[]])[];

const KEY = "alpaka-room-talking-about";
/** Rooms pile up; what the oldest were about is let go. */
const MAX_ROOMS = 200;

const isStructure = (value: unknown): value is StructureInput =>
  !!value &&
  typeof value === "object" &&
  typeof (value as StructureInput).identifier === "string" &&
  Number.isInteger((value as StructureInput).object);

export const parseTalkingAbout = (raw: string | null): TalkingAbout => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) =>
      Array.isArray(entry) && entry.length === 2 && typeof entry[0] === "string" && Array.isArray(entry[1])
        ? [[entry[0], entry[1].filter(isStructure)] as const]
        : [],
    );
  } catch {
    return [];
  }
};

export const withTalkingAbout = (all: TalkingAbout, room: string, about: readonly StructureInput[]): TalkingAbout =>
  [...all.filter(([id]) => id !== room), [room, about] as const].slice(-MAX_ROOMS);

export const talkingAboutFor = (all: TalkingAbout, room: string): StructureInput[] => [
  ...(all.find(([id]) => id === room)?.[1] ?? []),
];

type Storage = Pick<typeof AsyncStorage, "getItem" | "setItem">;

export const loadTalkingAbout = async (room: string, storage: Storage = AsyncStorage): Promise<StructureInput[]> =>
  talkingAboutFor(parseTalkingAbout(await storage.getItem(KEY)), room);

export const saveTalkingAbout = async (
  room: string,
  about: readonly StructureInput[],
  storage: Storage = AsyncStorage,
): Promise<void> => {
  if (about.length === 0) return;
  const all = parseTalkingAbout(await storage.getItem(KEY));
  await storage.setItem(KEY, JSON.stringify(withTalkingAbout(all, room, about)));
};

/**
 * What the first message of a room carries: what the room is about, so the
 * replyer knows what is being asked about. Only the opening message — once
 * the room has messages the structure is already in the conversation.
 */
export const firstMessageAttachments = (
  messages: readonly unknown[],
  about: readonly StructureInput[],
): StructureInput[] => (messages.length > 0 ? [] : [...about]);
