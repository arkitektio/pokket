import AsyncStorage from "@react-native-async-storage/async-storage";
import * as React from "react";

/**
 * The arguments each action was last run with from this phone, in rekuest's
 * wire format. A form starts from them, and the chat's replyers run with them.
 * Kept on the phone: an action's last run on the server may be someone else's.
 */
export type RememberedArgs = readonly (readonly [action: string, args: Record<string, unknown>])[];

const KEY = "rekuest-action-args";
const MAX_ACTIONS = 100;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * A list of pairs, oldest use first, and not a map: action ids are numbers,
 * and an object orders such keys by value, which would forget the order of use.
 */
export const parseRemembered = (raw: string | null): RememberedArgs => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is [string, Record<string, unknown>] =>
        Array.isArray(entry) && entry.length === 2 && typeof entry[0] === "string" && isRecord(entry[1]),
    );
  } catch {
    return [];
  }
};

export const argsFor = (all: RememberedArgs | null | undefined, action: string): Record<string, unknown> | null =>
  all?.find(([id]) => id === action)?.[1] ?? null;

/** Moved to the end, so the oldest use is first and falls off when there are too many. */
export const withRemembered = (all: RememberedArgs, action: string, args: Record<string, unknown>): RememberedArgs =>
  [...all.filter(([id]) => id !== action), [action, args] as const].slice(-MAX_ACTIONS);

type Storage = Pick<typeof AsyncStorage, "getItem" | "setItem">;

export const loadRemembered = async (storage: Storage = AsyncStorage): Promise<RememberedArgs> =>
  parseRemembered(await storage.getItem(KEY));

export const rememberArgs = async (action: string, args: Record<string, unknown>, storage: Storage = AsyncStorage): Promise<void> => {
  await storage.setItem(KEY, JSON.stringify(withRemembered(await loadRemembered(storage), action, args)));
};

/** Everything remembered, once read; `null` until then. `remember` writes through. */
export const useRememberedArgs = () => {
  const [all, setAll] = React.useState<RememberedArgs | null>(null);
  React.useEffect(() => {
    let live = true;
    loadRemembered().then(
      (loaded) => live && setAll(loaded),
      () => live && setAll([]),
    );
    return () => {
      live = false;
    };
  }, []);
  const remember = React.useCallback((action: string, args: Record<string, unknown>) => {
    setAll((current) => withRemembered(current ?? [], action, args));
    void rememberArgs(action, args).catch(() => undefined);
  }, []);
  return { all, remember };
};
