import type {ApolloClient} from '@apollo/client';
import * as React from 'react';
import {presignUrl} from '@/lib/datalayer/presign';
import {useDatalayer, type DatalayerEndpoint} from '@/lib/datalayer/useDatalayer';
import {grantExpiresAt, signingWindow} from '@/lib/mikro/media/window';
import {
  BlokAssetHostProvider,
  type BlokAsset,
  type BlokAssetBytes,
  type BlokAssetHost,
} from '@/lib/ports/blok/assets';
import {modelBytes} from '@/lib/scene/assetCache';
import {
  RequestMediaAccessDocument,
  useAgentAssetsQuery,
  type MediaAccessGrantFragment,
  type MediaStoreFragment,
  type RequestMediaAccessMutation,
  type RequestMediaAccessMutationVariables,
} from '../api/graphql';
import {useRekuestClient} from '../useTaskStream';

/**
 * rekuest as the host of a blok's assets (orkestrator's `RekuestAssetHost`):
 * `@<dependency>.assets.<name>` is the file the agent bound to `dependency`
 * registered as `name`.
 *
 * An agent declares its assets when it registers and uploads them right after,
 * so a blok can be shown before its files are there: the asset is then
 * awaited, and asked for again until it arrives. A file the agent only names a
 * source for is added by an admin, from the desktop app.
 *
 * A stored model is read from the phone's cache when it was opened before
 * (`lib/scene/assetCache`), and otherwise fetched with a presigned URL.
 */

type Client = ApolloClient<unknown>;
type Credentials = MediaAccessGrantFragment & {expiresAt: number};

/** Ask again this long before a grant runs out. */
const REFRESH_SKEW_MS = 60_000;

/** Grants are per stored object; one per store id, per client (a profile switch builds another client). */
const grants = new WeakMap<Client, Map<string, Promise<Credentials>>>();

const credentialsFor = (store: MediaStoreFragment, client: Client): Promise<Credentials> => {
  const byStore = grants.get(client) ?? new Map<string, Promise<Credentials>>();
  grants.set(client, byStore);
  const cached = byStore.get(store.id);
  if (cached) return cached;
  const request = client
    .mutate<RequestMediaAccessMutation, RequestMediaAccessMutationVariables>({
      mutation: RequestMediaAccessDocument,
      variables: {input: {storeId: store.id}},
    })
    .then(({data}) => {
      const grant = data?.requestMediaAccess;
      if (!grant) throw new Error('No access to the asset store was granted.');
      const credentials = {...grant, expiresAt: grantExpiresAt(grant.expiresIn, Date.now())};
      setTimeout(
        () => {
          if (byStore.get(store.id) === request) byStore.delete(store.id);
        },
        Math.max(0, credentials.expiresAt - REFRESH_SKEW_MS - Date.now()),
      );
      return credentials;
    })
    .catch((error: unknown) => {
      if (byStore.get(store.id) === request) byStore.delete(store.id);
      throw error;
    });
  byStore.set(store.id, request);
  return request;
};

const assetUrl = async (store: MediaStoreFragment, client: Client, datalayer: DatalayerEndpoint): Promise<string> => {
  const credentials = await credentialsFor(store, client);
  const {at, expiresSeconds} = signingWindow(Date.now(), credentials.expiresAt);
  return presignUrl(
    {url: `${datalayer.own}/${credentials.bucket}/${credentials.key}`, credentials, at, expiresSeconds},
    datalayer.reached,
  );
};

const AWAITED_ASSET_POLL_MS = 5000;

/** The agent each dependency key of the blok being rendered is bound to. */
const BoundAgentsContext = React.createContext<ReadonlyMap<string, string>>(new Map());

const useAsset = (dependency: string, name: string): BlokAsset => {
  const client = useRekuestClient() as Client;
  const datalayer = useDatalayer();
  const agent = React.useContext(BoundAgentsContext).get(dependency);
  const {data, loading, error, startPolling, stopPolling} = useAgentAssetsQuery({
    variables: {id: agent ?? ''},
    skip: !agent || !name,
  });

  const declared = data?.agent.assets.find(candidate => candidate.name === name);
  const file = declared?.asset?.file;
  const stored = declared?.asset?.ref;
  const awaited = Boolean(declared) && !declared?.asset;
  React.useEffect(() => {
    if (!awaited) return;
    startPolling(AWAITED_ASSET_POLL_MS);
    return stopPolling;
  }, [awaited, startPolling, stopPolling]);

  const load = React.useCallback(async (): Promise<BlokAssetBytes> => {
    if (!file || !stored) throw new Error('This asset is not stored.');
    return modelBytes(stored, async () => {
      if (!datalayer) throw new Error('This deployment has no asset store to fetch the model from.');
      return assetUrl(file, client, datalayer);
    });
  }, [client, datalayer, file, stored]);

  return React.useMemo<BlokAsset>(() => {
    if (!name) return {status: 'unknown', reason: 'No asset is named.'};
    if (!agent) return {status: 'unknown', reason: `"${dependency}" is not bound to an agent.`};
    if (declared?.asset) return {status: 'ready', ref: declared.asset.ref, kind: declared.asset.kind, load};
    if (declared) {
      const source = declared.source ? {host: hostOf(declared.source)} : undefined;
      return {status: 'awaited', kind: declared.kind, source};
    }
    if (loading) return {status: 'loading'};
    if (error) return {status: 'unknown', reason: `The asset store could not be asked: ${error.message}`};
    return {status: 'unknown', reason: `Its app registers no asset named "${name}".`};
  }, [agent, declared, dependency, error, load, loading, name]);
};

const hostOf = (source: string): string => /^[a-z]+:\/\/([^/:?#]+)/i.exec(source)?.[1] ?? source;

const HOST: BlokAssetHost = {useAsset};

export const RekuestAssetHost = ({
  agents,
  children,
}: {
  /** Dependency key to the id of the agent it is bound to. */
  agents: ReadonlyMap<string, string>;
  children: React.ReactNode;
}) => (
  <BoundAgentsContext.Provider value={agents}>
    <BlokAssetHostProvider value={HOST}>{children}</BlokAssetHostProvider>
  </BoundAgentsContext.Provider>
);
