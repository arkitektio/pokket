import { redirectError, redirectParams } from "./redirect";
import type { AuthCompletion, AuthUpdate } from "./types";

/**
 * What the phone has in place of the desktop's `announce.ts`, since it has
 * one window and no BroadcastChannel.
 *
 * A REDIRECT login can come back by more than one path at once. On iOS the
 * auth session returns the URL to the sheet that opened it. On Android the
 * deep link also reaches `+native-intent`, and after a cold start only the
 * deep link arrives. So that:
 *
 * - a `code` is exchanged once per `state`, whoever asks first
 *   (`finishRedirect`);
 * - a sheet still open on a `state` gets told the outcome (`onAuthUpdate`);
 * - a deep link for a login a sheet is waiting on goes to that sheet and not
 *   to the router (`claimCallback`).
 */
type Listener = (update: AuthUpdate) => void;
type Claimer = (completion: AuthCompletion) => void;

const listeners = new Map<string, Set<Listener>>();
const claimers = new Map<string, Claimer>();
const finishing = new Map<string, Promise<AuthUpdate>>();

export const onAuthUpdate = (state: string, listener: Listener) => {
  const set = listeners.get(state) ?? new Set<Listener>();
  listeners.set(state, set);
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(state);
  };
};

/** Tell everyone waiting on this login that it moved. */
export const announceAuthUpdate = (state: string, update: AuthUpdate) => {
  for (const listener of listeners.get(state) ?? []) listener(update);
};

/**
 * Exchange a redirect, at most once per `state` while that exchange is in
 * flight or once it has settled. A later caller gets the same answer.
 * Everyone listening on the state hears the outcome.
 */
export const finishRedirect = (
  completion: AuthCompletion,
  complete: (completion: AuthCompletion) => Promise<AuthUpdate>,
): Promise<AuthUpdate> => {
  const known = finishing.get(completion.state);
  if (known) return known;
  const running = complete(completion).then(
    (update) => {
      announceAuthUpdate(completion.state, update);
      return update;
    },
    (error) => {
      // A failed request may be tried again (the paste fallback, a retry).
      finishing.delete(completion.state);
      throw error;
    },
  );
  finishing.set(completion.state, running);
  return running;
};

/** The sheet that started `state` takes its redirect while it is open. */
export const awaitCallback = (state: string, claimer: Claimer) => {
  claimers.set(state, claimer);
  return () => {
    if (claimers.get(state) === claimer) claimers.delete(state);
  };
};

/** The code, state and refusal a redirect URL carries. */
export const completionOf = (url: string): AuthCompletion | null => {
  const params = redirectParams(url);
  const { state, code } = params;
  if (!state) return null;
  if (redirectError(params)) {
    return { state, error: params.error || "access_denied", errorDescription: params.error_description || undefined };
  }
  return code ? { state, code } : null;
};

/**
 * A redirect for a login that an open sheet is waiting on goes to that sheet.
 * Returns whether it was taken; if not, the callback page handles it.
 */
export const claimCallback = (url: string): boolean => {
  const completion = completionOf(url);
  const claimer = completion && claimers.get(completion.state);
  if (!claimer || !completion) return false;
  claimer(completion);
  return true;
};

/** For tests: forget every listener, claim and exchange. */
export const resetInflight = () => {
  listeners.clear();
  claimers.clear();
  finishing.clear();
};
