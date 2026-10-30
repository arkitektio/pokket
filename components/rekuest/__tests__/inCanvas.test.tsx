import {describe, expect, it, jest} from '@jest/globals';
import * as React from 'react';
import {act, type ReactTestRenderer} from 'react-test-renderer';
import {BlokSpaceHostProvider} from '@/components/blok/catalog/run/host';
import {SceneStoreProvider, createSceneStore} from '@/components/blok/catalog/scene/context';
import {BlokSceneEmbedProvider} from '@/components/blok/catalog/scene/host';
import {MaterializedBlokRenderer} from '@/components/blok/MaterializedBlokRenderer';
import {ComponentContext, TaskEventKind, type ActionBlokFragment, type RunTaskFragment} from '@/lib/rekuest/api/graphql';
import {runOfTask} from '@/lib/rekuest/run/runTask';
import {ActionBlokRenderer} from '../run/ActionBlokRenderer';
import {renderInSession} from '../testing';

require('react-native-gesture-handler/jestSetup');
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('sonner-native', () => ({toast: {info: jest.fn(), error: jest.fn(), success: jest.fn()}}));
// Ships untranspiled JSX; `asChild` is never used by bloks.
jest.mock('@rn-primitives/slot', () => {
  const {Pressable, Text, View} = jest.requireActual<typeof import('react-native')>('react-native');
  return {Pressable, Text, View};
});

/**
 * What a space draws into its one canvas: a placed device's scene blok and a
 * run's overlay, each with no chrome. Inside a canvas a single view or text
 * of React Native's would take the room down, so neither may hold one.
 */

const inRoom = (element: React.ReactElement) => (
  <SceneStoreProvider value={createSceneStore()}>
    <BlokSceneEmbedProvider value>{element}</BlokSceneEmbedProvider>
  </SceneStoreProvider>
);

/** Every React Native view or text that was rendered. */
const nativeViews = (renderer: ReactTestRenderer) =>
  renderer.root.findAll(node => (node.type as unknown) === 'View' || (node.type as unknown) === 'Text');

/** Lets the three.js half load: it is required the first time a scene part renders. */
const settle = async () => {
  for (let tick = 0; tick < 5; tick += 1) {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
  }
};

const content = (componentTree: unknown[]) => ({
  componentTree,
  vocab: 2,
  resolvedLocals: [],
  demo: null,
  queries: [],
  subscriptions: [],
});

describe('bloks drawn into a room', () => {
  it("draws a placed device's scene blok with nothing but what its scene holds", async () => {
    const renderer = await renderInSession(
      inRoom(
        <MaterializedBlokRenderer
          chrome="none"
          materializedBlok={{
            id: 'm1',
            blok: content([{id: 'scene', component: 'Scene', props: [], children: []}]),
            agentMappings: [{key: 'self', agent: {id: 'a1', name: 'arm', connected: true}}],
          }}
        />,
      ),
    );
    await settle();
    expect(nativeViews(renderer)).toEqual([]);
    act(() => renderer.unmount());
  });

  it("draws a run's overlay anchored at its device with nothing of React Native's", async () => {
    const overlay: ActionBlokFragment = {
      id: 'ab1',
      context: ComponentContext.Overlay,
      blok: {
        id: 'b1',
        context: ComponentContext.Overlay,
        heldByAction: true,
        module: {id: 'mod', name: 'tasks'},
        catalogs: [],
        locals: [],
        ...content([
          {
            id: 'overlay',
            component: 'Overlay',
            props: [],
            children: [{id: 'at', component: 'Anchor', props: [{key: 'dep', static_value: 'robot'}], children: []}],
          },
        ]),
      },
    };
    const task: RunTaskFragment = {
      id: 't1',
      args: {},
      latestEventKind: TaskEventKind.Progress,
      latestProgress: 10,
      latestMessage: null,
      latestReturns: null,
      isDone: false,
      events: [],
      action: {id: 'a', name: 'stain'},
      implementation: null,
      actionBloks: [overlay],
      dependencyAgents: [{key: 'robot', agent: {id: 'r1', name: 'arm', connected: true}}],
      space: null,
    };
    const renderer = await renderInSession(
      inRoom(
        // The space places the arm the run got for `robot`.
        <BlokSpaceHostProvider value={{placementOf: agentId => (agentId === 'r1' ? [[1, 0, 0, 2], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]] : null)}}>
          <ActionBlokRenderer actionBlok={overlay} run={runOfTask(task)} chrome="none" />
        </BlokSpaceHostProvider>,
      ),
    );
    await settle();
    expect(nativeViews(renderer)).toEqual([]);
    expect(renderer.root.findAll(node => node.props.name === 'at:r1')).not.toHaveLength(0);
    act(() => renderer.unmount());
  });
});
