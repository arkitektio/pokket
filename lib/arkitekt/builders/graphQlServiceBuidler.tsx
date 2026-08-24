import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  createHttpLink,
  split,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";
import { createErrorReportingLink, createOperationLogLink } from "../../debug/apolloErrorLink";
import { describe, reportError } from "../../debug/errorLog";
import { aliasToHttpPath, aliasToWsPath } from "../alias/helpers";
import { Service, ServiceBuilder } from "../types";


export const createGraphQLServiceBuilder =
  (possibleTypes: any, builderOptions?: { describe?: boolean }): ServiceBuilder<Service<ApolloClient<any>>> =>
    (options) => {
      const { alias, getToken } = options;

      const httpUrl = aliasToHttpPath(alias, "graphql");

      // `Alias` carries no service name, so the host is what tells one client's
      // failures from another's in the error log.
      const label = alias.host ?? "graphql";

      const httpLink = createHttpLink({
        uri: httpUrl,
      });

      const queryLink = setContext(async (_, previousContext) => {
        const token = await getToken();

        return {
          headers: {
            ...previousContext.headers,
            authorization: token ? `Bearer ${token.access_token}` : "",
          },
        };
      }).concat(httpLink);

      const wsUrl = aliasToWsPath(alias, "graphql");

      const wslink = new GraphQLWsLink(
        createClient({
          url: wsUrl,
          connectionParams: async () => {
            const token = await getToken();
            return {
              token: token.access_token,
            };
          },
          // graphql-ws reconnects silently, so a socket that can never connect
          // looks exactly like one that has nothing to say.
          on: {
            error: (error) => {
              reportError("websocket", `${label}: ${describe(error)}`, `url: ${wsUrl}`);
            },
            closed: (event) => {
              const code = (event as { code?: number })?.code;
              // 1000/1001 are the normal goodbyes — only shout about the rest.
              if (code === undefined || code === 1000 || code === 1001) return;
              reportError(
                "websocket",
                `${label}: socket closed (${code})`,
                `url: ${wsUrl}\nreason: ${(event as { reason?: string })?.reason || "none given"}`
              );
            },
          },
        })
      );

      const splitLink = split(
        ({ query }) => {
          const definition = getMainDefinition(query);
          return (
            definition.kind === "OperationDefinition" &&
            definition.operation === "subscription"
          );
        },
        wslink,
        queryLink as unknown as ApolloLink
      );

      const client = new ApolloClient({
        // The error link goes first so it observes everything downstream of it,
        // for queries and subscriptions alike.
        link: ApolloLink.from([
          createOperationLogLink(label),
          createErrorReportingLink(label, httpUrl),
          splitLink,
        ]),
        cache: new InMemoryCache({ possibleTypes }),
      });


      return {
        type: "apollo",
        client: client,
        alias: alias,
        clearCache: async () => {
          await client.clearStore();
          await client.resetStore();
        },
      }
    };
