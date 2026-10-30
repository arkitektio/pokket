import {ApolloClient, ApolloLink, InMemoryCache, Observable} from '@apollo/client';
import * as React from 'react';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {createStore, type StoreApi} from 'zustand/vanilla';
import {ArkitektContext} from '@/lib/arkitekt/context';
import {emptyProfileBook} from '@/lib/arkitekt/fakts/profileStorageSchema';
import type {AppContext, AppFunctions, Service} from '@/lib/arkitekt/types';

/**
 * A session for rendering parts of rekuest's screens in a test: its rekuest
 * client is never answered, so nothing reaches a server, and nobody is
 * signed in.
 */

/** What the parts under test read of a session; nothing else of `AppContext` is touched. */
type SilentSession = Pick<AppContext, 'profileBook'> & {
  connection: {serviceMap: {rekuest: Service<ApolloClient<unknown>>}};
};

const silentSession = () => {
  const store = createStore<SilentSession>(() => ({
    connection: {
      serviceMap: {
        rekuest: {
          client: new ApolloClient({cache: new InMemoryCache(), link: new ApolloLink(() => new Observable(() => undefined))}),
        },
      },
    },
    profileBook: emptyProfileBook(),
  }));
  // The rest of a session is never read here; building it would mean signing in.
  return {store: store as unknown as StoreApi<AppContext>, actions: {} as AppFunctions};
};

/** Renders `element` in a silent session, once what it reads on mount (kept locals) is read. */
export const renderInSession = async (element: React.ReactElement): Promise<ReactTestRenderer> => {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(<ArkitektContext.Provider value={silentSession()}>{element}</ArkitektContext.Provider>);
  });
  await act(async () => undefined);
  if (!renderer) throw new Error('Nothing rendered.');
  return renderer;
};
