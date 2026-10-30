import {describe, expect, it, jest} from '@jest/globals';
import * as React from 'react';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {normalizeBlokComponentTree, preflightBlokDocument} from '@arkitektio/bsx/runtime';
import BlokRenderer from '../BlokRenderer';
import {pokketBlokCatalog} from '../catalog';

jest.mock('sonner-native', () => ({toast: {info: jest.fn(), error: jest.fn()}}));
jest.mock('@rn-primitives/slot', () => {
  const {Pressable, Text, View} = jest.requireActual<typeof import('react-native')>('react-native');
  return {Pressable, Text, View};
});

// No lovekit or livekit in this workspace: the guards draw their fallback.
jest.mock('@/lib/app/App', () => {
  const actual = jest.requireActual<typeof import('@/lib/app/App')>('@/lib/app/App');
  const missing = ({fallback}: {fallback?: React.ReactNode}) => fallback ?? null;
  return {...actual, Guard: {...actual.Guard, Lovekit: missing, Livekit: missing}};
});

const stream = (broadcast?: unknown) => [
  {
    id: 'stream',
    component: 'StreamRender',
    props: broadcast === undefined ? [] : [{key: 'broadcast', static_value: broadcast}],
  },
];

const texts = (renderer: ReactTestRenderer): string[] =>
  renderer.root
    .findAll(node => (node.type as unknown) === 'Text')
    .flatMap(node => node.children.filter((child): child is string => typeof child === 'string'));

const draw = async (uiComponents: unknown) => {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<BlokRenderer uiComponents={uiComponents} initialState={{}} />);
  });
  return renderer;
};

describe('StreamRender', () => {
  it("is a component this catalog knows, with orkestrator's broadcast prop", () => {
    const preflight = preflightBlokDocument(
      normalizeBlokComponentTree(stream({object: '4', __identifier: '@lovekit/solo_broadcast'})).roots,
      pokketBlokCatalog,
    );
    expect(preflight.errors).toEqual([]);
    expect(preflight.invalidNodes.size).toBe(0);
  });

  it('says so when no broadcast is selected', async () => {
    expect(texts(await draw(stream()))).toContain('No broadcast selected.');
  });

  it('degrades to a notice where lovekit is not connected, without loading the player', async () => {
    expect(texts(await draw(stream({object: '4', __identifier: '@lovekit/solo_broadcast'})))).toContain('Lovekit is not available.');
  });
});
