import {describe, expect, it, jest} from '@jest/globals';
import * as z from 'zod';
import {isActionSchema} from '@arkitektio/bsx/runtime';
import {baseCatalog, defaultBlokView} from '@arkitektio/bsx/spec/catalogs';
import {pokketBlokUi} from '../catalog';
import {pokketBlokCatalog} from '../catalog';

jest.mock('sonner-native', () => ({toast: {info: jest.fn(), error: jest.fn(), success: jest.fn()}}));
jest.mock('@rn-primitives/slot', () => {
  const {Pressable, Text, View} = jest.requireActual<typeof import('react-native')>('react-native');
  return {Pressable, Text, View};
});

/**
 * Orkestrator's `bloks/catalog.test.ts`, for what pokket draws: every
 * component is the spec's (the base catalog's), with the spec's props, and the
 * families of the base catalog a phone renders whole are complete.
 */

const components = [...pokketBlokCatalog.components.values()];

/** The families of the base catalog pokket draws in full; of `shadcn` only what a phone has an answer for. */
const COMPLETE = ['language', 'run', 'html', 'ui', 'logo', 'scene', 'structure'] as const;

/** Pokket's own components, beyond the spec: lovekit streams. */
const POKKET_OWN = new Set(['StreamRender']);

describe('the blok catalog', () => {
  it.each(COMPLETE)('draws every component of the %s family of the base catalog', name => {
    const missing = baseCatalog().components.filter(component => component.group === name && !pokketBlokCatalog.components.has(component.name));
    expect(missing.map(component => component.name)).toEqual([]);
  });

  it('draws the base catalog whole where a phone can: scenes and logos, not yet every html component', () => {
    // The shadcn family is drawn in part (sheets, menus and charts have no answer here yet), so html is not whole.
    expect(pokketBlokUi.contexts).toEqual(['SCENE', 'LOGO']);
    expect(pokketBlokUi.claims).toEqual(['base@4']);
  });

  it('draws nothing the spec does not hold, with every prop the spec gives it', () => {
    const view = defaultBlokView();
    const extra: string[] = [];
    const props: string[] = [];
    const callbacks: string[] = [];
    for (const definition of components) {
      if (POKKET_OWN.has(definition.name)) continue;
      const spec = view.components.get(definition.name);
      if (!spec) {
        extra.push(definition.name);
        continue;
      }
      const shape = definition.schema.shape as Record<string, z.ZodTypeAny>;
      for (const prop of spec.props) {
        if (!(prop.key in shape)) props.push(`${definition.name}.${prop.key}`);
        else if (prop.kind === 'CALLBACK' && !isActionSchema(shape[prop.key])) callbacks.push(`${definition.name}.${prop.key}`);
      }
    }
    expect({extra, props, callbacks}).toEqual({extra: [], props: [], callbacks: []});
  });

  it('describes every component', () => {
    expect(components.filter(component => !component.schema?.description).map(component => component.name)).toEqual([]);
  });
});
