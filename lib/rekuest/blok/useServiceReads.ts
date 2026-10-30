import {ApolloClient, gql} from '@apollo/client';
import * as React from 'react';
import {useArkitektStore} from '@/lib/arkitekt/hooks';
import type {BlokReadExecutor} from '@arkitektio/bsx/runtime';

/**
 * Runs a blok's declared reads (`queries`, `subscriptions`) on the session's
 * client for their service, as orkestrator's `useServiceReads` does. The blok
 * runtime checks that a query is a query and a subscription a subscription
 * before anything is sent; this only runs them. Never from the cache: nothing
 * here knows how their fields merge.
 */
export const useServiceReads = (): BlokReadExecutor => {
  const serviceMap = useArkitektStore(state => state.connection?.serviceMap);

  return React.useMemo<BlokReadExecutor>(() => {
    const clientFor = (service: string): ApolloClient<unknown> | null => {
      const client = serviceMap?.[service]?.client;
      return client instanceof ApolloClient ? (client as ApolloClient<unknown>) : null;
    };
    return {
      query: async (service, document, variables, signal) => {
        const client = clientFor(service);
        if (!client) throw new Error(`The ${service} service is not connected.`);
        const result = await client.query<Record<string, unknown>>({
          query: gql(document),
          variables,
          fetchPolicy: 'no-cache',
          context: {fetchOptions: {signal}},
        });
        return result.data ?? {};
      },
      subscribe: (service, document, variables, sink) => {
        const client = clientFor(service);
        if (!client) {
          sink.error(new Error(`The ${service} service is not connected.`));
          return () => undefined;
        }
        const subscription = client
          .subscribe<Record<string, unknown>>({query: gql(document), variables, fetchPolicy: 'no-cache'})
          .subscribe({
            next: result => sink.next(result.data ?? {}),
            error: (error: unknown) => sink.error(error),
            complete: () => sink.complete(),
          });
        return () => subscription.unsubscribe();
      },
    };
  }, [serviceMap]);
};
