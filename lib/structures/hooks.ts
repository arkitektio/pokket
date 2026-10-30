import { ApolloClient, gql } from "@apollo/client";
import * as React from "react";
import { useArkitektStore } from "@/lib/arkitekt/hooks";
import { queryProblem } from "@arkitektio/bsx/runtime";
import { findOptionSource, type StructureOption, type StructureSearch } from "./options";

/** The session's client for `service`, or null while it is not connected. */
export const useServiceClient = (service: string | undefined): ApolloClient<unknown> | null => {
  const client = useArkitektStore((state) => (service ? state.connection?.serviceMap?.[service]?.client : undefined));
  return client instanceof ApolloClient ? (client as ApolloClient<unknown>) : null;
};

/**
 * A search over a structure's objects, for a picker that names no query of
 * its own: `useStructureOptions("@mikro/arraydataset")` (orkestrator's
 * `useStructureOptions`). The source that lists it answers over its own
 * service's client; `undefined` when pokket has none for it.
 */
export const useStructureOptions = (
  identifier: string,
): ((search: StructureSearch) => Promise<StructureOption[]>) | undefined => {
  const source = findOptionSource(identifier);
  const client = useServiceClient(source?.service);
  return React.useMemo(() => {
    if (!source) return undefined;
    return async ({ search, values, requires }: StructureSearch): Promise<StructureOption[]> => {
      if (!client) return [];
      return source.search(client, {
        search: search || undefined,
        values: values?.map(String),
        ...(source.honoursRequires && requires?.length ? { requires } : {}),
      });
    };
  }, [source, client]);
};

/** Whether the source listing `identifier` narrows by an input's `requires`. */
export const useOptionSourceHonoursRequires = (identifier: string): boolean =>
  Boolean(findOptionSource(identifier)?.honoursRequires);

/**
 * Runs a GraphQL query given as text against one service, with the session's
 * client for it (orkestrator's `useServiceQuery`): for a query that arrives
 * as data, a blok picker's. Never from the cache, and reads only: a document
 * that is not one `query` is refused before anything is sent.
 */
export const useServiceQuery = (service: string | undefined) => {
  const client = useServiceClient(service);
  return React.useCallback(
    async (query: string, variables: Record<string, unknown>): Promise<Record<string, unknown>> => {
      if (!service) throw new Error("No service named to run the query on.");
      const problem = queryProblem(query);
      if (problem) throw new Error(problem);
      if (!client) throw new Error(`The ${service} service is not connected.`);
      const result = await client.query<Record<string, unknown>>({ query: gql(query), variables, fetchPolicy: "no-cache" });
      return result.data ?? {};
    },
    [client, service],
  );
};
