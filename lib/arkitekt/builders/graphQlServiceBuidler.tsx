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
import { aliasToHttpPath, aliasToWsPath } from "../alias/helpers";
import { Service, ServiceBuilder } from "../types";


export const createGraphQLServiceBuilder =
  (possibleTypes: any, builderOptions?: { describe?: boolean }): ServiceBuilder<Service<ApolloClient<any>>> =>
    (options) => {
      const { alias, getToken } = options;

      const httpLink = createHttpLink({
        uri: aliasToHttpPath(alias, "graphql"),
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

      const wslink = new GraphQLWsLink(
        createClient({
          url: aliasToWsPath(alias, "graphql"),
          connectionParams: async () => {
            const token = await getToken();
            return {
              token: token.access_token,
            };
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
        link: splitLink,
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
