import {describe, expect, it, jest} from '@jest/globals';
import * as React from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {act} from 'react-test-renderer';
import {resolveAnchors, routePoints} from '@/components/blok/catalog/run/math';
import {shownTexts} from '@/components/blok/testing';
import {ComponentContext, type SpaceFragment} from '@/lib/rekuest/api/graphql';
import {SpaceScene, spaceHostOf, standingsOf} from '../space/SpaceScene';
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
 * A space on the phone: what stands in it and where, which is where a run's
 * overlay anchors its devices.
 */

const shifted = (x: number) => [
  [1, 0, 0, x],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];

const sceneView = (id: string, context = ComponentContext.Scene) => ({id, name: null, blok: {id: `b-${id}`, name: `view ${id}`, context}});

const space: SpaceFragment = {
  id: 's1',
  name: 'Helsinki lab',
  placements: [
    {id: 'p1', name: 'arm', role: 'device', agent: {id: 'a1', name: 'arm', connected: true}, blok: sceneView('m1'), affineMatrix: shifted(1)},
    {id: 'p2', name: 'stitcher', role: 'device', agent: {id: 'a2', name: 'stitcher', connected: false}, blok: sceneView('m2', ComponentContext.Html), affineMatrix: shifted(2)},
    {id: 'p3', name: 'scope', role: 'device', agent: {id: 'a3', name: 'scope', connected: true}, blok: null, affineMatrix: null},
  ],
  blokPlacements: [{id: 'q1', name: null, affineMatrix: shifted(-1), blok: sceneView('m3')}],
};

describe('a space', () => {
  it('stands every placement in the room, with the 3D view it can show', () => {
    const standing = standingsOf(space);
    expect(standing.map(item => [item.key, item.name, item.view?.id ?? null, item.hasView, item.agentId])).toEqual([
      ['agent:p1', 'arm', 'm1', true, 'a1'],
      ['agent:p2', 'stitcher', null, true, 'a2'],
      ['agent:p3', 'scope', null, false, 'a3'],
      ['blok:q1', 'view m3', 'm3', true, null],
    ]);
  });

  it("anchors a run's devices at their placements, and trays one it does not place", () => {
    const host = spaceHostOf(space.placements);
    const anchors = resolveAnchors(
      [
        {id: 'a1', name: 'arm'},
        {id: 'a9', name: 'elsewhere'},
      ],
      host.placementOf,
    );
    expect(anchors.placed.map(({agent, matrix}) => [agent.id, matrix.elements[12]])).toEqual([['a1', 1]]);
    expect(anchors.unplaced.map(agent => agent.id)).toEqual(['a9']);

    const byKey = new Map([
      ['robot', [{id: 'a1', name: 'arm'}]],
      ['stitch', [{id: 'a2', name: 'stitcher'}]],
    ]);
    const points = routePoints(['robot', 'stitch'], key => byKey.get(key) ?? [], host.placementOf);
    expect(points.map(point => point.x)).toEqual([1, 2]);
  });

  it('says so when nothing stands in it', async () => {
    const renderer = await renderInSession(<GestureHandlerRootView><SpaceScene space={{...space, placements: [], blokPlacements: []}} /></GestureHandlerRootView>);
    expect(shownTexts(renderer.root).join(' ')).toContain('Nothing stands in this space yet');
    act(() => renderer.unmount());
  });
});
