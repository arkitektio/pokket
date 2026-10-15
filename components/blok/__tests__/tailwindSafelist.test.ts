/**
 * @jest-environment node
 */
import {beforeAll, describe, expect, it} from '@jest/globals';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import {cssToReactNativeRuntime} from 'react-native-css-interop/dist/css-to-rn';
import {cssToReactNativeRuntimeOptions} from 'nativewind/dist/metro/common';

// The nativewind preset picks its platform fonts when it loads.
process.env.NATIVEWIND_OS = 'ios';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require('../../../tailwind.config.js');

/**
 * Compiles the app's Tailwind config the way nativewind's metro transformer
 * does, with no source to scan: what is left is what the safelist alone
 * guarantees a blok's runtime `className`.
 */
const compileSafelist = async () => {
  const {css} = await postcss([tailwind({...config, content: [{raw: ''}]})]).process(
    '@tailwind base;@tailwind components;@tailwind utilities;',
    {from: undefined},
  );
  return cssToReactNativeRuntime(css, cssToReactNativeRuntimeOptions).rules as Record<string, unknown>;
};

describe('blok tailwind safelist', () => {
  let rules: Record<string, unknown>;

  beforeAll(async () => {
    rules = await compileSafelist();
  }, 60_000);

  it.each([
    // layout
    'p-7', 'px-3.5', '-mt-2', 'mx-auto', 'gap-x-3', 'w-1/2', 'h-64', 'max-w-md', 'min-h-12', 'basis-1/3',
    'flex-row', 'flex-wrap', 'flex-1', 'shrink-0', 'items-center', 'justify-between', 'self-end',
    'absolute', 'inset-0', 'top-2', 'z-10', 'opacity-50', 'overflow-hidden', 'aspect-square',
    // typography
    'text-2xl', 'font-semibold', 'font-mono', 'leading-tight', 'tracking-wide', 'italic', 'uppercase',
    'underline', 'text-center', 'line-clamp-2',
    // borders and surfaces
    'border', 'border-2', 'border-t', 'border-dashed', 'rounded-lg', 'rounded-tl-xl', 'rounded-full', 'shadow-md',
    // colours
    'bg-primary', 'bg-primary/10', 'text-muted-foreground', 'border-destructive/30', 'bg-chart-3/20',
    'text-amber-700', 'bg-slate-950', 'border-rose-200', 'bg-sky-500/10', 'border-emerald-500/30',
    'bg-transparent',
  ])('compiles %s', className => {
    expect(rules[className]).toBeDefined();
  });

  // Not drawable in React Native: nothing to safelist, a blok gets no style.
  it.each(['grid-cols-2', 'space-x-2', 'hover:bg-primary', 'md:flex-row'])('leaves out %s', className => {
    expect(rules[className]).toBeUndefined();
  });
});
