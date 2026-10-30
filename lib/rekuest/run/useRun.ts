import * as React from 'react';
import {
  type ComponentContext,
  type ActionBlokFragment,
  type RunTaskFragment,
  type TaskEventChangeFragment,
  useRunTaskQuery,
  useSpacesForAgentsQuery,
} from '../api/graphql';
import {useTaskStreamListener} from '../useTaskStream';
import {runAgentIds} from './binding';
import {actionBlokFor, foldRunEvents, runOfTask, type ActionBlokRun} from './runTask';

/**
 * How often a run is read again while it goes on, when it may get no events
 * on the task stream (which carries the organization's root tasks only).
 */
export const RUN_POLL_MS = 5_000;

/**
 * A run as its action's bloks draw it; null until it is read. Read once, then
 * moved by the task stream (`foldRunEvent`). `follow` also polls while the run
 * goes on, for a run the stream does not carry (a child task).
 */
export const useRunTask = (
  id: string | null | undefined,
  {follow = false}: {follow?: boolean} = {},
): {task: RunTaskFragment | null; error?: Error; refetch: () => void} => {
  const {data, error, refetch, startPolling, stopPolling} = useRunTaskQuery({
    variables: {id: id ?? ''},
    skip: !id,
    // Its events are folded in here, never written to the shared cache.
    fetchPolicy: 'no-cache',
  });
  const fetched = data?.task ?? null;

  // What the stream said since the run was read; a read that already has an event skips it.
  const [heard, setHeard] = React.useState<readonly TaskEventChangeFragment[]>([]);
  useTaskStreamListener(change => {
    const event = change.event;
    if (event && id && event.task === id) setHeard(previous => [...previous, event]);
  });
  const task = React.useMemo(() => (fetched ? foldRunEvents(fetched, heard) : null), [fetched, heard]);

  const ended = task?.isDone ?? false;
  React.useEffect(() => {
    if (!follow || !id || ended || error) {
      stopPolling();
      return undefined;
    }
    startPolling(RUN_POLL_MS);
    return () => stopPolling();
  }, [ended, error, follow, id, startPolling, stopPolling]);

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

/** The spaces placing the most of `agents`, best first; empty while there are no agents or it is read. */
export const useSpacesForAgents = (agents: readonly string[]) => {
  const key = [...agents].sort().join(',');
  const sorted = React.useMemo(() => (key ? key.split(',') : []), [key]);
  const {data, loading, error} = useSpacesForAgentsQuery({variables: {agents: sorted}, skip: sorted.length === 0});
  return {spaces: data?.spacesForAgents ?? [], loading, error};
};

/**
 * Where to open a run in 3D: the space it was started in, else the space
 * placing the most of its agents. Null while there is none.
 */
export const useRunSpace = (task: RunTaskFragment | null): string | null => {
  const run = useRunOfTask(task);
  const agents = React.useMemo(() => (run ? runAgentIds(run.binding, run.self) : []), [run]);
  // Asked only when the run names no space of its own.
  const {spaces} = useSpacesForAgents(task?.space ? [] : agents);
  return task?.space?.id ?? spaces[0]?.space.id ?? null;
};
