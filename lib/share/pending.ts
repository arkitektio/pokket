import * as React from "react";

/**
 * Whether something was shared to the app and has not been shown yet.
 *
 * A share arrives when it likes, as a link does: before the login is restored,
 * or on the sign-in screen. So it only marks itself here (`+native-intent`), and
 * the gate (`ShareGate`) opens the share screen once the app can show it. The
 * files themselves wait on the native side, in `expo-sharing`.
 */
let pending = false;
const listeners = new Set<() => void>();

const set = (next: boolean) => {
  pending = next;
  listeners.forEach((listener) => listener());
};

export const rememberPendingShare = () => set(true);
export const clearPendingShare = () => set(false);
const getPendingShare = () => pending;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const usePendingShare = (): boolean => React.useSyncExternalStore(subscribe, getPendingShare, getPendingShare);

/** The link the share extension (iOS) or the share intent (Android) opens the app by. */
export const isShareLink = (url: string): boolean => /^(pokket|orkestrator):\/\/expo-sharing\/?(?:[?#]|$)/i.test(url.trim());
