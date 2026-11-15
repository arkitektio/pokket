import {StyleSheet, rem} from 'nativewind';

/**
 * The classes a blok brings that Tailwind was not there to compile.
 *
 * Nativewind compiles classes when the app is built, from a list
 * (`tailwind.blok-safelist.js`). A blok's `className` arrives at run time, and
 * two things it may say are on no list: a value in brackets (`w-[12rem]`,
 * `bg-[#1e293b]`), of which there are endlessly many, and `space-x-*` /
 * `space-y-*`, which Tailwind writes with a sibling selector React Native has
 * none of.
 *
 * Both are translated here into the rule nativewind's own compiler would have
 * written, and handed to its runtime (`StyleSheet.registerCompiled`), so a
 * component that passes `className` on draws them like any other class. A
 * tree's classes are registered before it is drawn (`BlokRenderer`).
 *
 * What is translated is what the blok language calls portable
 * (`vocabulary.json`: `classes.arbitrary_values`). Anything else in brackets
 * stays without a style, as before.
 */

type Style = Record<string, string | number>;

/** A CSS length as React Native takes one: points, or a percentage. */
const length = (raw: string): number | string | null => {
  const match = /^(-?\d*\.?\d+)(px|rem|em|%)?$/.exec(raw);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;
  if (match[2] === '%') return `${amount}%`;
  return match[2] === 'rem' || match[2] === 'em' ? amount * rem.get() : amount;
};

const points = (raw: string): number | null => {
  const value = length(raw);
  return typeof value === 'number' ? value : null;
};

const number = (raw: string): number | null => (/^-?\d*\.?\d+$/.test(raw) && Number.isFinite(Number(raw)) ? Number(raw) : null);

/** A colour as it is written in brackets: Tailwind spells a space as an underscore. */
const colour = (raw: string): string | null => {
  const value = raw.replace(/_/g, ' ');
  return /^(#[0-9a-fA-F]{3,8}|(rgb|rgba|hsl|hsla)\(.+\))$/.test(value) ? value : null;
};

const all =
  (...keys: string[]) =>
  (value: string | number): Style =>
    Object.fromEntries(keys.map(key => [key, value]));

/** Utilities that take a length, with the style keys each sets. */
const LENGTHS: Readonly<Record<string, (value: string | number) => Style>> = {
  w: all('width'),
  h: all('height'),
  size: all('width', 'height'),
  'min-w': all('minWidth'),
  'max-w': all('maxWidth'),
  'min-h': all('minHeight'),
  'max-h': all('maxHeight'),
  basis: all('flexBasis'),
  p: all('padding'),
  px: all('paddingLeft', 'paddingRight'),
  py: all('paddingTop', 'paddingBottom'),
  pt: all('paddingTop'),
  pr: all('paddingRight'),
  pb: all('paddingBottom'),
  pl: all('paddingLeft'),
  m: all('margin'),
  mx: all('marginLeft', 'marginRight'),
  my: all('marginTop', 'marginBottom'),
  mt: all('marginTop'),
  mr: all('marginRight'),
  mb: all('marginBottom'),
  ml: all('marginLeft'),
  gap: all('rowGap', 'columnGap'),
  'gap-x': all('columnGap'),
  'gap-y': all('rowGap'),
  inset: all('top', 'right', 'bottom', 'left'),
  'inset-x': all('left', 'right'),
  'inset-y': all('top', 'bottom'),
  top: all('top'),
  right: all('right'),
  bottom: all('bottom'),
  left: all('left'),
  // Between the children of a flex container a gap is what a margin on every child but the first comes to.
  'space-x': all('columnGap'),
  'space-y': all('rowGap'),
};

/** Utilities that take points only: React Native has no percentage for these. */
const POINTS: Readonly<Record<string, (value: number) => Style>> = {
  rounded: all('borderRadius'),
  'rounded-t': all('borderTopLeftRadius', 'borderTopRightRadius'),
  'rounded-r': all('borderTopRightRadius', 'borderBottomRightRadius'),
  'rounded-b': all('borderBottomLeftRadius', 'borderBottomRightRadius'),
  'rounded-l': all('borderTopLeftRadius', 'borderBottomLeftRadius'),
  'rounded-tl': all('borderTopLeftRadius'),
  'rounded-tr': all('borderTopRightRadius'),
  'rounded-br': all('borderBottomRightRadius'),
  'rounded-bl': all('borderBottomLeftRadius'),
  leading: all('lineHeight'),
  tracking: all('letterSpacing'),
};

/** Border utilities take a width or a colour, by what the brackets hold. */
const BORDERS: Readonly<Record<string, readonly [width: string[], colour: string[]]>> = {
  border: [['borderWidth'], ['borderColor']],
  'border-t': [['borderTopWidth'], ['borderTopColor']],
  'border-r': [['borderRightWidth'], ['borderRightColor']],
  'border-b': [['borderBottomWidth'], ['borderBottomColor']],
  'border-l': [['borderLeftWidth'], ['borderLeftColor']],
  'border-x': [['borderLeftWidth', 'borderRightWidth'], ['borderLeftColor', 'borderRightColor']],
  'border-y': [['borderTopWidth', 'borderBottomWidth'], ['borderTopColor', 'borderBottomColor']],
};

const NUMBERS: Readonly<Record<string, string>> = {opacity: 'opacity', z: 'zIndex', flex: 'flex', grow: 'flexGrow', shrink: 'flexShrink'};

/** Utilities whose sign in front (`-mt-[4px]`) negates the value. */
const NEGATABLE = /^(m[xytrbl]?|inset(-[xy])?|top|right|bottom|left|space-[xy]|tracking|z)$/;

/** Tailwind's spacing scale, for `space-x-4`: a quarter rem a step, `px` one point. */
const scale = (step: string): number | null => (step === 'px' ? 1 : number(step) === null ? null : (number(step) as number) * 0.25 * rem.get());

const negated = (value: string | number): string | number =>
  typeof value === 'number' ? -value : value.startsWith('-') ? value.slice(1) : `-${value}`;

/**
 * The style of one class the build could not compile, or null for a class
 * this does not translate (one on the safelist, one with a variant, one React
 * Native has no answer for).
 */
export const blokClassStyle = (token: string): Style | null => {
  if (token.includes(':')) return null;
  const negative = token.startsWith('-');
  const name = negative ? token.slice(1) : token;
  const bracket = /^([a-z][a-z-]*)-\[(.+)\]$/.exec(name);
  const spaced = bracket ? null : /^(space-[xy])-(px|\d*\.?\d+)$/.exec(name);
  const utility = bracket?.[1] ?? spaced?.[1];
  if (!utility) return null;
  if (negative && !NEGATABLE.test(utility)) return null;
  const sign = (value: string | number) => (negative ? negated(value) : value);

  if (spaced) {
    const gap = scale(spaced[2]);
    return gap === null ? null : LENGTHS[utility](sign(gap));
  }
  const raw = (bracket as RegExpExecArray)[2];

  if (utility in LENGTHS) {
    const value = length(raw);
    return value === null ? null : LENGTHS[utility](sign(value));
  }
  if (utility in POINTS) {
    // A line height or a letter spacing without a unit is a factor of the font size, which a style here cannot say.
    if ((utility === 'leading' || utility === 'tracking') && !/(px|rem)$/.test(raw)) return null;
    const value = points(raw);
    return value === null ? null : POINTS[utility](sign(value) as number);
  }
  if (utility in BORDERS) {
    const [widths, colours] = BORDERS[utility];
    const width = points(raw);
    if (width !== null) return all(...widths)(width);
    const paint = colour(raw);
    return paint === null ? null : all(...colours)(paint);
  }
  if (utility in NUMBERS) {
    const value = number(raw);
    if (value === null) return null;
    return {[NUMBERS[utility]]: utility === 'z' ? Math.trunc(sign(value) as number) : value};
  }
  if (utility === 'text') {
    const size = points(raw);
    if (size !== null) return {fontSize: size};
    const paint = colour(raw);
    return paint === null ? null : {color: paint};
  }
  if (utility === 'bg') {
    const paint = colour(raw);
    return paint === null ? null : {backgroundColor: paint};
  }
  if (utility === 'aspect') {
    const ratio = /^(\d*\.?\d+)\/(\d*\.?\d+)$/.exec(raw);
    const value = ratio ? Number(ratio[1]) / Number(ratio[2]) : number(raw);
    return value !== null && Number.isFinite(value) && value > 0 ? {aspectRatio: value} : null;
  }
  return null;
};

const registered = new Set<string>();
/** Above every class the build compiled: what a blok writes in brackets wins over the scale. */
let order = 1_000_000;

/** Makes every class of `classNames` this translates known to nativewind; the rest are left to it. */
export const registerBlokClasses = (classNames: Iterable<string>): void => {
  const rules: Record<string, {n: Array<{s: [number, number]; d: Style[][]}>}> = {};
  for (const className of classNames) {
    for (const token of className.split(/\s+/)) {
      if (!token || registered.has(token)) continue;
      registered.add(token);
      const style = blokClassStyle(token);
      if (style) rules[token] = {n: [{s: [(order += 1), 1], d: [[style]]}]};
    }
  }
  if (Object.keys(rules).length > 0) {
    StyleSheet.registerCompiled({$compiled: true, rules} as unknown as Parameters<typeof StyleSheet.registerCompiled>[0]);
  }
};

/** Whether a string could hold a class this translates: cheap, so every text of a tree can be asked. */
const MAY_HOLD = /\[|space-[xy]-/;

/**
 * Every string of a stored tree that could hold such a class: a `className`
 * written out, and the literals of one that is computed (`str.classes`, a
 * ternary). A string that is no class registers nothing.
 */
export const blokClassTexts = (tree: unknown, found: string[] = []): string[] => {
  if (typeof tree === 'string') {
    if (MAY_HOLD.test(tree)) found.push(tree);
  } else if (Array.isArray(tree)) {
    for (const item of tree) blokClassTexts(item, found);
  } else if (tree !== null && typeof tree === 'object') {
    // A node's id and component hold brackets too (`Card[0]`), and are never classes.
    for (const [key, value] of Object.entries(tree)) if (key !== 'id' && key !== 'component') blokClassTexts(value, found);
  }
  return found;
};
