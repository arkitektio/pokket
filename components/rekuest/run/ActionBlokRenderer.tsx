import * as React from 'react';
import {BlokRunHostProvider, type BlokRunHost} from '@/components/blok/catalog/run/host';
import {MaterializedBlokRenderer} from '@/components/blok/MaterializedBlokRenderer';
import {normalizeBlokComponentTree} from '@arkitektio/bsx/runtime';
import {useDecideMutation, type ActionBlokFragment, type RunTaskFragment} from '@/lib/rekuest/api/graphql';
import {dependencyKeysRead} from '@/lib/rekuest/blok/blokDemands';
import {agentMappingsOf, agentsByKey, type RunBinding} from '@/lib/rekuest/run/binding';
import type {ActionBlokRun} from '@/lib/rekuest/run/runTask';
import {shownAsk, taskRecordOf} from '@/lib/rekuest/run/taskRoot';
import {useBlokTravelMoment} from '@/lib/rekuest/travel/context';
import {parseTimestamp} from '@/lib/rekuest/travel/travelSource';
import {HoldCard} from './HoldCard';

/**
 * An action's own blok, drawn for one run of it (orkestrator's
 * `ActionBlokRenderer`): its dependency keys bound to the agents the run got
 * (`deps.<key>`), `self` the agent running it, `task` following the task (the
 * one task record, at the viewed moment while travelling) and `args` what it
 * was started with.
 *
 * `task.answer(values)` answers the ask `task.ask` shows, approved with
 * those values.
 */

/** The ask `task.ask` shows, answered in place: answering resumes the run. */
export const RunAsk = ({task}: {task: RunTaskFragment}) => {
  const hold = React.useMemo(() => shownAsk(task), [task]);
  if (!hold) return null;
  return <HoldCard key={hold.task} hold={hold} />;
};

/**
 * The run host the run components (`Anchor`, `Route`, `ask`) read, for `run`.
 * `showAsk: false` leaves `ask` empty where the screen shows the run's asks already.
 */
export const useRunHost = (run: ActionBlokRun, showAsk = true): BlokRunHost => {
  const byKey = React.useMemo(() => agentsByKey(run.binding, run.self), [run.binding, run.self]);
  const task = run.task;
  return React.useMemo<BlokRunHost>(
    () => ({
      agentsFor: key => byKey.get(key) ?? [],
      renderAsk: () => (showAsk ? <RunAsk task={task} /> : null),
    }),
    [byKey, showAsk, task],
  );
};

/** Provides the run to what is below: the scene surface a space draws the overlay into, or an html blok. */
export const RunHost = ({run, showAsk, children}: {run: ActionBlokRun; showAsk?: boolean; children: React.ReactNode}) => (
  <BlokRunHostProvider value={useRunHost(run, showAsk)}>{children}</BlokRunHostProvider>
);

/** The dependency keys `actionBlok`'s tree reads that `binding` binds to no agent. */
export const unboundOfRun = (actionBlok: ActionBlokFragment, binding: RunBinding): string[] => {
  const {roots} = normalizeBlokComponentTree(actionBlok.blok.componentTree as unknown[] | null);
  const variables = [...(actionBlok.blok.queries ?? []), ...(actionBlok.blok.subscriptions ?? [])].flatMap(read =>
    Array.isArray(read.variables) ? read.variables : [],
  );
  const bound = new Set(binding.map(({key}) => key));
  return dependencyKeysRead(roots, variables).filter(key => !bound.has(key));
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `task.answer(values)`: the ask `task.ask` shows, approved with what the blok answered. */
const useAnswerShownAsk = (task: RunTaskFragment): ((values: Record<string, unknown>) => Promise<unknown>) | undefined => {
  const [decide] = useDecideMutation();
  const held = React.useMemo(() => shownAsk(task)?.task, [task]);
  return React.useMemo(
    () => (held ? (values: Record<string, unknown>) => decide({variables: {input: {task: held, approved: true, values}}}) : undefined),
    [decide, held],
  );
};

type ActionBlokRendererProps = {
  actionBlok: ActionBlokFragment;
  run: ActionBlokRun;
  /** Whether `ask` shows the run's open ask; off where the screen shows it already. */
  showAsk?: boolean;
  /** `none`: drawn into a scene that is already open (an overlay in a space). */
  chrome?: 'default' | 'none';
};

export const ActionBlokRenderer = ({actionBlok, run, showAsk, chrome}: ActionBlokRendererProps) => {
  const materializedBlok = React.useMemo(
    () => ({
      // Its kept locals are its own, never those of a materialization with the same number.
      id: `action-blok:${actionBlok.id}`,
      blok: {
        componentTree: actionBlok.blok.componentTree,
        vocab: actionBlok.blok.vocab,
        resolvedLocals: actionBlok.blok.resolvedLocals,
        demo: actionBlok.blok.demo,
        queries: actionBlok.blok.queries,
        subscriptions: actionBlok.blok.subscriptions,
      },
      revision: null,
      agentMappings: agentMappingsOf(run.binding, run.self),
      // A run's binding is final: a key its tree reads that the run left unbound reads as failed.
      unboundDependencies: unboundOfRun(actionBlok, run.binding),
    }),
    [actionBlok, run.binding, run.self],
  );
  const args = React.useMemo(() => (isRecord(run.task.args) ? run.task.args : undefined), [run.task]);
  const moment = useBlokTravelMoment();
  const task = React.useMemo(
    () => taskRecordOf(run.task, moment === null ? undefined : parseTimestamp(moment)),
    [moment, run.task],
  );
  const answer = useAnswerShownAsk(run.task);
  return (
    <RunHost run={run} showAsk={showAsk}>
      <MaterializedBlokRenderer
        materializedBlok={materializedBlok}
        args={args}
        task={task}
        // The past is not answered.
        onAnswer={moment === null ? answer : undefined}
        chrome={chrome}
      />
    </RunHost>
  );
};

export default ActionBlokRenderer;
