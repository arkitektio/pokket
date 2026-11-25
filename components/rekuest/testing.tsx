import {ApolloClient, ApolloLink, InMemoryCache, Observable} from '@apollo/client';
import * as React from 'react';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {createStore, type StoreApi} from 'zustand/vanilla';
import {ArkitektContext} from '@/lib/arkitekt/context';
import {emptyProfileBook} from '@/lib/arkitekt/fakts/profileStorageSchema';
import type {AppContext, AppFunctions, Service} from '@/lib/arkitekt/types';
import type {RekuestSession} from '@/lib/rekuest/session/client';
import {createFakeSession} from '@/lib/rekuest/session/testing';

/**
 * A session for rendering parts of rekuest's screens in a test: its rekuest
 * client is never answered and its caller session watches nothing, so nothing
 * reaches a server, and nobody is signed in.
 */

/** What the parts under test read of a session; nothing else of `AppContext` is touched. */
type SilentSession = Pick<AppContext, 'profileBook'> & {
  connection: {serviceMap: {rekuest: Service<ApolloClient<unknown>> & {session: RekuestSession}}};
};

const silentSession = (session: RekuestSession) => {
  const store = createStore<SilentSession>(() => ({
    connection: {
      serviceMap: {
        rekuest: {
          client: new ApolloClient({cache: new InMemoryCache(), link: new ApolloLink(() => new Observable(() => undefined))}),
          session,
        },
      },
    },
    profileBook: emptyProfileBook(),
  }));
  // The rest of a session is never read here; building it would mean signing in.
  return {store: store as unknown as StoreApi<AppContext>, actions: {} as AppFunctions};
};

/**
 * Renders `element` in a silent session, once what it reads on mount (kept
 * locals) is read. `session`: the caller session, to play the server in a test
 * (`createFakeSession`).
 */
export const renderInSession = async (
  element: React.ReactElement,
  session: RekuestSession = createFakeSession().session,
): Promise<ReactTestRenderer> => {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(<ArkitektContext.Provider value={silentSession(session)}>{element}</ArkitektContext.Provider>);
  });
  await act(async () => undefined);
  if (!renderer) throw new Error('Nothing rendered.');
  return renderer;
};
