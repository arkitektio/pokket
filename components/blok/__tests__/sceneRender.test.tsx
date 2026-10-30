import {describe, expect, it, jest} from '@jest/globals';
import * as React from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import BlokRenderer from '../BlokRenderer';
import tree from './scene.fixture.json';

require('react-native-gesture-handler/jestSetup');
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('sonner-native', () => ({toast: {info: jest.fn(), error: jest.fn()}}));
// Ships untranspiled JSX; `asChild` is never used by bloks.
jest.mock('@rn-primitives/slot', () => {
  const {Pressable, Text, View} = jest.requireActual<typeof import('react-native')>('react-native');
  return {Pressable, Text, View};
});

const textOf = (renderer: ReactTestRenderer): string =>
  renderer.root
    .findAll(node => (node.type as unknown) === 'Text')
    .map(node => node.children.filter(child => typeof child === 'string').join(''))
    .join(' | ');

/**
 * A scene blok rendered whole, with the three.js half loaded on demand. Jest
 * has no GPU, so the scene says it cannot be shown: that is the path a phone
 * without WebGPU takes, and it proves the scene's modules load together.
 */
describe('a scene blok on a phone without WebGPU', () => {
  it('loads the 3D components when first shown and explains why there is no view', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <GestureHandlerRootView>
          <BlokRenderer uiComponents={tree} />
        </GestureHandlerRootView>,
      );
    });
    // The implementation loads, the GPU is asked for and answers none.
    for (let attempt = 0; attempt < 200 && !textOf(renderer).includes('cannot be shown'); attempt += 1) {
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
    }
    const text = textOf(renderer);
    expect(text).toContain('This 3D view cannot be shown here');
    expect(text).not.toContain('Unknown component');
    await act(async () => renderer.unmount());
    // The first run transforms three's WebGPU build, which takes a while.
  }, 60_000);
});
