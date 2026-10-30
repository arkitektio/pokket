import * as React from 'react';
import {View} from 'react-native';
import {toast} from 'sonner-native';
import {Text} from '@/components/ui/text';
import {cn} from '@/lib/utils';
import {invokeBlokFunction} from '@arkitektio/bsx/renderer/functions/v2/handler';
import {BlokComponentStateContext, type BlokComponentStateStore} from '@arkitektio/bsx/renderer/persist';
import {
  BlokNode,
  BlokReads,
  BlokRuntimeProvider,
  BlokTreeProvider,
  BlokViewerSync,
  createBlokRuntimeStore,
  dependencyStatusPath,
  preflightBlokDocument,
  unboundDependencyStatus,
  unboundDependencyStatuses,
  type BlokCatalog,
  type BlokDispatchActionHandler,
  type BlokInvokeFunctionHandler,
  type BlokQuery,
  type BlokReadExecutor,
  type BlokRefuseActionHandler,
  type BlokSourceStatus,
  type BlokSubscription,
  type BlokTree,
  type BlokUnavailableDependencies,
  type BlokViewer,
} from '@arkitektio/bsx/runtime';
import {pokketBlokCatalog} from './catalog';

type BlokRendererProps = {
  uiComponents?: unknown;
  initialState?: unknown;
  /** Component/function catalog to validate and render against. */
  catalog?: BlokCatalog;
  invokeFunction?: BlokInvokeFunctionHandler;
  dispatchAction?: BlokDispatchActionHandler;
  /** Drops the agent calls it answers `true` for, before they start. */
  refuseAction?: BlokRefuseActionHandler;
  /** Dependencies it cannot act through now, with why: controls calling them show disabled. */
  unavailableDependencies?: BlokUnavailableDependencies;
  /**
   * Dependencies bound to no agent: each reads as failed (`deps.unbound`),
   * its tasks and assets too, never as ready with null.
   */
  unboundDependencies?: readonly string[] | null;
  /**
   * Locals kept from an earlier opening, by top-level key, shown from the
   * first render on (`lib/ports/blok/persist.ts`). Read once, when the renderer mounts.
   */
  keptValues?: Record<string, unknown>;
  /** The top-level keys kept between openings: swapping the payload leaves their values alone. */
  keptRoots?: ReadonlySet<string>;
  /** Source statuses known before the first render, by data-model path (`deps.robot.arm`: pending). */
  statuses?: Readonly<Record<string, BlokSourceStatus>>;
  /** The moment the blok shows while travelling (ISO 8601): commands and toasts are off, inputs read-only. */
  travelAt?: string | null;
  /** Who is looking: `viewer`. */
  viewer?: BlokViewer | null;
  /** The blok's declared reads, and how they run; a preview runs none (it seeds `demo.queries`). */
  queries?: readonly BlokQuery[];
  subscriptions?: readonly BlokSubscription[];
  readExecutor?: BlokReadExecutor;
  /** Answers the open ask of `task` (`task.answer(values)`). */
  answerTask?: (values: Record<string, unknown>) => unknown;
  /** Where `persist` components keep their state by id; none: they keep nothing. */
  componentState?: BlokComponentStateStore | null;
  /** Mounted inside the runtime: what syncs agent state into it. */
  children?: React.ReactNode;
  /**
   * `none` draws the roots and nothing else: no spacing between them, and no
   * card for an empty or unparseable payload. For a drawing in a box, a logo's.
   */
  chrome?: 'default' | 'none';
  /** The roots take the height they are given instead of their own: a screen that is one 3D view. */
  fill?: boolean;
};

const NO_QUERIES: readonly BlokQuery[] = Object.freeze([]);
const NO_SUBSCRIPTIONS: readonly BlokSubscription[] = Object.freeze([]);

/**
 * Orkestrator's `BlokRenderer`, for the phone: the same runtime store and
 * tree, without the embedded mode or the debug inspector. `then` is
 * `travelAt`, null live. The caller scrolls; the roots stack at their own
 * heights, unless they `fill` the caller.
 */
export default function BlokRenderer({
  uiComponents,
  initialState,
  catalog = pokketBlokCatalog,
  invokeFunction,
  dispatchAction,
  refuseAction,
  unavailableDependencies,
  unboundDependencies,
  keptValues,
  keptRoots,
  statuses,
  travelAt = null,
  viewer = null,
  queries = NO_QUERIES,
  subscriptions = NO_SUBSCRIPTIONS,
  readExecutor,
  answerTask,
  componentState = null,
  children,
  chrome = 'default',
  fill = false,
}: BlokRendererProps) {
  const preflight = React.useMemo(
    () => preflightBlokDocument(uiComponents, catalog),
    [catalog, uiComponents],
  );

  const tree = React.useMemo<BlokTree>(
    () => ({
      catalog,
      nodes: preflight.nodes,
      invalidNodes: preflight.invalidNodes,
    }),
    [catalog, preflight],
  );

  const resolvedInvokeFunction = React.useMemo<BlokInvokeFunctionHandler>(
    () => invokeFunction ?? invokeBlokFunction,
    [invokeFunction],
  );

  const resolvedDispatchAction = React.useMemo<BlokDispatchActionHandler>(
    () =>
      dispatchAction ??
      (action => {
        toast.info(
          action.dependency
            ? `Preview: ${action.operation} on ${action.dependency}`
            : `Preview: ${action.operation}`,
        );
      }),
    [dispatchAction],
  );

  // Seeded with the handlers, not just synced in the effects below: nodes
  // resolve their props during the first render, before any effect has run.
  const [runtimeStore] = React.useState(() =>
    createBlokRuntimeStore({
      initialDataModel: initialState,
      invokeFunction: resolvedInvokeFunction,
      dispatchAction: resolvedDispatchAction,
      refuseAction,
      unavailableDependencies,
      keptValues,
      keptRoots,
      statuses: unboundDependencies?.length ? {...statuses, ...unboundDependencyStatuses(unboundDependencies)} : statuses,
      travelAt,
      answerTask,
    }),
  );

  // A dependency bound later reads its agent again; one unbound later reads failed.
  const unboundKey = (unboundDependencies ?? []).join('\u0000');
  const unboundRef = React.useRef<readonly string[]>(unboundDependencies ?? []);
  React.useEffect(() => {
    const next = unboundKey ? unboundKey.split('\u0000') : [];
    const {setStatus} = runtimeStore.getState();
    for (const key of unboundRef.current) if (!next.includes(key)) setStatus(dependencyStatusPath(key), null);
    for (const key of next) setStatus(dependencyStatusPath(key), unboundDependencyStatus(key));
    unboundRef.current = next;
  }, [unboundKey, runtimeStore]);

  React.useEffect(() => {
    runtimeStore.getState().setTravelAt(travelAt);
  }, [travelAt, runtimeStore]);

  React.useEffect(() => {
    runtimeStore.getState().setAnswerTask(answerTask);
  }, [answerTask, runtimeStore]);

  React.useEffect(() => {
    if (keptRoots) runtimeStore.getState().setKeptRoots(keptRoots);
  }, [keptRoots, runtimeStore]);

  React.useEffect(() => {
    runtimeStore.getState().setInitialDataModel(initialState);
  }, [initialState, runtimeStore]);

  React.useEffect(() => {
    runtimeStore.getState().setInvokeFunction(resolvedInvokeFunction);
  }, [resolvedInvokeFunction, runtimeStore]);

  React.useEffect(() => {
    runtimeStore.getState().setDispatchAction(resolvedDispatchAction);
  }, [resolvedDispatchAction, runtimeStore]);

  React.useEffect(() => {
    runtimeStore.getState().setRefuseAction(refuseAction);
  }, [refuseAction, runtimeStore]);

  React.useEffect(() => {
    if (unavailableDependencies) runtimeStore.getState().setUnavailableDependencies(unavailableDependencies);
  }, [unavailableDependencies, runtimeStore]);

  // Swapping the payload in place must not carry the previous blok's local
  // edits — the paths they were written against no longer mean the same thing.
  const previousNodesRef = React.useRef(preflight.nodes);
  React.useEffect(() => {
    if (previousNodesRef.current !== preflight.nodes) {
      previousNodesRef.current = preflight.nodes;
      runtimeStore.getState().resetRuntimeValues();
    }
  }, [preflight.nodes, runtimeStore]);

  // Errors that belong to a node render inline at that node; only payload-level
  // problems (a root that could not be parsed at all) are summarized here.
  const documentErrors = preflight.errors.filter(error => !error.componentId);
  const renderableRootIds = preflight.rootIds.filter(
    rootId => preflight.nodes.has(rootId) || preflight.invalidNodes.has(rootId),
  );

  const syncs = (
    <>
      <BlokViewerSync viewer={viewer} />
      {readExecutor && (queries.length > 0 || subscriptions.length > 0) ? (
        <BlokReads queries={queries} subscriptions={subscriptions} executor={readExecutor} />
      ) : null}
    </>
  );

  if (chrome === 'none') {
    return (
      <BlokComponentStateContext.Provider value={componentState}>
        <BlokRuntimeProvider store={runtimeStore}>
          <BlokTreeProvider tree={tree}>
            {children}
            {syncs}
            {renderableRootIds.map(rootId => (
              <BlokNode key={rootId} id={rootId} />
            ))}
          </BlokTreeProvider>
        </BlokRuntimeProvider>
      </BlokComponentStateContext.Provider>
    );
  }

  return (
    <BlokComponentStateContext.Provider value={componentState}>
    <BlokRuntimeProvider store={runtimeStore}>
      <BlokTreeProvider tree={tree}>
        {children}
        {syncs}
        <View className={cn('gap-3', fill && 'flex-1')}>
          {documentErrors.length > 0 && (
            <View className="rounded-xl border border-destructive/30 bg-card p-4">
              <Text className="text-sm font-semibold text-destructive">
                Blok payload could not be parsed
              </Text>
              {documentErrors.map((error, index) => (
                <Text key={`${error.path}-${index}`} className="mt-1 text-sm">
                  <Text className="font-mono text-xs text-destructive">{error.path}</Text> {error.message}
                </Text>
              ))}
            </View>
          )}

          {renderableRootIds.length === 0 && documentErrors.length === 0 && (
            <View className="min-h-48 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6">
              <Text className="text-sm text-muted-foreground">This blok has no components.</Text>
            </View>
          )}

          {renderableRootIds.map(rootId => (
            <View key={rootId} className={cn('min-w-0', fill && 'flex-1')}>
              <BlokNode id={rootId} />
            </View>
          ))}
        </View>
      </BlokTreeProvider>
    </BlokRuntimeProvider>
    </BlokComponentStateContext.Provider>
  );
}
