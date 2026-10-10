import type { ApolloClient } from "@apollo/client";
import { presignUrl } from "@/lib/datalayer/presign";
import type { DatalayerEndpoint } from "@/lib/datalayer/useDatalayer";
import {
  GeneralMediaAccessGrantFragment,
  RequestGeneralMediaAccessDocument,
  RequestGeneralMediaAccessMutation,
  RequestGeneralMediaAccessMutationVariables,
} from "../api/graphql";
import { grantExpiresAt, signingWindow } from "./window";

type Client = ApolloClient<any>;
type Credentials = GeneralMediaAccessGrantFragment & { expiresAt: number };

/** Ask again this long before a grant runs out, so a url signed at the end still loads. */
const REFRESH_SKEW_MS = 60_000;

type Entry = { credentials?: Credentials; pending?: Promise<Credentials> };
/** One grant per client: a profile switch builds a new client, and its grant is another organization's. */
const grants = new WeakMap<Client, Entry>();

const mediaCredentials = (client: Client): Promise<Credentials> => {
  const entry = grants.get(client) ?? {};
  grants.set(client, entry);
  if (entry.credentials && Date.now() < entry.credentials.expiresAt - REFRESH_SKEW_MS) {
    return Promise.resolve(entry.credentials);
  }
  if (entry.pending) return entry.pending;

  entry.pending = client
    .mutate<RequestGeneralMediaAccessMutation, RequestGeneralMediaAccessMutationVariables>({
      mutation: RequestGeneralMediaAccessDocument,
      variables: { input: {} },
    })
    .then(({ data }) => {
      const grant = data?.requestGeneralMediaAccess;
      if (!grant) throw new Error("No media access was granted");
      entry.credentials = { ...grant, expiresAt: grantExpiresAt(grant.expiresIn, Date.now()) };
      return entry.credentials;
    })
    .finally(() => {
      entry.pending = undefined;
    });
  return entry.pending;
};

/**
 * A url an `<Image>` can load for a media object (a snapshot). Signed from the
 * start of the hour, so the same picture has the same url all hour and the
 * image cache answers every later tile.
 */
export const mediaUrl = async (
  media: { key: string },
  client: Client,
  datalayer: DatalayerEndpoint,
): Promise<string> => {
  const credentials = await mediaCredentials(client);
  const { at, expiresSeconds } = signingWindow(Date.now(), credentials.expiresAt);
  return presignUrl(
    { url: `${datalayer.own}/${credentials.bucket}/${media.key}`, credentials, at, expiresSeconds },
    datalayer.reached,
  );
};
