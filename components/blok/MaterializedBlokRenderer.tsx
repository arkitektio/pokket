import * as React from 'react';
import * as Crypto from 'expo-crypto';
import {toast} from 'sonner-native';
import {
  liveModel,
  declaredLocals,
  declaredQueries,
  declaredSubscriptions,
  type BlokDeclarations,
} from '@arkitektio/bsx/renderer/declarations';
import type {BlokPersistence} from '@arkitektio/bsx/renderer/persist';
import {
  normalizeBlokComponentTree,
  useBlokRuntime,
  useBlokRuntimeStoreApi,
  type BlokDispatchActionHandler,
  type BlokRefuseActionHandler,
  type BlokSourceStatus,
  type BlokTaskObserver,
  type BlokTaskRecord,
} from '@arkitektio/bsx/runtime';
import {useAssign} from '@/lib/rekuest/assign/useAssignAction';
import {RekuestAssetHost} from '@/lib/rekuest/blok/assets';
import {collectDemandedLatestTasks, collectDemandedStateInterfaces} from '@/lib/rekuest/blok/blokDemands';
import {latestTaskRecord, pickLatestTask} from '@/lib/rekuest/blok/blokLatestTask';
import {taskUpdateFromEvent} from '@/lib/rekuest/blok/blokTaskUpdates';
import {RekuestSceneHost} from '@/lib/rekuest/blok/sceneHost';
import {useLatestTask} from '@/lib/rekuest/blok/useAgentLiveState';
import {useBlokComponentStore, useBlokPersistence} from '@/lib/rekuest/blok/useBlokPersistence';
import {useBlokViewer} from '@/lib/rekuest/blok/useBlokViewer';
import {usePastLatestTasks} from '@/lib/rekuest/blok/usePastLatestTasks';
import {useServiceReads} from '@/lib/rekuest/blok/useServiceReads';
import {useBlokTravelMoment, useBlokTravelSource, useBoundState} from '@/lib/rekuest/travel/context';
import {isTerminalKind} from '@/lib/rekuest/taskStatus';
import {useTaskStreamListener, type TaskStreamChange} from '@/lib/rekuest/useTaskStream';
import BlokRenderer from './BlokRenderer';

/**
 * A materialized blok: orkestrator's `MaterializedBlokRenderer` without the
 * args page. Live unless a `BlokTravelProvider` around it shows the past.
 *
 * - `deps.<key>.<state>` holds the bound agent's state: live (`WatchState`, one
 *   shared subscription per agent and state), or at the travel moment (agent
 *   state history); pending until it is known and stale while the agent is
 *   offline;
 * - `deps.<key>.tasks.<action>` holds the task the action last ran as,
 *   whoever started it (`latestTask`), or ran as at the travel moment;
 * - `then` is the travel moment (ISO 8601), null live; while it is set agent
 *   calls are refused and toasts stay quiet;
 * - `task` is the task a task or action blok is about, and `task.answer`
 *   goes to `onAnswer`;
 * - an agent call assigns the operation on the agent bound to its dependency
 *   and reports the task back, so the control that started it is busy;
 * - `deps.<key>.assets.<name>` is a file the bound agent registered (a 3D
 *   model), and a scene blok is held to the server's model policy;
 * - the declared `queries` and `subscriptions` run on the session's clients,
 *   `viewer` is the active login, and `Local(persist=True)` locals are kept on
 *   this device.
 */

/** Where a task or action blok reads the task it is about. */
export const BLOK_TASK_ROOT = 'task';

/** What a blok draws, v2: its tree and what it declares beside it. */
export type MaterializedContent = BlokDeclarations & {
  /** Typed `ComponentNode` tree, in the wire spelling. */
  componentTree?: unknown;
};

/**
 * What the renderer needs of a materialization: a generated
 * `MaterializedBlokFragment`, or one an action's own blok is drawn as.
 */
export type MaterializedBlokData = {
  id: string;
  blok: MaterializedContent;
  /** The revision it shows; null for a provided blok, which draws its own tree. */
  revision?: MaterializedContent | null;
  agentMappings: readonly {
    key: string;
    agent: {
      id: string;
      name?: string | null;
      /** Left out when the caller does not know: then it counts as reachable. */
      connected?: boolean | null;
    };
  }[];
  /** Required dependencies of the revision shown that no agent is bound to here. */
  unboundDependencies?: readonly string[] | null;
  /** What it is opened on (`args.<key>`). */
  args?: unknown;
};

type Mapping = MaterializedBlokData['agentMappings'][number];

/** Where a blok reads one state of the agent bound to a dependency. */
export const depsStatePath = (dependencyKey: string, stateInterface: string) => `deps.${dependencyKey}.${stateInterface}`;

/** Where a blok reads the latest task of an action of a bound agent. */
export const latestTaskPath = (dependencyKey: string, action: string) => `deps.${dependencyKey}.tasks.${action}`;

/** Writes one state of one bound agent into the runtime, under `deps.<key>.<state>`, with its status. */
const BlokStateSync = (props: {dependencyKey: string; stateInterface: string; agentId: string; connected: boolean}) => {
  const {agentId, connected, dependencyKey, stateInterface} = props;
  const {value, revision, known} = useBoundState({agentID: agentId, stateInterface});
  const setRuntimeValue = useBlokRuntime(state => state.setRuntimeValue);
  const clearRuntimeValue = useBlokRuntime(state => state.clearRuntimeValue);
  const setAgentMappingStateUpdate = useBlokRuntime(state => state.setAgentMappingStateUpdate);
  const clearAgentMappingStateUpdate = useBlokRuntime(state => state.clearAgentMappingStateUpdate);
  const setStatus = useBlokRuntime(state => state.setStatus);
  const runtimePath = depsStatePath(dependencyKey, stateInterface);

  React.useEffect(() => {
    setStatus(runtimePath, {status: !known ? 'pending' : connected ? 'ready' : 'stale'});
  }, [connected, known, runtimePath, setStatus]);

  // Write on every update; clearing between updates would flash the seeded value.
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
      setStatus(runtimePath, null);
      clearRuntimeValue(runtimePath);
      clearAgentMappingStateUpdate(dependencyKey, stateInterface);
    },
    [agentId, clearAgentMappingStateUpdate, clearRuntimeValue, dependencyKey, runtimePath, setStatus, stateInterface],
  );

  return null;
};

const RECORD_FIELDS = ['id', 'status', 'progress', 'message', 'error', 'returns', 'ask', 'answer', 'args'] as const;

/** Whether two records say the same; `returns`, `args`, `ask` and `answer` are the events' own values, kept by reference. */
const sameRecord = (a: BlokTaskRecord | undefined, b: BlokTaskRecord): boolean =>
  a !== undefined && RECORD_FIELDS.every(field => a[field] === b[field]);

/**
 * Keeps `deps.<key>.tasks.<action>` on the task the bound agent last ran the
 * action as, whoever started it. Live, that is what `latestTaskStore` holds;
 * below a travel source it is the task the action last ran as at the source's
 * moment, with what that task had reported by then.
 */
const LatestTaskSync = (props: {dependencyKey: string; action: string; agentId: string}) => {
  const {agentId, dependencyKey, action} = props;
  const latest = useLatestTask({agentID: agentId, name: action});
  const source = useBlokTravelSource();
  const setRuntimeValue = useBlokRuntime(state => state.setRuntimeValue);
  const clearRuntimeValue = useBlokRuntime(state => state.clearRuntimeValue);
  const runtimePath = latestTaskPath(dependencyKey, action);

  const implementation = latest?.implementation ?? undefined;
  const past = usePastLatestTasks(source, implementation);
  const record = React.useMemo(() => {
    if (!latest || !implementation) return undefined;
    if (!source) return latest.record;
    return past ? latestTaskRecord(pickLatestTask(past.tasks, implementation, past.at), past.at) : undefined;
  }, [implementation, latest, past, source]);

  // Travelling rebuilds the record at every move of the clock: write only what changed.
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

  return null;
};

const RuntimeSync = (props: {
  agentMappings: readonly Mapping[];
  demandedStates: ReadonlyMap<string, ReadonlySet<string>>;
  demandedTasks: ReadonlyMap<string, ReadonlySet<string>>;
}) => (
  <>
    {props.agentMappings.flatMap(mapping => [
      ...[...(props.demandedStates.get(mapping.key) ?? [])].map(stateInterface => (
        <BlokStateSync
          key={`state-${mapping.key}-${mapping.agent.id}-${stateInterface}`}
          dependencyKey={mapping.key}
          stateInterface={stateInterface}
          agentId={mapping.agent.id}
          connected={mapping.agent.connected !== false}
        />
      )),
      ...[...(props.demandedTasks.get(mapping.key) ?? [])].map(action => (
        <LatestTaskSync
          key={`task-${mapping.key}-${mapping.agent.id}-${action}`}
          dependencyKey={mapping.key}
          action={action}
          agentId={mapping.agent.id}
        />
      )),
    ])}
  </>
);

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
          .then(task => {
            // The record a named call writes learns the task's id as soon as the assign answers.
            observe?.({id: task.id, status: 'queued'});
            bind(reference, task.id);
          })
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

/**
 * The dependencies it cannot act through now, and why: unbound ones, and
 * bound agents that are offline. Their controls show disabled, with the reason.
 */
/** Keeps `task` on the task this blok is about, as it moves. */
const TaskRecordSync = ({task}: {task: BlokTaskRecord}) => {
  const store = useBlokRuntimeStoreApi();
  const written = React.useRef<BlokTaskRecord | undefined>(undefined);
  React.useEffect(() => {
    if (sameRecord(written.current, task)) return;
    written.current = task;
    store.getState().setRuntimeValue(BLOK_TASK_ROOT, task);
  }, [store, task]);
  return null;
};

/**
 * The past cannot be acted on: while the blok shows a moment from it, its
 * agent calls are dropped before they start, with one notice that says why.
 */
const refuseWhileTravelling: BlokRefuseActionHandler = () => {
  toast.info('Viewing the past: actions are paused.', {id: 'blok-travel-paused'});
  return true;
};

export const unavailableDependenciesOf = (
  materializedBlok: Pick<MaterializedBlokData, 'agentMappings' | 'unboundDependencies'>,
): ReadonlyMap<string, string> => {
  const unavailable = new Map<string, string>();
  for (const key of materializedBlok.unboundDependencies ?? []) {
    unavailable.set(key, `No agent is bound to "${key}", so this does nothing`);
  }
  for (const mapping of materializedBlok.agentMappings) {
    if (mapping.agent.connected === false) {
      unavailable.set(mapping.key, `${mapping.agent.name || mapping.key} is offline`);
    }
  }
  return unavailable;
};

/** What a materialization draws: the revision it shows, else (a provided blok) its blok. */
export const shownContent = (materializedBlok: Pick<MaterializedBlokData, 'blok' | 'revision'>): MaterializedContent => {
  const shown = materializedBlok.revision ?? materializedBlok.blok;
  return {
    componentTree: shown.componentTree,
    vocab: shown.vocab,
    resolvedLocals: shown.resolvedLocals,
    demo: shown.demo,
    queries: shown.queries,
    subscriptions: shown.subscriptions,
  };
};

/** Writes the kept locals back as the tree changes them, and what is pending when the blok closes. */
const BlokPersistSync = ({persistence}: {persistence: BlokPersistence}) => {
  const store = useBlokRuntimeStoreApi();
  React.useEffect(() => persistence.attach(store), [persistence, store]);
  return null;
};

type MaterializedBlokRendererProps = {
  materializedBlok: MaterializedBlokData;
  /** The blok takes the height it is given: a screen that is one 3D view. */
  fill?: boolean;
  /** `none`: the roots and nothing else, for a blok drawn into a scene that is already open. */
  chrome?: 'default' | 'none';
  /** What it is opened on, in place of the materialization's own `args`. */
  args?: Record<string, unknown>;
  /** The task this blok is about (a task or action blok): read as `task`. */
  task?: BlokTaskRecord | null;
  /** Answers the open ask of `task`: what `task.answer(values)` calls. */
  onAnswer?: (values: Record<string, unknown>) => unknown;
  /** What else writes into the blok's runtime, rendered inside it. */
  syncs?: React.ReactNode;
};

export const MaterializedBlokRenderer = (props: MaterializedBlokRendererProps) => {
  const shown = React.useMemo(() => shownContent(props.materializedBlok), [props.materializedBlok]);
  const locals = React.useMemo(() => declaredLocals(shown), [shown]);
  const persistence = useBlokPersistence(props.materializedBlok.id, locals);
  // The kept locals are read before the first render, so the blok opens as it was left.
  if (persistence === undefined) return null;
  return <MaterializedBlokView {...props} shown={shown} persistence={persistence} />;
};

const MaterializedBlokView = ({
  materializedBlok,
  fill,
  chrome,
  args: givenArgs,
  task,
  onAnswer,
  syncs,
  shown,
  persistence,
}: MaterializedBlokRendererProps & {shown: MaterializedContent; persistence: BlokPersistence | null}) => {
  const dispatchAction = useMaterializedDispatchAction(materializedBlok.agentMappings);
  const travelAt = useBlokTravelMoment();
  const travelling = useBlokTravelSource() !== null;
  const viewer = useBlokViewer();
  const readExecutor = useServiceReads();
  const componentState = useBlokComponentStore(materializedBlok.id);
  const unavailableDependencies = React.useMemo(
    () => unavailableDependenciesOf(materializedBlok),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [materializedBlok.agentMappings, materializedBlok.unboundDependencies],
  );
  const {roots} = React.useMemo(
    () => normalizeBlokComponentTree(shown.componentTree as unknown[] | null),
    [shown.componentTree],
  );
  const agents = React.useMemo(
    () => new Map(materializedBlok.agentMappings.map(mapping => [mapping.key, mapping.agent.id] as const)),
    [materializedBlok.agentMappings],
  );
  const queries = React.useMemo(() => declaredQueries(shown), [shown]);
  const subscriptions = React.useMemo(() => declaredSubscriptions(shown), [shown]);
  const readVariables = React.useMemo(
    () => [...queries, ...subscriptions].flatMap(read => read.variables ?? []),
    [queries, subscriptions],
  );
  const dependencyKeys = React.useMemo(() => new Set(agents.keys()), [agents]);
  const demandedStates = React.useMemo(
    () => collectDemandedStateInterfaces(roots, dependencyKeys, readVariables),
    [dependencyKeys, readVariables, roots],
  );
  const demandedTasks = React.useMemo(
    () => collectDemandedLatestTasks(roots, dependencyKeys, readVariables),
    [dependencyKeys, readVariables, roots],
  );

  // Seeded once: the syncs follow later changes.
  const {initialState, statuses} = React.useMemo(() => {
    const live = liveModel(roots, shown);
    const deps = Object.fromEntries(
      materializedBlok.agentMappings.map(mapping => [mapping.key, {id: mapping.agent.id, name: mapping.agent.name, tasks: {}}]),
    );
    const args = givenArgs ?? (isArgs(materializedBlok.args) ? materializedBlok.args : {});
    const pending: Record<string, BlokSourceStatus> = {...live.statuses};
    demandedStates.forEach((states, key) => states.forEach(state => (pending[depsStatePath(key, state)] = {status: 'pending'})));
    return {initialState: {...live.data, deps, args, ...(task ? {[BLOK_TASK_ROOT]: task} : {})}, statuses: pending};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, roots]);

  const rendered = (
    <RekuestAssetHost agents={agents}>
      <BlokRenderer
        // Opened again when what it keeps changes: the kept values seed a new runtime.
        key={persistence ? [...persistence.keys].join('\u0000') : undefined}
        uiComponents={roots}
        initialState={initialState}
        statuses={statuses}
        keptValues={persistence?.initial}
        keptRoots={persistence?.keys}
        dispatchAction={dispatchAction}
        refuseAction={travelling ? refuseWhileTravelling : undefined}
        unavailableDependencies={unavailableDependencies}
        unboundDependencies={materializedBlok.unboundDependencies}
        travelAt={travelAt}
        viewer={viewer}
        queries={queries}
        subscriptions={subscriptions}
        readExecutor={readExecutor}
        answerTask={onAnswer}
        componentState={componentState}
        chrome={chrome}
        fill={fill}
      >
        <RuntimeSync agentMappings={materializedBlok.agentMappings} demandedStates={demandedStates} demandedTasks={demandedTasks} />
        {task && <TaskRecordSync task={task} />}
        {persistence && <BlokPersistSync persistence={persistence} />}
        {syncs}
      </BlokRenderer>
    </RekuestAssetHost>
  );
  // Always the scene host, as orkestrator: an html blok may hold a `Scene` too.
  return <RekuestSceneHost>{rendered}</RekuestSceneHost>;
};

const isArgs = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export default MaterializedBlokRenderer;
