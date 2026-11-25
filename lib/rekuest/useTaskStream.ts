import type { ApolloClient } from "@apollo/client";
import * as React from "react";
import { useService } from "../arkitekt/hooks";
import { DetailTaskDocument, ListTasksDocument, type TaskChangeFragment, type TaskEventChangeFragment } from "./api/graphql";
import { toTaskChange, toTaskEventChange, type ListSnapshot, type WireTaskChange, type WireTaskEvent } from "./session/frames";
import { useRekuestSession } from "./session/hooks";
import { applyTaskChange, writeTaskEventToCache } from "./taskCache";
import { isTerminalKind } from "./taskStatus";

/**
 * The organization's tasks, live, over the app's caller session on takt
 * (`lib/rekuest/session`, orkestrator's `OrgTasksUpdater` and `TaskUpdater`):
 *
 * - `useTaskStream`: `tasks:org`, kept in the cache while a list shows it;
 * - `useTaskStreamListener`: `tasks:mine`, change by change, for following the
 *   tasks this user started from the moment they are assigned;
 * - `useChildTaskStream`: `children:<task>`, a task's tree.
 *
 * The session watches each topic once however many screens use it, and drops
 * what arrives twice at a resume's seam before anyone hears it. A list carries
 * no cursor: back after a gap, the topic is resent whole (`RESYNC`), and the
 * lists are read again.
 */

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

/**
 * One change of a task list: a task started (`create`), one of its events
 * (`event`), or the task as it is now (`update`, from a snapshot: on every
 * watch, and back after a gap): what a follower missed, its end included.
 */
export type TaskStreamChange = {
  create?: TaskChangeFragment | null;
  event?: TaskEventChangeFragment | null;
  update?: TaskChangeFragment | null;
};

type ListItem = { create?: WireTaskChange | null; event?: WireTaskEvent | null };

const toChange = (item: ListItem): TaskStreamChange => ({
  create: item.create ? toTaskChange(item.create) : null,
  event: item.event ? toTaskEventChange(item.event) : null,
});

/**
 * The organization's root tasks (`tasks:org`), kept in the cache: every event
 * is written onto its task, a new or finished task reads the lists again.
 */
export const useTaskStream = () => {
  const client = useRekuestClient();
  const session = useRekuestSession();
  React.useEffect(() => {
    const refetchLists = debounced(() => void client.refetchQueries({ include: [ListTasksDocument] }));
    const stop = session.watch("tasks:org", {
      onData: (item) => {
        const change = toChange(item as ListItem);
        if (change.event) writeTaskEventToCache(client, change.event);
        // A finished task leaves the "Running" view and joins "Finished".
        if (change.create || isTerminalKind(change.event?.kind)) refetchLists();
      },
      onResync: (snapshot, reason) => {
        if (reason === "new") return;
        for (const row of (snapshot as ListSnapshot<WireTaskChange>).rows ?? []) applyTaskChange(client, toTaskChange(row));
        refetchLists();
      },
    });
    return () => {
      refetchLists.cancel();
      stop();
    };
  }, [client, session]);
};

/**
 * This user's root tasks (`tasks:mine`), change by change: for following one
 * task from the moment it is assigned, before any query knows it. Events are
 * also written onto their tasks in the cache.
 */
export const useTaskStreamListener = (listener: (change: TaskStreamChange) => void) => {
  const client = useRekuestClient();
  const session = useRekuestSession();
  const latest = React.useRef(listener);
  React.useEffect(() => {
    latest.current = listener;
  });
  React.useEffect(
    () =>
      session.watch("tasks:mine", {
        onData: (item) => {
          const change = toChange(item as ListItem);
          if (change.event) writeTaskEventToCache(client, change.event);
          latest.current(change);
        },
        // Every snapshot, a first one too: a rebuilt connection brings a new session, whose
        // first look is all a follower hears of a task that ended while it was being replaced.
        // Each row moves a follower forward only, so one it already knew changes nothing.
        onResync: (snapshot) => {
          for (const row of (snapshot as ListSnapshot<WireTaskChange>).rows ?? []) {
            const update = toTaskChange(row);
            applyTaskChange(client, update);
            latest.current({ update });
          }
        },
      }),
    [client, session],
  );
};

/**
 * Keep a task's tree current (`children:<task>`): updates move their status,
 * a new task in it reads the task again (the feed carries no events).
 */
export const useChildTaskStream = (id: string) => {
  const client = useRekuestClient();
  const session = useRekuestSession();
  React.useEffect(() => {
    const refetchDetail = debounced(() => void client.refetchQueries({ include: [DetailTaskDocument] }));
    const stop = session.watch(`children:${id}`, {
      onData: (item) => {
        const change = item as { create?: WireTaskChange | null; update?: WireTaskChange | null };
        if (change.update) applyTaskChange(client, toTaskChange(change.update));
        if (change.create) refetchDetail();
      },
      onResync: (snapshot, reason) => {
        if (reason === "new") return;
        for (const row of (snapshot as ListSnapshot<WireTaskChange>).rows ?? []) applyTaskChange(client, toTaskChange(row));
        refetchDetail();
      },
    });
    return () => {
      refetchDetail.cancel();
      stop();
    };
  }, [client, session, id]);
};
