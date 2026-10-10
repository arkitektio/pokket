import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Which replyer each room uses, remembered on this phone: pairs of room id
 * and action id (or "none"), oldest use first. Pairs and not a map: room ids
 * are numbers, and an object orders such keys by value, not by use.
 */
export type ReplyerChoices = readonly (readonly [room: string, replyer: string])[];

const KEY = "alpaka-room-replyer";
/** Rooms pile up; the choices of the oldest are let go. */
const MAX_ROOMS = 200;

export const withChoice = (choices: ReplyerChoices, room: string, replyer: string): ReplyerChoices =>
  [...choices.filter(([id]) => id !== room), [room, replyer] as const].slice(-MAX_ROOMS);

export const choiceFor = (choices: ReplyerChoices, room: string): string | null =>
  choices.find(([id]) => id === room)?.[1] ?? null;

export const parseChoices = (raw: string | null): ReplyerChoices => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    // The first version stored a map; its entries are read once and rewritten as pairs.
    const entries: unknown[] = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" ? Object.entries(parsed) : [];
    return entries.filter(
      (entry): entry is [string, string] =>
        Array.isArray(entry) && entry.length === 2 && typeof entry[0] === "string" && typeof entry[1] === "string",
    );
  } catch {
    return [];
  }
};

type Storage = Pick<typeof AsyncStorage, "getItem" | "setItem">;

export const loadChoice = async (room: string, storage: Storage = AsyncStorage): Promise<string | null> =>
  choiceFor(parseChoices(await storage.getItem(KEY)), room);

export const saveChoice = async (room: string, replyer: string, storage: Storage = AsyncStorage): Promise<void> => {
  const choices = parseChoices(await storage.getItem(KEY));
  await storage.setItem(KEY, JSON.stringify(withChoice(choices, room, replyer)));
};
