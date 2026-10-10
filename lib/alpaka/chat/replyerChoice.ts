import AsyncStorage from "@react-native-async-storage/async-storage";

/** Which replyer each room uses, remembered on this phone: room id → action id (or "none"). */
export type ReplyerChoices = Record<string, string>;

const KEY = "alpaka-room-replyer";
/** Rooms pile up; the choices of the oldest are let go. */
const MAX_ROOMS = 200;

export const withChoice = (choices: ReplyerChoices, room: string, replyer: string): ReplyerChoices => {
  // Re-inserted last, so the order of the keys is the order of use.
  const { [room]: _previous, ...rest } = choices;
  const entries = [...Object.entries(rest), [room, replyer] as const];
  return Object.fromEntries(entries.slice(-MAX_ROOMS));
};

export const parseChoices = (raw: string | null): ReplyerChoices => {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  } catch {
    return {};
  }
};

type Storage = Pick<typeof AsyncStorage, "getItem" | "setItem">;

export const loadChoice = async (room: string, storage: Storage = AsyncStorage): Promise<string | null> =>
  parseChoices(await storage.getItem(KEY))[room] ?? null;

export const saveChoice = async (room: string, replyer: string, storage: Storage = AsyncStorage): Promise<void> => {
  const choices = parseChoices(await storage.getItem(KEY));
  await storage.setItem(KEY, JSON.stringify(withChoice(choices, room, replyer)));
};
