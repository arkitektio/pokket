import {describe, expect, it, jest} from '@jest/globals';
import {assetNamedBy} from '@/lib/ports/blok/assets';
import {normalizeBlokComponentTree, preflightBlokDocument} from '@arkitektio/bsx/runtime';
import {pokketBlokCatalog} from '../catalog';
import fixture from './scene.fixture.json';

type FixtureNode = {
  id: string;
  component: string;
  props?: {key: string; agent_call?: {arguments?: {value_path?: string}[]}}[];
  children?: FixtureNode[];
};
const tree = fixture as unknown as FixtureNode[];

jest.mock('sonner-native', () => ({toast: {info: jest.fn(), error: jest.fn()}}));
// Ships untranspiled JSX; `asChild` is never used by bloks.
jest.mock('@rn-primitives/slot', () => {
  const {Pressable, Text, View} = jest.requireActual<typeof import('react-native')>('react-native');
  return {Pressable, Text, View};
});

/**
 * orkestrator's `bloks/scene/scene.test.ts`: `scene.fixture.json` is a v2
 * scene blok as the server stores it, parsed from BSX (a persisted Scene; a
 * Model with motion, visibility, a click target and a popout; a Robot with a
 * joint handler, a glow and an attachment). The phone's catalog
 * places every node of it, without loading three.js to do so.
 */
describe('a scene blok from the Python client', () => {
  it('is a tree this catalog knows, to any depth', () => {
    const {roots, truncatedIds} = normalizeBlokComponentTree(tree);
    expect(truncatedIds).toEqual([]);

    const preflight = preflightBlokDocument(roots, pokketBlokCatalog);
    expect(preflight.errors).toEqual([]);
    expect(preflight.invalidNodes.size).toBe(0);

    const used = new Set([...preflight.nodes.values()].map(node => node.component));
    expect([...used].sort()).toEqual(
      ['Attach', 'Badge', 'Card', 'CardContent', 'Glow', 'Model', 'Move', 'OnClick', 'Popout', 'Robot', 'Scene', 'Visible'].sort(),
    );
  });

  it('carries the handler arguments as event fields', () => {
    const robot = (tree[0].children ?? []).find(node => node.component === 'Robot');
    const handler = robot?.props?.find(prop => prop.key === 'onJointChange');
    expect(handler?.agent_call?.arguments?.map(argument => argument.value_path)).toEqual(['event.name', 'event.value']);
  });

  it('names its model as an asset of a dependency, as the Model component receives it', () => {
    const {roots} = normalizeBlokComponentTree(tree);
    const preflight = preflightBlokDocument(roots, pokketBlokCatalog);
    // What `BlokComponentRenderer` hands the component: the prepared node's own node.
    const model = [...preflight.nodes.values()].find(prepared => prepared.component === 'Model')?.node;
    expect(model).toBeDefined();
    expect(assetNamedBy(model!, 'src')).toEqual({dependency: 'self', name: 'scope'});
    const viaDeps = {...model!, props: [{key: 'src', dynamic_value: {path: 'deps.robot.assets.arm'}}]};
    expect(assetNamedBy(viaDeps, 'src')).toEqual({dependency: 'robot', name: 'arm'});
  });
});
