import * as React from 'react';
import * as Crypto from 'expo-crypto';
import {
  normalizeBlokComponentTree,
  useBlokRuntime,
  type BlokDispatchActionHandler,
  type BlokTaskObserver,
  type BlokTaskRecord,
} from '@/lib/ports/blok/runtime';
import type {MaterializedBlokFragment} from '@/lib/rekuest/api/graphql';
import {useAssign} from '@/lib/rekuest/assign/useAssignAction';
import {collectDemandedLatestTasks, collectDemandedStateInterfaces} from '@/lib/rekuest/blok/blokDemands';
import {taskUpdateFromEvent} from '@/lib/rekuest/blok/blokTaskUpdates';
import {LATEST_SEGMENT} from '@/lib/rekuest/blok/segments';
import {useAgentLiveState, useLatestTask} from '@/lib/rekuest/blok/useAgentLiveState';
import {isTerminalKind} from '@/lib/rekuest/taskStatus';
import {useTaskStreamListener, type TaskStreamChange} from '@/lib/rekuest/useTaskStream';
import BlokRenderer from './BlokRenderer';

/**
 * A materialized blok, live: orkestrator's `MaterializedBlokRenderer` without
 * time travel, assets or the 3D scene.
 *
 * - `<dependency>/<interface>` paths hold the bound agent's live state
 *   (`WatchState`, one shared subscription per agent and state);
 * - `<dependency>/<action>/latest` holds the task the action last ran as,
 *   whoever started it (`latestTask`);
 * - an agent call assigns the operation on the agent bound to its dependency
 *   and reports the task back, so a bound `Button` shows it running.
 */

type Mapping = MaterializedBlokFragment['agentMappings'][number];

/** Writes one state of one bound agent into the runtime, under `<dependency>/<interface>`. */
const BlokStateSync = (props: {dependencyKey: string; stateInterface: string; agentId: string}) => {
  const {agentId, dependencyKey, stateInterface} = props;
  const {value, revision, known} = useAgentLiveState({agentID: agentId, stateInterface});
  const setRuntimeValue = useBlokRuntime(state => state.setRuntimeValue);
  const clearRuntimeValue = useBlokRuntime(state => state.clearRuntimeValue);
  const setAgentMappingStateUpdate = useBlokRuntime(state => state.setAgentMappingStateUpdate);
  const clearAgentMappingStateUpdate = useBlokRuntime(state => state.clearAgentMappingStateUpdate);
  const runtimePath = `${dependencyKey}/${stateInterface}`;

  // Write on every update; clearing between updates would flash the demo state.
  React.useEffect(() => {
    if (!known) return;
    if (value == null) {
      clearRuntimeValue(runtimePath);
      clearAgentMappingStateUpdate(dependencyKey, stateInterface);
      return;
    }
    setRuntimeValue(runtimePath, value);
    setAgentMappingStateUpdate(dependencyKey, agentId, stateInterface, value, revision);
  }, [
    agentId,
    clearAgentMappingStateUpdate,
    clearRuntimeValue,
    dependencyKey,
    known,
    revision,
    runtimePath,
    setAgentMappingStateUpdate,
    setRuntimeValue,
    stateInterface,
    value,
  ]);

  React.useEffect(
    () => () => {
      clearRuntimeValue(runtimePath);
      clearAgentMappingStateUpdate(dependencyKey, stateInterface);
    },
    [agentId, clearAgentMappingStateUpdate, clearRuntimeValue, dependencyKey, runtimePath, stateInterface],
  );

  return null;
};

const RECORD_FIELDS = ['status', 'running', 'done', 'failed', 'progress', 'message', 'error', 'result', 'returns'] as const;

const sameRecord = (a: BlokTaskRecord | undefined, b: BlokTaskRecord): boolean =>
  a !== undefined && RECORD_FIELDS.every(field => a[field] === b[field]);

/**
 * Keeps `<dependency>/<action>/latest` on the task the bound agent last ran
 * the action as. `name` is an action only if the agent implements it; where it
 * does not, `children` (the state sync of the same name) takes over.
 */
const LatestTaskSync = (props: {dependencyKey: string; name: string; agentId: string; children: React.ReactNode}) => {
  const {agentId, dependencyKey, name} = props;
  const latest = useLatestTask({agentID: agentId, name});
  const setRuntimeValue = useBlokRuntime(state => state.setRuntimeValue);
  const clearRuntimeValue = useBlokRuntime(state => state.clearRuntimeValue);
  const runtimePath = `${dependencyKey}/${name}/${LATEST_SEGMENT}`;
  const record = latest?.implementation ? latest.record : undefined;

  const written = React.useRef<BlokTaskRecord | undefined>(undefined);
  React.useEffect(() => {
    if (record === undefined || sameRecord(written.current, record)) return;
    written.current = record;
    setRuntimeValue(runtimePath, record);
  }, [record, runtimePath, setRuntimeValue]);

  React.useEffect(
    () => () => {
      written.current = undefined;
      clearRuntimeValue(runtimePath);
    },
    [clearRuntimeValue, runtimePath],
  );

  if (latest === null || latest.implementation !== null) return null;
  return <>{props.children}</>;
};

const RuntimeSync = ({agentMappings, roots}: {agentMappings: readonly Mapping[]; roots: ReadonlyArray<unknown>}) => {
  const dependencyKeys = React.useMemo(() => new Set(agentMappings.map(mapping => mapping.key)), [agentMappings]);
  const demandedStates = React.useMemo(
    () => collectDemandedStateInterfaces(roots, dependencyKeys),
    [dependencyKeys, roots],
  );
  const demandedLatest = React.useMemo(
    () => collectDemandedLatestTasks(roots, dependencyKeys),
    [dependencyKeys, roots],
  );

  return (
    <>
      {agentMappings.flatMap(mapping => {
        const interfaces = demandedStates.get(mapping.key);
        if (!interfaces || interfaces.size === 0) return [];
        const latest = demandedLatest.get(mapping.key);

        return [...interfaces].map(stateInterface => {
          const key = `${mapping.key}-${mapping.agent.id}-${stateInterface}`;
          const stateSync = (
            <BlokStateSync
              key={key}
              dependencyKey={mapping.key}
              stateInterface={stateInterface}
              agentId={mapping.agent.id}
            />
          );
          if (!latest?.has(stateInterface)) return stateSync;
          return (
            <LatestTaskSync key={key} dependencyKey={mapping.key} name={stateInterface} agentId={mapping.agent.id}>
              {stateSync}
            </LatestTaskSync>
          );
        });
      })}
    </>
  );
};

type Followed = {observe?: BlokTaskObserver; resolve: () => void};

/**
 * Follows the tasks this blok started on the organization's task stream. A
 * task is known by the reference it was assigned with until its create says
 * which id it got; events that beat the id to us wait for it.
 */
const useTaskFollower = () => {
  const byReference = React.useRef(new Map<string, Followed>());
  const byTask = React.useRef(new Map<string, Followed>());
  const early = React.useRef(new Map<string, NonNullable<TaskStreamChange['event']>[]>());

  const deliver = React.useCallback((followed: Followed, taskId: string, event: NonNullable<TaskStreamChange['event']>) => {
    const update = taskUpdateFromEvent(event);
    if (update) followed.observe?.(update);
    if (isTerminalKind(event.kind)) {
      byTask.current.delete(taskId);
      followed.resolve();
    }
  }, []);

  const bind = React.useCallback(
    (reference: string, taskId: string) => {
      const followed = byReference.current.get(reference);
      if (!followed) return;
      byReference.current.delete(reference);
      byTask.current.set(taskId, followed);
      const waiting = early.current.get(taskId);
      early.current.delete(taskId);
      waiting?.forEach(event => byTask.current.has(taskId) && deliver(followed, taskId, event));
    },
    [deliver],
  );

  useTaskStreamListener(change => {
    if (change.create?.reference) bind(change.create.reference, change.create.id);
    const event = change.event;
    if (!event) return;
    const followed = byTask.current.get(event.task);
    if (followed) {
      deliver(followed, event.task, event);
    } else if (byReference.current.size > 0) {
      // Possibly ours, ahead of its create: hold it briefly.
      const waiting = early.current.get(event.task) ?? [];
      waiting.push(event);
      early.current.set(event.task, waiting);
      if (early.current.size > 50) early.current.delete(early.current.keys().next().value as string);
    }
  });

  const follow = React.useCallback((reference: string, followed: Followed) => {
    byReference.current.set(reference, followed);
    return () => {
      byReference.current.delete(reference);
    };
  }, []);

  return {follow, bind};
};

const useMaterializedDispatchAction = (agentMappings: readonly Mapping[]) => {
  const {run} = useAssign();
  const {follow, bind} = useTaskFollower();
  const agentIdByDependency = React.useMemo(
    () => new Map(agentMappings.map(mapping => [mapping.key, mapping.agent.id] as const)),
    [agentMappings],
  );

  return React.useCallback<BlokDispatchActionHandler>(
    (action, _component, observe) => {
      const agentId = agentIdByDependency.get(action.dependency);
      if (!agentId) {
        observe?.({end: 'failed', error: `Blok dependency "${action.dependency}" is not bound to an agent.`});
        return;
      }

      const reference = Crypto.randomUUID();
      // The returned promise settles when the task ends: that is what makes a
      // `Button` pulse while its task runs (`usePendingAction`).
      return new Promise<void>(resolve => {
        const unfollow = follow(reference, {observe, resolve});
        run({agent: agentId, interface: action.operation}, action.arguments ?? {}, reference)
          .then(task => bind(reference, task.id))
          .catch((error: unknown) => {
            unfollow();
            observe?.({end: 'failed', error: error instanceof Error ? error.message : String(error)});
            resolve();
          });
      });
    },
    [agentIdByDependency, bind, follow, run],
  );
};

export const MaterializedBlokRenderer = ({materializedBlok}: {materializedBlok: MaterializedBlokFragment}) => {
  const dispatchAction = useMaterializedDispatchAction(materializedBlok.agentMappings);
  const {roots} = React.useMemo(
    () => normalizeBlokComponentTree(materializedBlok.blok.componentTree as unknown[] | null),
    [materializedBlok.blok.componentTree],
  );

  return (
    <BlokRenderer uiComponents={roots} initialState={materializedBlok.blok.demoState} dispatchAction={dispatchAction}>
      <RuntimeSync agentMappings={materializedBlok.agentMappings} roots={roots} />
    </BlokRenderer>
  );
};

export default MaterializedBlokRenderer;
