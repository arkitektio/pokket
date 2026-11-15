import {beforeAll, describe, expect, it, jest} from '@jest/globals';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import {cssToReactNativeRuntime} from 'react-native-css-interop/dist/css-to-rn';
import {cssToReactNativeRuntimeOptions} from 'nativewind/dist/metro/common';
import {StyleSheet} from 'nativewind';
import {blokClassStyle, blokClassTexts, registerBlokClasses} from '../classes';

process.env.NATIVEWIND_OS = 'ios';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require('../../../tailwind.config.js');

/** What nativewind's own compiler writes for these classes, when it sees them at build time. */
const compiled = async (classes: readonly string[]) => {
  const {css} = await postcss([tailwind({...config, safelist: [], content: [{raw: `<div class="${classes.join(' ')}">`}]})]).process(
    '@tailwind utilities;',
    {from: undefined},
  );
  const rules = cssToReactNativeRuntime(css, cssToReactNativeRuntimeOptions).rules as Record<string, {n?: Array<{d: unknown[][]}>}>;
  return (name: string): unknown => rules[name]?.n?.[0]?.d?.[0]?.[0];
};

/** Classes whose compiled rule is a plain style: the translation must say the same. */
const SAME_AS_COMPILED = [
  'w-[12rem]', 'h-[50%]', 'size-[2rem]', 'min-w-[10px]', 'max-w-[20rem]', 'min-h-[2rem]', 'max-h-[75%]', 'basis-[30%]',
  'p-[10px]', 'pt-[3px]', 'pr-[0.5rem]', 'pb-[1px]', 'pl-[2rem]', 'm-[4px]', 'mt-[-4px]', '-mt-[4px]', 'mr-[1rem]',
  'gap-[0.75rem]', 'gap-x-[6px]', 'gap-y-[2px]', 'top-[3px]', 'left-[10%]', '-top-[3px]',
  'rounded-[6px]', 'rounded-tl-[4px]', 'border-[3px]', 'border-t-[2px]', 'border-[#ff0000]',
  'text-[13px]', 'text-[#1e293b]', 'bg-[#ff0000]',
  'z-[5]', 'grow-[2]', 'shrink-[0]',
] as const;

describe('the classes a blok brings that the build could not compile', () => {
  let ofCompiler: (name: string) => unknown;

  beforeAll(async () => {
    ofCompiler = await compiled(SAME_AS_COMPILED);
  }, 60_000);

  it.each(SAME_AS_COMPILED)('translates %s as nativewind compiles it', className => {
    const expected = ofCompiler(className);
    expect(expected).toBeDefined();
    expect(blokClassStyle(className)).toEqual(expected);
  });

  it('translates what the compiler writes another way, to the same style', () => {
    expect(blokClassStyle('px-[8px]')).toEqual({paddingLeft: 8, paddingRight: 8});
    expect(blokClassStyle('inset-[4px]')).toEqual({top: 4, right: 4, bottom: 4, left: 4});
    expect(blokClassStyle('opacity-[0.35]')).toEqual({opacity: 0.35});
    expect(blokClassStyle('leading-[20px]')).toEqual({lineHeight: 20});
    expect(blokClassStyle('aspect-[4/3]')).toEqual({aspectRatio: 4 / 3});
    expect(blokClassStyle('text-[rgb(0_0_0)]')).toEqual({color: 'rgb(0 0 0)'});
    expect(blokClassStyle('bg-[rgb(10,20,30)]')).toEqual({backgroundColor: 'rgb(10,20,30)'});
  });

  it('spaces the children of a container as a gap does', () => {
    // Tailwind writes `space-*` with a sibling selector, which React Native has none of: nativewind leaves it out.
    expect(blokClassStyle('space-y-2')).toEqual({rowGap: 7});
    expect(blokClassStyle('space-x-4')).toEqual({columnGap: 14});
    expect(blokClassStyle('space-x-px')).toEqual({columnGap: 1});
    expect(blokClassStyle('space-y-[10px]')).toEqual({rowGap: 10});
  });

  it('leaves alone what is on the safelist, what has a variant, and what React Native cannot draw', () => {
    for (const className of ['w-48', 'p-4', 'bg-primary', 'flex-row', 'dark:w-[12rem]', 'md:p-[4px]', 'grid-cols-[1fr_2fr]', 'translate-x-[10px]', 'w-[calc(100%-1rem)]', 'leading-[1.2]', '-p-[4px]', '[mask-type:luminance]', 'Card[0]']) {
      expect(blokClassStyle(className)).toBeNull();
    }
  });

  it('finds the classes of a tree, written out or computed, and never a node id', () => {
    const tree = [
      {
        id: 'Html[0]',
        component: 'Html',
        children: [
          {id: 'Html[0]/Card[0]', component: 'Card', props: [{key: 'className', static_value: 'w-[12rem] p-4'}, {key: 'title', static_value: 'plain'}]},
          {
            id: 'x',
            component: 'div',
            props: [{key: 'className', util_call: {operation: 'str.classes', arguments: [{key: 'values', value_list: [{value_literal: 'space-y-2'}, {value_path: 'args.x'}]}]}}],
          },
        ],
      },
    ];
    expect(blokClassTexts(tree)).toEqual(['w-[12rem] p-4', 'space-y-2']);
  });

  it('hands nativewind a rule for each, once', () => {
    const register = jest.spyOn(StyleSheet, 'registerCompiled').mockImplementation(() => undefined);
    registerBlokClasses(['w-[7rem] p-4 bg-[#123456]', 'w-[7rem] nonsense-[x]']);
    registerBlokClasses(['w-[7rem]']);
    expect(register).toHaveBeenCalledTimes(1);
    const {rules} = register.mock.calls[0][0] as {rules: Record<string, {n: Array<{d: unknown[][]}>}>};
    expect(Object.keys(rules)).toEqual(['w-[7rem]', 'bg-[#123456]']);
    expect(rules['w-[7rem]'].n[0].d).toEqual([[{width: 98}]]);
    register.mockRestore();
  });
});
