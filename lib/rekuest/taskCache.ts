import type { ApolloClient } from "@apollo/client";
import {
  LogLevel,
  TaskChangeFragment,
  TaskEventChangeFragment,
  TaskEventFragment,
  TaskEventFragmentDoc,
  TaskEventKind,
} from "./api/graphql";
import { isTerminalKind } from "./taskStatus";

/**
 * Merging the thin subscription deltas into the normalized cache — a port of
 * orkestrator's `rekuest/lib/taskCache.ts`. Deltas carry scalar ids only, so
 * whatever shows a task (a row, the detail page) re-renders from the Task
 * entity without a refetch.
 */

type Client = ApolloClient<any>;

const levelOf = (kind: TaskEventKind): LogLevel =>
  kind === TaskEventKind.Failed || kind === TaskEventKind.Critical ? LogLevel.Error : LogLevel.Info;

/** A delta as the `TaskEvent` shape the queries read. */
const toEvent = (e: TaskEventChangeFragment): TaskEventFragment & { __typename: "TaskEvent" } => ({
  __typename: "TaskEvent",
  id: e.id,
  kind: e.kind,
  level: levelOf(e.kind),
  message: e.message ?? null,
  progress: e.progress ?? null,
  returns: e.returns ?? null,
  createdAt: e.createdAt,
});

/**
 * Prepend an event to its task's `events` (every stored variant: a row's
 * newest three and the detail page's log) and move its status on. Tasks not
 * in the cache are skipped: nothing shows them.
 */
export const writeTaskEventToCache = (client: Client, e: TaskEventChangeFragment) => {
  const cache = client.cache;
  const id = cache.identify({ __typename: "Task", id: e.task });
  if (!id) return;
  const eventRef = cache.writeFragment({ fragment: TaskEventFragmentDoc, data: toEvent(e) });
  if (!eventRef) return;

  cache.modify({
    id,
    fields: {
      events(existing, { readField }) {
        const list = Array.isArray(existing) ? existing : [];
        if (list.some((ref) => readField("id", ref) === e.id)) return list;
        return [eventRef, ...list];
      },
      // A late event does not undo a terminal state.
      latestEventKind: (prev: TaskEventKind) =>
        e.kind === TaskEventKind.Log || (isTerminalKind(prev) && !isTerminalKind(e.kind)) ? prev : e.kind,
      isDone: (prev: boolean) => prev || isTerminalKind(e.kind),
      finishedAt: (prev: string | null) => (isTerminalKind(e.kind) ? e.createdAt : prev),
    },
  });
};

/** Move a task's hot scalars to what a change says. */
export const applyTaskChange = (client: Client, change: TaskChangeFragment) => {
  const id = client.cache.identify({ __typename: "Task", id: change.id });
  if (!id) return;
  client.cache.modify({
    id,
    fields: {
      latestEventKind: () => change.latestEventKind,
      latestInstructKind: (prev) => change.latestInstructKind ?? prev,
      isDone: () => change.isDone,
      finishedAt: () => change.finishedAt ?? null,
    },
  });
};
