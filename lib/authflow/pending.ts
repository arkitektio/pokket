import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * The logins this phone started and has not seen finish, by `state`. Kept in
 * AsyncStorage, so the callback page still recognises a redirect after Android
 * has killed the app while the user was in the browser. A redirect whose state
 * is not in here was not started on this phone, and the callback page refuses
 * to finish it.
 */
export type PendingAuth = {
  namespace: string;
  /** The profile it was started on; its `state` means nothing to another server. */
  profile: string | null;
  expiresAt: number;
};

const KEY = "pokket.authflow.pending";
// A login past its deadline may still be at a later step; keep it a while.
const GRACE = 60 * 60 * 1000;

const read = async (now: number): Promise<Record<string, PendingAuth>> => {
  try {
    const all = JSON.parse((await AsyncStorage.getItem(KEY)) ?? "{}") as Record<string, PendingAuth>;
    return Object.fromEntries(Object.entries(all).filter(([, entry]) => entry.expiresAt + GRACE > now));
  } catch {
    return {};
  }
};

const write = async (all: Record<string, PendingAuth>) => {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Without storage, only the sheet that started a login can finish it.
  }
};

export const rememberPending = async (state: string, entry: PendingAuth, now: number = Date.now()) =>
  write({ ...(await read(now)), [state]: entry });

export const findPending = async (state: string, now: number = Date.now()): Promise<PendingAuth | null> =>
  (await read(now))[state] ?? null;

export const forgetPending = async (state: string, now: number = Date.now()) => {
  const { [state]: _gone, ...rest } = await read(now);
  await write(rest);
};
