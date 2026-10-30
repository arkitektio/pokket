import {ComponentContext, TaskEventKind, type ActionBlokFragment, type RunTaskFragment, type TaskEventChangeFragment} from '../api/graphql';
import {isTerminalKind} from '../taskStatus';
import type {RunBinding, RunBoundAgent} from './binding';

/**
 * A run as its action's bloks draw it, kept current by the task stream: the
 * run is read once (`RunTask`), and every event the organization's task
 * stream carries for it is folded in here, so `task` moves without a refetch
 * and an ask (HELD) shows the moment it is made.
 */

/** What an action's blok is drawn for. */
export type ActionBlokRun = {
  binding: RunBinding;
  /** The agent running the action (`self`); null when not known yet. */
  self: RunBoundAgent | null;
  /** The run. */
  task: RunTaskFragment;
};

/** The run as `Task.dependencyAgents` and `Task.implementation` describe it. */
export const runOfTask = (task: RunTaskFragment): ActionBlokRun => ({
  binding: task.dependencyAgents.map(({key, agent}) => ({
    key,
    agent: {id: agent.id, name: agent.name, connected: agent.connected},
  })),
  self: task.implementation?.agent
    ? {id: task.implementation.agent.id, name: task.implementation.agent.name, connected: task.implementation.agent.connected}
    : null,
  task,
});

/** The action's blok for `context`, if it declared one. */
export const actionBlokFor = (
  bloks: readonly ActionBlokFragment[] | null | undefined,
  context: ComponentContext,
): ActionBlokFragment | null => bloks?.find(blok => blok.context === context) ?? null;

const REPORTS_RETURNS: readonly TaskEventKind[] = [TaskEventKind.Yield, TaskEventKind.Completed];

/**
 * One event of the task stream folded into the run it belongs to. The same
 * object when the event is another task's, or already in.
 */
export const foldRunEvent = (task: RunTaskFragment, event: TaskEventChangeFragment): RunTaskFragment => {
  if (event.task !== task.id || task.events.some(known => known.id === event.id)) return task;
  const ended = isTerminalKind(task.latestEventKind) || task.isDone;
  return {
    ...task,
    // Newest first, as the run's events are read.
    events: [
      {
        __typename: 'TaskEvent',
        id: event.id,
        kind: event.kind,
        message: event.message ?? null,
        progress: event.progress ?? null,
        returns: event.returns ?? null,
        value: event.value ?? null,
        createdAt: event.createdAt,
        task: {__typename: 'Task', id: task.id},
      },
      ...task.events,
    ],
    // A log says nothing of where the run stands, and a late event does not undo its end.
    latestEventKind:
      event.kind === TaskEventKind.Log || (ended && !isTerminalKind(event.kind)) ? task.latestEventKind : event.kind,
    isDone: task.isDone || isTerminalKind(event.kind),
    latestProgress: event.kind === TaskEventKind.Progress && typeof event.progress === 'number' ? event.progress : task.latestProgress,
    latestMessage: event.message ?? task.latestMessage,
    latestReturns: REPORTS_RETURNS.includes(event.kind) && event.returns != null ? event.returns : task.latestReturns,
  };
};

/** Every event of `events` folded in, in the order they came. */
export const foldRunEvents = (task: RunTaskFragment, events: readonly TaskEventChangeFragment[]): RunTaskFragment =>
  events.reduce(foldRunEvent, task);
