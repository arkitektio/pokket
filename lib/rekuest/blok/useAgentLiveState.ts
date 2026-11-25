import { useCallback, useSyncExternalStore } from "react";
import type { RekuestSession } from "../session/client";
import { toStatePatchEvent, toStateSnapshotEvent, type StatesSnapshot, type WirePatch } from "../session/frames";
import { useRekuestSession } from "../session/hooks";
import { createLiveStateStore, EMPTY_LIVE_STATE } from "./liveStateStore";
import { latestTaskStore, type LatestTaskState } from "./latestTaskStore";

/**
 * One watch per `(agentID, interface)` shared by every consumer, patches
 * coalesced to one publish per animation frame (`./liveStateStore.ts`), over
 * the app's caller session (`state:<agent>/<interface>`): the state's snapshot
 * (its newest checkpoint with the patches after it applied), then each patch;
 * a resume replays the patches missed. orkestrator's `useAgentLiveState`.
 */
const agentLiveStateStore = createLiveStateStore<RekuestSession>({
  subscribe: (session, variables, handlers) =>
    session.watch(`state:${variables.agentID}/${variables.interface}`, {
      onData: (item) => {
        const patch = toStatePatchEvent(item as WirePatch);
        handlers.next({ __typename: "StatePatchEvent", ops: patch.ops, globalRevision: patch.globalRevision });
      },
      onResync: (snapshot) => {
        const event = toStateSnapshotEvent(snapshot as StatesSnapshot, variables.interface);
        handlers.next({ __typename: "StateSnapshotEvent", value: event?.value ?? null, globalRevision: event?.globalRevision ?? 0 });
      },
      onRefused: (error) => handlers.error(new Error(error)),
    }),
});

const unwatched = () => () => {};

/** The live value of one state of one agent; `known` once the server has answered. */
export const useAgentLiveState = ({ agentID, stateInterface }: { agentID?: string; stateInterface?: string }) => {
  const session = useRekuestSession();
  const active = !!agentID && !!stateInterface;

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      active ? agentLiveStateStore.acquire(session, agentID as string, stateInterface as string, onStoreChange) : unwatched(),
    [active, session, agentID, stateInterface],
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
  const session = useRekuestSession();
  const active = !!agentID && !!name;

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      active ? latestTaskStore.acquire(session, agentID as string, name as string, onStoreChange) : unwatched(),
    [active, agentID, session, name],
  );
  const getSnapshot = useCallback(
    () => (active ? latestTaskStore.getSnapshot(agentID as string, name as string) : EMPTY_LIVE_STATE),
    [active, agentID, name],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).value as LatestTaskState | null;
};
