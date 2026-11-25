import type { ApolloClient } from "@apollo/client";
import { AppState } from "react-native";
import rekuestResult from "@/lib/rekuest/api/fragments";
import { aliasToWsPath } from "../arkitekt/alias/helpers";
import { createGraphQLServiceBuilder } from "../arkitekt/builders/graphQlServiceBuidler";
import { ServiceDefinition } from "../arkitekt/provider";
import type { Service, ServiceBuilder } from "../arkitekt/types";
import { RekuestSession } from "./session/client";

/** rekuest's service: its Apollo client, and beside it the app's caller session on takt. */
export type RekuestService = Service<ApolloClient<any>> & { readonly session: RekuestSession };

const graphql = createGraphQLServiceBuilder(rekuestResult.possibleTypes);

/** The sessions open now (one, but for a moment while a connection is replaced). */
const live = new Set<RekuestSession>();
let waking = false;

/**
 * Back in the foreground, the sessions reconnect at once instead of waiting
 * out their backoff: iOS takes a suspended app's sockets, and Android's may
 * have died with the network it was on.
 */
const wakeOnForeground = () => {
  if (waking) return;
  waking = true;
  AppState.addEventListener("change", (state) => {
    if (state === "active") for (const session of live) session.wake();
  });
};

/**
 * The GraphQL client, and the caller session (`rekuest/session`, orkestrator's
 * `rekuest/service.ts`): one socket to takt, over which tasks and states are
 * followed and calls made. It is the only live path: a hub whose gateway does
 * not route `/rekuest/session` to takt has no live updates, and the app cannot
 * start or steer tasks there.
 *
 * The session opens on first use, not when the service is built: a connection
 * is rebuilt whole whenever one alias is checked again (a mesh route moving on
 * resume, say), and a socket per rebuild would come and go for nothing.
 */
const builder: ServiceBuilder<RekuestService> = (options) => {
  const service = graphql(options);
  let session: RekuestSession | null = null;
  let disposed = false;
  const lazySession = (): RekuestSession => {
    if (!session) {
      if (disposed) throw new Error("Rekuest is not connected.");
      session = new RekuestSession({
        url: aliasToWsPath(options.alias, "session"),
        getToken: async (refresh) => (await options.getToken(refresh)).access_token,
        clientInfo: { app: "pokket" },
      });
      live.add(session);
      wakeOnForeground();
    }
    return session;
  };
  const built = {
    ...service,
    dispose: () => {
      disposed = true;
      if (session) {
        live.delete(session);
        session.dispose();
      }
      session = null;
    },
  };
  // Defined, not written as a getter in the literal: compiled, an object spread copies with
  // `Object.assign`, which reads a getter and would open the session at once.
  Object.defineProperty(built, "session", { get: lazySession, enumerable: false });
  return built as RekuestService;
};

export const rekuestServiceDefinition: ServiceDefinition = {
  builder,
  description: "Rekuest is a service for managing tasks.",
  key: "rekuest",
  name: "Rekuest",
  service: "live.arkitekt.rekuest",
  optional: true,
};
