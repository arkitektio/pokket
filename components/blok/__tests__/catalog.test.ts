import {describe, expect, it, jest} from '@jest/globals';
import * as z from 'zod';
import {isActionSchema} from '@arkitektio/bsx/runtime';
import {baseCatalog, defaultBlokView, standardCatalog} from '@arkitektio/bsx/spec/catalogs';
import {pokketBlokCatalog} from '../catalog';

jest.mock('sonner-native', () => ({toast: {info: jest.fn(), error: jest.fn(), success: jest.fn()}}));
jest.mock('@rn-primitives/slot', () => {
  const {Pressable, Text, View} = jest.requireActual<typeof import('react-native')>('react-native');
  return {Pressable, Text, View};
});

/**
 * Orkestrator's `bloks/catalog.test.ts`, for what pokket draws: every
 * component is the spec's (a standard catalog's, or the orkestrator module's,
 * for the few of its extras pokket draws too), with the spec's props, and the
 * language and the catalogs a phone renders whole are complete.
 */

const components = [...pokketBlokCatalog.components.values()];

/** Standard catalogs pokket implements in full. */
const COMPLETE = ['html', 'ui', 'logo', 'scene', 'structure'] as const;

/** Pokket's own components, beyond the spec: lovekit streams. */
const POKKET_OWN = new Set(['StreamRender']);

describe('the blok catalog', () => {
  it('implements the language (base@2) whole', () => {
    const missing = baseCatalog().components.filter(component => !pokketBlokCatalog.components.has(component.name));
    expect(missing.map(component => component.name)).toEqual([]);
  });

  it.each(COMPLETE)('implements every component of %s@1', name => {
    const missing = standardCatalog(name).components.filter(component => !pokketBlokCatalog.components.has(component.name));
    expect(missing.map(component => component.name)).toEqual([]);
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
