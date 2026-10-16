import {describe, expect, it, jest} from '@jest/globals';
import * as React from 'react';
import {View} from 'react-native';
import {Circle, ClipPath, G, LinearGradient, Path, Rect, Stop, Svg, Text as SvgText} from 'react-native-svg';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {normalizeBlokComponentTree, preflightBlokDocument} from '@/lib/ports/blok/runtime';
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
 * orkestrator's `bloks/logo/logo.fixture.json`: what arkitekt-spec emits for a
 * logo blok written in BSX — a gradient and a clip path referenced by id,
 * every shape, text, and a `foreach` over state drawing one lamp per item.
 */
const DEMO_STATE = {self: {Status: {lamps: [{color: 'lime'}, {color: 'red'}]}}};

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

describe('a logo blok from the Python client', () => {
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
    // A length reads as the number it spells.
    expect(path.props.strokeWidth).toBe(1.5);
    const text = root.findByType(SvgText);
    expect(text.props.children).toBe('A');
    expect(text.props.textAnchor).toBe('middle');
  });

  it('draws its state from the state it is given', async () => {
    const {root} = await draw(roots(), DEMO_STATE);

    const lamps = root.findAllByType(Circle).filter(lamp => lamp.props.cx === 20);
    expect(lamps.map(lamp => lamp.props.fill)).toEqual(['lime', 'red']);
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
        component: 'SVG',
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
  it('draws palette tokens from the brand under either root, and colours only under an SVG', async () => {
    const palette = buildLogoPalette();
    const shapes = [
      circle('token', {fill: 'brand-soft', stroke: 'ink'}),
      circle('colour', {fill: '#fbbf24'}),
      circle('empty', {fill: 'none'}),
    ];
    const free = await draw([{id: 'logo', component: 'SVG', children: shapes}]);
    const action = await draw([{id: 'action', component: 'ActionLogo', children: shapes}]);

    const fills = (renderer: ReactTestRenderer) => renderer.root.findAllByType(Circle).map(shape => shape.props.fill);
    expect(fills(free)).toEqual([palette['brand-soft'], '#fbbf24', 'none']);
    // An action logo paints with the palette only: anything else is drawn in ink.
    expect(fills(action)).toEqual([palette['brand-soft'], palette.ink, 'none']);
    expect(action.root.findAllByType(Circle)[0].props.stroke).toBe(palette.ink);
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
