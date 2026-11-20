import {describe, expect, it, jest} from '@jest/globals';
import * as React from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {act} from 'react-test-renderer';
import {routePoints} from '@/components/blok/catalog/run/math';
import {shownTexts} from '@/components/blok/testing';
import {ComponentContext, type SpaceFragment} from '@/lib/rekuest/api/graphql';
import {SpaceScene, agentSceneView, spaceHostOf, standingsOf} from '../space/SpaceScene';
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

const space: SpaceFragment = {
  id: 's1',
  name: 'Helsinki lab',
  reference: 'room:helsinki-lab',
  placements: [
    {id: 'p1', name: 'arm', role: 'device', agent: {id: 'a1', name: 'arm', connected: true}, affineMatrix: shifted(1)},
    {id: 'p2', name: '', role: 'device', agent: {id: 'a2', name: 'stitcher', connected: false}, affineMatrix: shifted(2)},
    {id: 'p3', name: 'scope', role: 'device', agent: {id: 'a3', name: 'scope', connected: true}, affineMatrix: null},
  ],
};

const view = (id: string, agent: string, opts: {context?: ComponentContext; isDefault?: boolean; self?: boolean} = {}) => ({
  id,
  name: null,
  description: null,
  isDefault: opts.isDefault ?? false,
  updatedAt: '2026-11-20T00:00:00Z',
  declaredBy: opts.self ? null : {id: agent, name: agent, connected: true},
  blok: {id: `b-${id}`, name: `view ${id}`, description: null, context: opts.context ?? ComponentContext.Scene},
  agentMappings: opts.self ? [{key: 'self', agent: {id: agent, name: agent, connected: true}}] : [],
});

describe('a space', () => {
  it('stands every placed agent in the room, where it was left', () => {
    expect(standingsOf(space).map(item => [item.key, item.name, item.agentId])).toEqual([
      ['agent:p1', 'arm', 'a1'],
      ['agent:p2', 'stitcher', 'a2'],
      ['agent:p3', 'scope', 'a3'],
    ]);
  });

  it("draws an agent by its own 3D view: the default first, never a panel or another agent's", () => {
    const views = [
      view('m1', 'a1'),
      view('m2', 'a1', {isDefault: true}),
      view('m3', 'a2', {context: ComponentContext.Panel}),
      view('m4', 'a3', {self: true}),
    ];
    expect(agentSceneView('a1', views)?.id).toBe('m2');
    expect(agentSceneView('a2', views)).toBeNull();
    expect(agentSceneView('a3', views)?.id).toBe('m4');
    expect(agentSceneView('a9', views)).toBeNull();
  });

  it("is the room a run's Space is drawn into: its devices where they stand here, none drawn twice", () => {
    const host = spaceHostOf(space.placements);
    const room = host.useRoom('room:any');
    expect(room.poseOf('a1')?.[0][3]).toBe(1);
    // A placement without a matrix, and an agent this space does not place: the blok's own `Placed` decides.
    expect([room.poseOf('a3'), room.poseOf('a9')]).toEqual([null, null]);
    // Nothing is arranged on the phone, and the space draws each device itself.
    expect([room.save, room.reset]).toEqual([undefined, undefined]);
    expect(host.renderAgent('a1', null)).toBeNull();

    const byKey = new Map([
      ['robot', [{id: 'a1', name: 'arm'}]],
      ['stitch', [{id: 'a2', name: 'stitcher'}]],
    ]);
    const points = routePoints(['robot', 'stitch'], key => byKey.get(key) ?? [], room.poseOf);
    expect(points.map(point => point.x)).toEqual([1, 2]);
  });

  it('says so when nothing stands in it', async () => {
    const renderer = await renderInSession(<GestureHandlerRootView><SpaceScene space={{...space, placements: []}} /></GestureHandlerRootView>);
    expect(shownTexts(renderer.root).join(' ')).toContain('Nothing stands in this space yet');
    act(() => renderer.unmount());
  });
});
