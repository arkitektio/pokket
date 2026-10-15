import * as React from 'react';
import {View} from 'react-native';
import {toast} from 'sonner-native';
import {Text} from '@/components/ui/text';
import {
  BlokNode,
  BlokRuntimeProvider,
  BlokTreeProvider,
  createBlokRuntimeStore,
  preflightBlokDocument,
  type BlokCatalog,
  type BlokDispatchActionHandler,
  type BlokInvokeFunctionHandler,
  type BlokRefuseActionHandler,
  type BlokTree,
} from '@/lib/ports/blok/runtime';
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
  /** Mounted inside the runtime: what syncs agent state into it. */
  children?: React.ReactNode;
};

/**
 * Orkestrator's `BlokRenderer`, for the phone: the same runtime store and
 * tree, without the 3D scene, the embedded mode or the debug inspector. The
 * caller scrolls; the roots stack at their own heights.
 */
export default function BlokRenderer({
  uiComponents,
  initialState,
  catalog = pokketBlokCatalog,
  invokeFunction,
  dispatchAction,
  refuseAction,
  children,
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
    () => invokeFunction ?? ((name, args, options) => catalog.invokeFunction(name, args, options)),
    [catalog, invokeFunction],
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
    }),
  );

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

  return (
    <BlokRuntimeProvider store={runtimeStore}>
      <BlokTreeProvider tree={tree}>
        {children}
        <View className="gap-3">
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
            <View key={rootId} className="min-w-0">
              <BlokNode id={rootId} />
            </View>
          ))}
        </View>
      </BlokTreeProvider>
    </BlokRuntimeProvider>
  );
}
