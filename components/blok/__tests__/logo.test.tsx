import {describe, expect, it, jest} from '@jest/globals';
import * as React from 'react';
import {View} from 'react-native';
import {Circle, ClipPath, G, LinearGradient, Path, Rect, Stop, Svg, Text as SvgText} from 'react-native-svg';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {normalizeBlokComponentTree, preflightBlokDocument} from '@arkitektio/bsx/runtime';
import {buildLogoPalette} from '@/lib/theme/brandTokens';
import BlokRenderer from '../BlokRenderer';
import {pokketBlokCatalog} from '../catalog';
import {frameAt, LogoActiveContext} from '../catalog/logo';
import tree from './logo.fixture.json';

jest.mock('sonner-native', () => ({toast: {info: jest.fn(), error: jest.fn()}}));
jest.mock('@rn-primitives/slot', () => {
  const {Pressable, Text, View} = jest.requireActual<typeof import('react-native')>('react-native');
  return {Pressable, Text, View};
});

/**
 * orkestrator's `bloks/logo/logo.fixture.json`: a v2 logo blok as it is
 * stored — a gradient and a clip path referenced by id, every shape, text, and
 * a keyed `foreach` over state drawing one lamp per item, all painted with the
 * viewer's pens.
 */
/** `self` reads `deps.self`: the agent the logo belongs to. */
const DEMO_STATE = {deps: {self: {status: {lamps: [{name: 'a', pen: 'success'}, {name: 'b', pen: 'warning'}]}}}};

const roots = () => normalizeBlokComponentTree(tree).roots;

const draw = async (uiComponents: unknown, initialState: unknown = {}, active = false) => {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <LogoActiveContext.Provider value={active}>
        <BlokRenderer uiComponents={uiComponents} initialState={initialState} chrome="none" />
      </LogoActiveContext.Provider>,
    );
  });
  return renderer;
};

const circle = (id: string, props: Record<string, string>) => ({
  id,
  component: 'Circle',
  props: [{key: 'r', static_value: '2'}, ...Object.entries(props).map(([key, value]) => ({key, static_value: value}))],
});

describe('a v2 logo blok', () => {
  it('is a tree this catalog knows', () => {
    const preflight = preflightBlokDocument(roots(), pokketBlokCatalog);
    expect(preflight.errors).toEqual([]);
    expect(preflight.invalidNodes.size).toBe(0);
  });

  it('draws one svg whose references find their gradient and clip path', async () => {
    const {root} = await draw(roots(), DEMO_STATE);

    const svgs = root.findAllByType(Svg);
    expect(svgs).toHaveLength(1);
    expect(svgs[0].props.viewBox).toBe('0 0 24 24');
    expect(svgs[0].props.accessibilityLabel).toBe('Microscope');

    const gradient = root.findByType(LinearGradient);
    const clip = root.findByType(ClipPath);
    expect(gradient.props.id).toMatch(/-sky$/);
    expect(clip.props.id).toMatch(/-round$/);
    expect(root.findByType(Rect).props.fill).toBe(`url(#${gradient.props.id})`);
    expect(root.findAllByType(G).some(group => group.props.clipPath === `url(#${clip.props.id})`)).toBe(true);
    expect(gradient.findAllByType(Stop)).toHaveLength(2);

    // Polygon and Polyline draw through a Path of their own.
    const [path] = root.findAllByType(Path).filter(shape => shape.props.d === 'M6 18 L12 4 L18 18 Z');
    expect(path.props.d).toBe('M6 18 L12 4 L18 18 Z');
    // A v2 literal is the string it spells (`strokeWidth="1.5"`); react-native-svg reads it as a length.
    expect(path.props.strokeWidth).toBe('1.5');
    const text = root.findByType(SvgText);
    expect(text.props.children).toBe('A');
    expect(text.props.textAnchor).toBe('middle');
  });

  it('draws its state from the state it is given', async () => {
    const {root} = await draw(roots(), DEMO_STATE);

    const palette = buildLogoPalette();
    const lamps = root.findAllByType(Circle).filter(lamp => lamp.props.cx === '20');
    expect(lamps.map(lamp => lamp.props.fill)).toEqual([palette.success, palette.warning]);
  });

  it('gives two drawings of one blok ids of their own', async () => {
    const first = await draw(roots(), DEMO_STATE);
    const second = await draw(roots(), DEMO_STATE);

    const ids = [first, second].map(renderer => renderer.root.findByType(LinearGradient).props.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('draws a node that fails inside the svg as nothing, not as a card', async () => {
    const {root} = await draw([
      {
        id: 'logo',
        component: 'AgentLogo',
        children: [
          {id: 'ok', component: 'Circle', props: [{key: 'r', static_value: '2'}]},
          {id: 'broken', component: 'Circle', props: [{key: 'r', util_call: {operation: 'no_such_function'}}]},
        ],
      },
    ]);

    const svg = root.findByType(Svg);
    expect(svg.findAllByType(Circle)).toHaveLength(1);
    expect(svg.findAllByType(View)).toHaveLength(0);
  });
});

describe('paint', () => {
  it('draws the pens from the brand and the status roles, and anything else in ink', async () => {
    const palette = buildLogoPalette();
    const shapes = [
      circle('token', {fill: 'brand-soft', stroke: 'ink'}),
      circle('status', {fill: 'success', stroke: 'info'}),
      circle('colour', {fill: '#fbbf24'}),
      circle('empty', {fill: 'none'}),
    ];
    for (const root of ['AgentLogo', 'ActionLogo']) {
      const drawn = await draw([{id: 'logo', component: root, children: shapes}]);
      const circles = drawn.root.findAllByType(Circle);
      expect(circles.map(shape => shape.props.fill)).toEqual([palette['brand-soft'], palette.success, palette.ink, 'none']);
      expect(circles[1].props.stroke).toBe(palette.info);
    }
  });

  it('draws the spectral pens, not their soft roles', async () => {
    const palette = buildLogoPalette();
    const drawn = await draw([
      {
        id: 'logo',
        component: 'AgentLogo',
        children: [
          circle('green', {fill: 'spectrum-green', stroke: 'spectrum-violet'}),
          circle('soft', {fill: 'spectrum-green-soft'}),
        ],
      },
    ]);
    const [green, soft] = drawn.root.findAllByType(Circle);
    expect(green.props.fill).toBe(palette['spectrum-green']);
    expect(green.props.stroke).toBe(palette['spectrum-violet']);
    expect(soft.props.fill).toBe(palette.ink);
  });

  it('keeps an action logo a tree this catalog knows, its shapes placed under it', () => {
    const preflight = preflightBlokDocument(
      normalizeBlokComponentTree([{id: 'action', component: 'ActionLogo', children: [circle('c', {fill: 'brand'})]}]).roots,
      pokketBlokCatalog,
    );
    expect(preflight.errors).toEqual([]);
  });
});

describe('animate', () => {
  const box = {x: 10, y: 10, width: 4, height: 4};

  it("plays orkestrator's keyframes around the shape's own middle", () => {
    expect(frameAt('spin', 0.35, box, 0).group?.transform).toBe('rotate(90 12 12)');
    // Pulse peaks halfway: 1.2× and 0.7 opaque.
    expect(frameAt('pulse', 0.6, box, 0).group).toEqual({
      transform: 'translate(12 12) scale(1.2) translate(-12 -12)',
      opacity: 0.7,
    });
    expect(frameAt('blink', 0.5, box, 0).group?.opacity).toBe(0.15);
    expect(frameAt('blink', 0.1, box, 0).group?.opacity).toBe(1);
  });

  it('traces a stroke by its measured length, and takes it back', () => {
    expect(frameAt('draw', 0, box, 40).shape).toEqual({strokeDasharray: '40 40', strokeDashoffset: 40});
    expect(frameAt('draw', 1.2, box, 40).shape?.strokeDashoffset).toBeCloseTo(0);
    expect(frameAt('draw', 1.8, box, 40).shape?.strokeDashoffset).toBeCloseTo(20);
  });

  it('keeps a shape still until its host is active, then plays it', async () => {
    jest.useFakeTimers();
    try {
      const shapes = [circle('pulse', {animate: 'pulse', cx: '12', cy: '12'})];
      const motion = (renderer: ReactTestRenderer) =>
        renderer.root.findAllByType(G).filter(group => typeof group.props.transform === 'string');

      const still = await draw([{id: 'action', component: 'ActionLogo', props: [{key: 'viewBox', static_value: '0 0 24 24'}], children: shapes}]);
      expect(motion(still)).toHaveLength(0);

      const playing = await draw(
        [{id: 'action', component: 'ActionLogo', props: [{key: 'viewBox', static_value: '0 0 24 24'}], children: shapes}],
        {},
        true,
      );
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      // Unmeasured, it pulses around the middle of the viewBox.
      expect(motion(playing)[0]?.props.transform).toMatch(/^translate\(12 12\) scale\(1\.\d+\) translate\(-12 -12\)$/);
      act(() => playing.unmount());
    } finally {
      jest.useRealTimers();
    }
  });
});
