import * as React from "react";
import { ShareRequest } from "./shareScope";

/**
 * The link the app was opened with, until it has been dealt with.
 *
 * A link arrives when it likes — before the login is restored, on the
 * sign-in screen, in another organization — and none of those can show its
 * page. So it is kept here rather than navigated to, and the gate
 * (`DeepLinkGate`) opens it once the right organization's tabs are up.
 * In memory only: a link confirmed today must not reopen on next week's launch.
 */
let pending: ShareRequest | null = null;
const listeners = new Set<() => void>();

const set = (next: ShareRequest | null) => {
  pending = next;
  listeners.forEach((listener) => listener());
};

export const rememberPendingLink = (request: ShareRequest) => set(request);
export const clearPendingLink = () => set(null);
export const getPendingLink = () => pending;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const usePendingLink = (): ShareRequest | null => React.useSyncExternalStore(subscribe, getPendingLink, getPendingLink);
