import * as React from 'react';
import type {ApolloClient} from '@apollo/client';
import {BlokSceneStillProvider} from '@/components/blok/catalog/scene/host';
import {
  CheckoutAgentDocument,
  type CheckoutAgentQuery,
  type CheckoutAgentQueryVariables,
  CheckoutAgentRevisionDocument,
  type CheckoutAgentRevisionQuery,
  type CheckoutAgentRevisionQueryVariables,
  SessionBoundariesDocument,
  type SessionBoundariesQuery,
  type SessionBoundariesQueryVariables,
} from '../api/graphql';
import {useAgentLiveState} from '../blok/useAgentLiveState';
import {useRekuestClient} from '../useTaskStream';
import {createTravelSource, EMPTY_TRAVEL_STATE, type TravelSnapshot, type TravelSource} from './travelSource';

/**
 * Whether the bloks below show the present or a moment in the past
 * (orkestrator's `rekuest/travel/context.tsx`).
 *
 * `null` is the present: every blok watches its agents live. A source is the
 * past: every blok below reads its agents' state from it, at the source's one
 * clock. The provider goes above the scene surface, not inside one blok: the
 * cards a scene opens (a model's decorations, `OnClick open=`) are bloks of
 * their own and must show the same moment.
 */
const BlokTravelContext = React.createContext<TravelSource | null>(null);

export const BlokTravelProvider = ({source, children}: {source: TravelSource | null; children: React.ReactNode}) => (
  <BlokTravelContext.Provider value={source}>
    <BlokSceneStillProvider value={source !== null}>{children}</BlokSceneStillProvider>
  </BlokTravelContext.Provider>
);

export const useBlokTravelSource = (): TravelSource | null => React.useContext(BlokTravelContext);

const unwatched = () => {};

/**
 * One state of one agent as the surrounding blok should show it: live, or at
 * the moment the travel source stands on. `known: false` means there is no
 * answer yet and whatever is shown stays.
 */
export const useBoundState = ({agentID, stateInterface}: {agentID: string; stateInterface: string}): TravelSnapshot => {
  const source = useBlokTravelSource();
  // No agent is no subscription: the live one rests while the past is shown.
  const live = useAgentLiveState({agentID: source ? undefined : agentID, stateInterface});

  const subscribe = React.useCallback(
    (onStoreChange: () => void) => (source ? source.acquire(agentID, stateInterface, onStoreChange) : unwatched),
    [agentID, source, stateInterface],
  );
  const getSnapshot = React.useCallback(
    () => (source ? source.getSnapshot(agentID, stateInterface) : EMPTY_TRAVEL_STATE),
    [agentID, source, stateInterface],
  );
  const travelled = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return React.useMemo(
    () => (source ? travelled : {value: live.value, revision: live.revision, known: live.known}),
    [live.known, live.revision, live.value, source, travelled],
  );
};

/** What the travel source asks rekuest for, on a client that may change under it. */
export const rekuestCheckout =
  (client: () => ApolloClient<unknown> | null): Parameters<typeof createTravelSource>[0]['checkout'] =>
  async (agent, request) => {
    const rekuest = client();
    if (!rekuest) throw new Error('Rekuest is not connected.');
    if (request.revision) {
      // A revision restarts with every session of the agent: never one without the other.
      const {globalRevision, sessionId} = request.revision;
      const result = await rekuest.query<CheckoutAgentRevisionQuery, CheckoutAgentRevisionQueryVariables>({
        query: CheckoutAgentRevisionDocument,
        variables: {
          agent,
          ...(globalRevision === null
            ? {timestamp: new Date(request.timestamp).toISOString()}
            : {globalRevision, sessionId}),
          forwardPatchCount: request.forwardPatchCount,
          backwardPatchCount: request.backwardPatchCount,
        },
        fetchPolicy: 'no-cache',
      });
      return result.data.checkoutAgent;
    }
    const result = await rekuest.query<CheckoutAgentQuery, CheckoutAgentQueryVariables>({
      query: CheckoutAgentDocument,
      variables: {
        agent,
        timestamp: new Date(request.timestamp).toISOString(),
        forwardPatchCount: request.forwardPatchCount,
        backwardPatchCount: request.backwardPatchCount,
      },
      // Every moment a slider passes would otherwise stay in the cache for good.
      fetchPolicy: 'no-cache',
    });
    return result.data.checkoutAgent;
  };

/** What a source asks through, kept current by the hook that holds it. */
class SourceLink {
  client: ApolloClient<unknown> | null = null;
  onReachedLive: (() => void) | undefined = undefined;

  follow(client: ApolloClient<unknown>, onReachedLive: (() => void) | undefined) {
    this.client = client;
    this.onReachedLive = onReachedLive;
  }
}

/** A travel source on whatever client `link` holds when it asks. */
const rekuestTravelSource = (link: SourceLink): TravelSource =>
  createTravelSource({
    checkout: rekuestCheckout(() => link.client),
    sessionEnd: async (_agent, sessionId) => {
      if (!link.client) throw new Error('Rekuest is not connected.');
      const result = await link.client.query<SessionBoundariesQuery, SessionBoundariesQueryVariables>({
        query: SessionBoundariesDocument,
        variables: {sessionId},
        // A session that is still running grows.
        fetchPolicy: 'no-cache',
      });
      return result.data.sessionBoundaries?.endGlobalRevision ?? null;
    },
    onReachedLive: () => link.onReachedLive?.(),
  });

/**
 * A travel source on rekuest's client. It asks nothing until something below
 * a `BlokTravelProvider` watches it.
 */
export const useRekuestTravelSource = (options?: {onReachedLive?: () => void}): TravelSource => {
  const client = useRekuestClient() as ApolloClient<unknown>;
  const onReachedLive = options?.onReachedLive;
  const [{link, source}] = React.useState(() => {
    const held = new SourceLink();
    return {link: held, source: rekuestTravelSource(held)};
  });
  // Before any blok below watches the source, so its first request has the client.
  React.useLayoutEffect(() => link.follow(client, onReachedLive), [client, link, onReachedLive]);

  React.useEffect(() => () => source.stop(), [source]);

  return source;
};

const noClock = () => () => undefined;
const noMoment = () => null;

/**
 * The moment the bloks below show, as the `travelAt` a blok renderer takes:
 * the travel clock (ISO 8601, to the second) while a source is set, null live.
 * Inputs are read at it, queries get it as `then`, and commands and toasts
 * are off.
 */
export const useBlokTravelMoment = (): string | null => {
  const source = useBlokTravelSource();
  const subscribe = React.useCallback(
    (listener: () => void) => (source ? source.subscribe(listener) : noClock()),
    [source],
  );
  const getSnapshot = React.useCallback(() => {
    if (!source) return null;
    const at = source.getClock().at;
    return Number.isFinite(at) ? new Date(Math.floor(at / 1000) * 1000).toISOString() : null;
  }, [source]);
  return React.useSyncExternalStore(subscribe, source ? getSnapshot : noMoment, source ? getSnapshot : noMoment);
};
