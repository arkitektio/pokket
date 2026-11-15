import {describe, expect, it, jest} from '@jest/globals';
import * as React from 'react';
import * as THREE from 'three';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {normalizeBlokComponentTree, preflightBlokDocument} from '@arkitektio/bsx/runtime';
import {buildBrandTokens, DEFAULT_BRAND} from '@/lib/theme/brandTokens';
import BlokRenderer from '../BlokRenderer';
import {pokketBlokCatalog} from '../catalog';
import {fromMatrix4, isMatrixRows, toMatrix4} from '../catalog/scene/affine';
import {brandThemeReader, FALLBACK_SCENE_RGB, resolveThemeColour, type ThemeColourReader} from '../catalog/scene/colour';

jest.mock('sonner-native', () => ({toast: {info: jest.fn(), error: jest.fn()}}));
jest.mock('@rn-primitives/slot', () => {
  const {Pressable, Text, View} = jest.requireActual<typeof import('react-native')>('react-native');
  return {Pressable, Text, View};
});

/** orkestrator's `bloks/scene/colour.test.ts`, against a reader of the brand's tokens instead of the document. */
describe('resolveThemeColour', () => {
  const reader = (variables: Readonly<Record<string, string>>, painted: string | null = 'rgb(1, 2, 3)'): ThemeColourReader & {asked: string[]} => {
    const asked: string[] = [];
    return {
      asked,
      variable: role => {
        asked.push(role);
        return variables[role] ?? '';
      },
      paint: css => (css.startsWith('oklch(') ? painted : null),
    };
  };

  it('paints a theme role', () => {
    const theme = reader({info: ' oklch(0.6 0.1 240) '});
    expect(resolveThemeColour('info', theme)).toBe('rgb(1, 2, 3)');
    expect(theme.asked).toEqual(['info']);
  });

  it('resolves the spectral roles and their soft variants', () => {
    const theme = reader({'spectrum-green': 'oklch(0.64 0.15 145)', 'spectrum-red-soft': 'oklch(0.95 0.05 27)'});
    expect(resolveThemeColour('spectrum-green', theme)).toBe('rgb(1, 2, 3)');
    expect(resolveThemeColour('spectrum-red-soft', theme)).toBe('rgb(1, 2, 3)');
  });

  it('falls back when the theme has no such role or it cannot be painted', () => {
    expect(resolveThemeColour('success', reader({}))).toBe(FALLBACK_SCENE_RGB);
    expect(resolveThemeColour('success', reader({}), '#ff3b30')).toBe('#ff3b30');
    expect(resolveThemeColour('success', reader({success: 'oklch(0.6 0.1 150)'}, null))).toBe(FALLBACK_SCENE_RGB);
  });

  it('passes a value that is no role through as written', () => {
    const theme = reader({red: 'oklch(0.6 0.2 25)'});
    expect(resolveThemeColour('#ff0000', theme)).toBe('#ff0000');
    expect(resolveThemeColour('red', theme)).toBe('red');
    expect(theme.asked).toEqual([]);
  });

  it("reads the brand's own tokens, as a colour three.js parses", () => {
    const tokens = buildBrandTokens(DEFAULT_BRAND.hue, DEFAULT_BRAND.chroma);
    const colour = resolveThemeColour('spectrum-green', brandThemeReader(DEFAULT_BRAND));
    expect(colour).toMatch(/^hsl\([\d.]+, [\d.]+%, [\d.]+%\)$/);
    expect(colour.replace(/[(),]/g, ' ').split(/\s+/).filter(Boolean).slice(1).join(' ')).toBe(tokens['--spectrum-green']);
    const parsed = new THREE.Color(colour);
    expect(parsed.g).toBeGreaterThan(parsed.r);
  });
});

describe('an affine matrix', () => {
  it('reads back as the rows it was stored as', () => {
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(1, 0, 2),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2),
      new THREE.Vector3(1, 1, 1),
    );
    const rows = fromMatrix4(matrix);
    expect(rows[0][3]).toBe(1);
    expect(rows[2][3]).toBe(2);
    expect(toMatrix4(rows).equals(matrix)).toBe(true);
  });

  it('is the identity when absent or malformed', () => {
    expect(toMatrix4(null).equals(new THREE.Matrix4())).toBe(true);
    expect(isMatrixRows([[1, 0, 0]])).toBe(false);
    expect(toMatrix4([[1, 0, 0]]).equals(new THREE.Matrix4())).toBe(true);
  });
});

const catalog = pokketBlokCatalog;

const prop = (key: string, value: unknown) => ({key, static_value: value});

/** bsx's `run.test.tsx` space, as the catalog checks it. */
const space = [
  {
    id: 'root',
    component: 'Space',
    props: [prop('room', 'room:lab')],
    children: [
      {
        id: 'robot',
        component: 'Placed',
        props: [prop('dep', 'robot')],
        children: [
          {id: 'glow', component: 'Glow', props: [prop('on', true), prop('color', 'success')]},
          {id: 'card', component: 'Popout', props: [prop('open', true), prop('title', 'Arm card')]},
          {id: 'tap', component: 'OnClick', props: [prop('title', 'Arm')]},
        ],
      },
      {id: 'route', component: 'Route', props: [prop('through', ['robot', 'frame']), {key: 'progress', dynamic_value: {path: 'task.progress'}}]},
      {id: 'pose', component: 'Transform', props: [prop('persist', true)]},
    ],
  },
];

describe('the scene family beyond a Scene', () => {
  it('places a space, its devices and what binds under them', () => {
    const preflight = preflightBlokDocument(normalizeBlokComponentTree(space).roots, catalog);
    expect(preflight.errors).toEqual([]);
    expect(preflight.invalidNodes.size).toBe(0);
  });
});
