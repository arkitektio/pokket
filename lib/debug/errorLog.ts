import * as React from 'react';

/**
 * A tiny in-memory log of things that went wrong, so failures have somewhere to
 * be seen. Nothing in the app surfaced GraphQL failures before this: the
 * services build their Apollo clients with no error link, so an operation that
 * errored simply resolved with `data: undefined` and whichever component asked
 * for it rendered empty. "No error on screen" meant "nothing was watching".
 *
 * Deliberately not a context: errors are reported from places with no React
 * tree above them (the Apollo link chain, the global exception handler), so the
 * store has to be reachable as a plain module.
 */

export type ErrorSource =
  | 'graphql'
  | 'network'
  | 'websocket'
  | 'js'
  | 'promise'
  | 'console'
  /** Not a failure — every GraphQL operation, so that "it never ran" is
   *  distinguishable from "it ran and failed". Those look identical from the
   *  UI and have completely different causes. */
  | 'request';

export type LoggedError = {
  id: number;
  at: number;
  source: ErrorSource;
  /** One line — this is all that shows until the entry is tapped. */
  title: string;
  /** Stack, variables, response body: whatever helps once you are looking. */
  detail?: string;
  /** How many times in a row this same thing was reported. */
  count: number;
};

/** `request` entries are traffic, not problems. */
export const isFailure = (entry: LoggedError) => entry.source !== 'request';

/** Old entries are worth less than a bounded heap on a phone. */
const LIMIT = 100;

/**
 * Traffic is evicted before failures. The operation log emits two entries per
 * request, so on a chatty screen a flat cap would push the very failure being
 * hunted out of the log within seconds.
 */
const trim = (list: LoggedError[]): LoggedError[] => {
  if (list.length <= LIMIT) return list;
  const failures = list.filter(isFailure).slice(0, LIMIT);
  const requests = list
    .filter((entry) => !isFailure(entry))
    .slice(0, Math.max(0, LIMIT - failures.length));
  const keep = new Set([...failures, ...requests].map((entry) => entry.id));
  return list.filter((entry) => keep.has(entry.id));
};

let entries: LoggedError[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

/**
 * Newest first — the interesting one is almost always the last one.
 *
 * A repeat of the entry already at the head is counted rather than appended.
 * That is not only tidiness: rendering the log is itself capable of producing a
 * `console.error`, which the mirror would report, which would render again. The
 * dedupe is what stops that from running away. It also collapses the paths that
 * legitimately report twice — an uncaught error reaches us directly and again
 * through React Native's own `console.error`.
 */
export const reportError = (source: ErrorSource, title: string, detail?: string) => {
  const head = entries[0];
  if (head && head.source === source && head.title === title) {
    entries = [{ ...head, at: Date.now(), count: head.count + 1 }, ...entries.slice(1)];
    emit();
    return;
  }

  entries = trim([{ id: nextId++, at: Date.now(), source, title, detail, count: 1 }, ...entries]);

  /* Also to Metro. The overlay is only readable by whoever is holding the
     phone; the terminal is what can be copied into a bug report. `log`, not
     `error` — `error` is mirrored back into here. */
  console.log(`[log:${source}] ${title}${detail ? `\n${detail}` : ''}`);

  emit();
};

export const clearErrors = () => {
  if (entries.length === 0) return;
  entries = [];
  emit();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => entries;

/** `getSnapshot` returns the same array until `reportError` replaces it, which
 * is exactly the identity contract `useSyncExternalStore` wants. */
export const useErrorLog = () =>
  React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

/** Errors arrive as Error, GraphQLError, string, or a bare object depending on
 * how far down the stack they came from. */
export const describe = (thrown: unknown): string => {
  if (thrown instanceof Error) return thrown.message || thrown.name;
  if (typeof thrown === 'string') return thrown;
  try {
    return JSON.stringify(thrown);
  } catch {
    return String(thrown);
  }
};

export const stringify = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
};
