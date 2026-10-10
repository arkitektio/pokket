import type { ApolloClient } from "@apollo/client";
import * as React from "react";
import { useService } from "../arkitekt/hooks";
import {
  DetailTaskDocument,
  ListTasksDocument,
  WatchChildTasksDocument,
  WatchChildTasksSubscription,
  WatchTasksDocument,
  WatchTasksSubscription,
} from "./api/graphql";
import { applyTaskChange, writeTaskEventToCache } from "./taskCache";
import { isTerminalKind } from "./taskStatus";

type Client = ApolloClient<any>;

export const useRekuestClient = (): Client => useService("rekuest").client as Client;

const REFETCH_DEBOUNCE_MS = 750;

const debounced = (run: () => void) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    if (timeout) return;
    timeout = setTimeout(() => {
      timeout = undefined;
      run();
    }, REFETCH_DEBOUNCE_MS);
  };
  schedule.cancel = () => timeout && clearTimeout(timeout);
  return schedule;
};

type Stream = { users: number; stop: () => void };
const streams = new WeakMap<Client, Stream>();

export type TaskStreamChange = NonNullable<WatchTasksSubscription["tasks"]>;
type Listener = (change: TaskStreamChange) => void;
/** Who else wants each change as it arrives, e.g. the chat's replyer pills. */
const listeners = new WeakMap<Client, Set<Listener>>();

const openStream = (client: Client): (() => void) => {
  const refetchLists = debounced(() => void client.refetchQueries({ include: [ListTasksDocument] }));
  const subscription = client.subscribe<WatchTasksSubscription>({ query: WatchTasksDocument }).subscribe({
    next: ({ data }) => {
      const change = data?.tasks;
      if (change) listeners.get(client)?.forEach((listener) => listener(change));
      if (change?.event) writeTaskEventToCache(client, change.event);
      // A finished task leaves the "Running" view and joins "Finished".
      if (change?.create || isTerminalKind(change?.event?.kind)) refetchLists();
    },
    error: (e) => console.warn("[rekuest] task stream closed", e),
  });
  return () => {
    refetchLists.cancel();
    subscription.unsubscribe();
  };
};

/**
 * The organization's root task stream, kept in the cache: every event is
 * written onto its task, a new task refetches the lists. One subscription per
 * client however many screens use it — the list stays mounted under a pushed
 * task, and both use it.
 */
export const useTaskStream = () => {
  const client = useRekuestClient();
  React.useEffect(() => {
    let stream = streams.get(client);
    if (!stream) {
      stream = { users: 0, stop: openStream(client) };
      streams.set(client, stream);
    }
    stream.users += 1;
    return () => {
      const s = streams.get(client);
      if (!s) return;
      s.users -= 1;
      if (s.users === 0) {
        s.stop();
        streams.delete(client);
      }
    };
  }, [client]);
};

/**
 * The same stream, change by change: for following one task from the moment
 * it is assigned, before any query knows it. Holds the stream open like
 * `useTaskStream`.
 */
export const useTaskStreamListener = (listener: (change: TaskStreamChange) => void) => {
  const client = useRekuestClient();
  useTaskStream();
  const latest = React.useRef(listener);
  React.useEffect(() => {
    latest.current = listener;
  });
  React.useEffect(() => {
    const own: Listener = (change) => latest.current(change);
    const set = listeners.get(client) ?? new Set<Listener>();
    listeners.set(client, set);
    set.add(own);
    return () => {
      set.delete(own);
    };
  }, [client]);
};

/**
 * Keep a task's children current: updates move their status, a new child
 * refetches the task (children carry no events on this stream).
 */
export const useChildTaskStream = (id: string) => {
  const client = useRekuestClient();
  React.useEffect(() => {
    const refetchDetail = debounced(() => void client.refetchQueries({ include: [DetailTaskDocument] }));
    const subscription = client
      .subscribe<WatchChildTasksSubscription>({ query: WatchChildTasksDocument, variables: { id } })
      .subscribe({
        next: ({ data }) => {
          const change = data?.childTasks;
          if (change?.update) applyTaskChange(client, change.update);
          if (change?.create) refetchDetail();
        },
        error: (e) => console.warn("[rekuest] child task stream closed", e),
      });
    return () => {
      refetchDetail.cancel();
      subscription.unsubscribe();
    };
  }, [client, id]);
};
