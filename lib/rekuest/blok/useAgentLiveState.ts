import type { ApolloClient } from "@apollo/client";
import { useCallback, useSyncExternalStore } from "react";
import {
  WatchStateDocument,
  type WatchStateSubscription,
  type WatchStateSubscriptionVariables,
} from "../api/graphql";
import { useRekuestClient } from "../useTaskStream";
import { createLiveStateStore, EMPTY_LIVE_STATE } from "./liveStateStore";
import { latestTaskStore, type LatestTaskState } from "./latestTaskStore";

/**
 * One `WatchState` subscription per `(agentID, interface)` shared by every
 * consumer, patches coalesced to one publish per animation frame — see
 * `./liveStateStore.ts`. A port of orkestrator's `useAgentLiveState`.
 */
const agentLiveStateStore = createLiveStateStore<ApolloClient<unknown>>({
  subscribe: (client, variables, handlers) => {
    const subscription = client
      .subscribe<WatchStateSubscription, WatchStateSubscriptionVariables>({
        query: WatchStateDocument,
        variables: { agentID: variables.agentID, interface: variables.interface },
      })
      .subscribe({
        next: (result) => {
          const event = result.data?.watchState;
          if (event) handlers.next(event);
        },
        error: handlers.error,
      });
    return () => subscription.unsubscribe();
  },
});

const unwatched = () => () => {};

/** The live value of one state of one agent; `known` once the server has answered. */
export const useAgentLiveState = ({ agentID, stateInterface }: { agentID?: string; stateInterface?: string }) => {
  const client = useRekuestClient() as ApolloClient<unknown>;
  const active = !!agentID && !!stateInterface && !!client;

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      active ? agentLiveStateStore.acquire(client, agentID as string, stateInterface as string, onStoreChange) : unwatched(),
    [active, client, agentID, stateInterface],
  );
  const getSnapshot = useCallback(
    () => (active ? agentLiveStateStore.getSnapshot(agentID as string, stateInterface as string) : EMPTY_LIVE_STATE),
    [active, agentID, stateInterface],
  );

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { value: snapshot.value, revision: snapshot.revision, known: snapshot.value !== null };
};

/**
 * The task `agentID`'s action `name` last ran as, live. `null` until the
 * server has answered; from then on it changes only when the task does.
 */
export const useLatestTask = ({ agentID, name }: { agentID?: string; name?: string }): LatestTaskState | null => {
  const client = useRekuestClient() as ApolloClient<unknown>;
  const active = !!agentID && !!name && !!client;

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      active ? latestTaskStore.acquire(client, agentID as string, name as string, onStoreChange) : unwatched(),
    [active, agentID, client, name],
  );
  const getSnapshot = useCallback(
    () => (active ? latestTaskStore.getSnapshot(agentID as string, name as string) : EMPTY_LIVE_STATE),
    [active, agentID, name],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).value as LatestTaskState | null;
};
