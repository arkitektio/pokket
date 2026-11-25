import * as React from 'react';
import {
  type ComponentContext,
  type ActionBlokFragment,
  type RunTaskFragment,
  type TaskEventChangeFragment,
  useRunTaskQuery,
} from '../api/graphql';
import {toTaskEventChange, type TaskSnapshot, type WireTaskEvent} from '../session/frames';
import {useRekuestSession} from '../session/hooks';
import {actionBlokFor, foldRunEvents, runOfTask, type ActionBlokRun} from './runTask';

/**
 * A run as its action's bloks draw it; null until it is read. Read once, then
 * moved by its own topic on the app's caller session (`task:<id>`: the task's
 * events, gap-free across a resume), folded in by `foldRunEvent`. A child task
 * is followed as well as a root one, which the old stream could not. Back after the session was gone too long, it is read again.
 *
 * `follow` is kept for its callers: every run is followed now, not polled.
 */
export const useRunTask = (
  id: string | null | undefined,
  _options: {follow?: boolean} = {},
): {task: RunTaskFragment | null; error?: Error; refetch: () => void} => {
  const session = useRekuestSession();
  const {data, error, refetch} = useRunTaskQuery({
    variables: {id: id ?? ''},
    skip: !id,
    // Its events are folded in here, never written to the shared cache.
    fetchPolicy: 'no-cache',
  });
  const fetched = data?.task ?? null;

  // What the topic said since the run was read; a read that already has an event skips it.
  const [heard, setHeard] = React.useState<readonly TaskEventChangeFragment[]>([]);
  React.useEffect(() => {
    setHeard([]);
    if (!id) return undefined;
    return session.watch(`task:${id}`, {
      onData: item => setHeard(previous => [...previous, toTaskEventChange(item as WireTaskEvent)]),
      onResync: (snapshot, reason) => {
        // Its newest events, oldest first: what the read already has is skipped.
        const events = ((snapshot as TaskSnapshot).events ?? []).map(toTaskEventChange);
        setHeard(previous => [...previous, ...events]);
        // Gone longer than the session's grace: what fell out of the snapshot is read again.
        if (reason !== 'new' && reason !== 'resumed') void refetch().catch(() => undefined);
      },
    });
  }, [session, id, refetch]);
  const task = React.useMemo(() => (fetched ? foldRunEvents(fetched, heard) : null), [fetched, heard]);

  const reread = React.useCallback(() => void refetch(), [refetch]);
  return {task, error, refetch: reread};
};

/**
 * A task's run, kept the same object while what it binds stays the same: the
 * task itself changes with every event, its binding does not.
 */
export const useRunOfTask = (task: RunTaskFragment | null): ActionBlokRun | null => {
  const bound = task ? runOfTask(task) : null;
  const key = bound ? JSON.stringify([bound.binding, bound.self]) : '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const binding = React.useMemo(() => bound?.binding ?? [], [key]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const self = React.useMemo(() => bound?.self ?? null, [key]);
  return React.useMemo(() => (task ? {binding, self, task} : null), [binding, self, task]);
};

/** What a space draws for a run: the action's overlay, bound to the run. */
export type SpaceRun = {actionBlok: ActionBlokFragment; run: ActionBlokRun};

/** The action's blok for `context` bound to the task, once it is read; null for an action without one. */
export const useTaskActionBlok = (task: RunTaskFragment | null, context: ComponentContext): SpaceRun | null => {
  const run = useRunOfTask(task);
  const actionBlok = actionBlokFor(task?.actionBloks, context);
  return React.useMemo(() => (run && actionBlok ? {actionBlok, run} : null), [actionBlok, run]);
};

/** Where to open a run in 3D: the space it was started in. Null while there is none. */
export const useRunSpace = (task: RunTaskFragment | null): string | null => task?.space?.id ?? null;
