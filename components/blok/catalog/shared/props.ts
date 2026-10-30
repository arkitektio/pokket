import {cva} from 'class-variance-authority';
import type {DimensionValue, TextStyle, ViewStyle} from 'react-native';
import * as z from 'zod';
import {BlokPropSchemas, useValue, type BlokPropHandle} from '@arkitektio/bsx/runtime';
import {
  alignSchema,
  boolSchema,
  justifySchema,
  numberSchema,
  overflowSchema,
  sizeSchema,
  spacingSchema,
  textAlignSchema,
  textSizeSchema,
  textToneSchema,
  textWeightSchema,
} from '@arkitektio/bsx/catalogs';

/**
 * Orkestrator's `shared/props.ts`, for React Native. The schemas are the
 * same — a blok is written once for both — but the CSS values they carry
 * (`"0.5rem"`, `"100%"`, `"12px 1rem"`) are turned into RN style values
 * here, since React Native has no CSS units.
 */

export type BaseLayoutProps = {
  gap?: string;
  padding?: string;
  margin?: string;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  height?: string;
  minHeight?: string;
  maxHeight?: string;
  background?: string;
  color?: string;
  borderColor?: string;
  radius?: string;
  overflow?: 'visible' | 'hidden' | 'auto' | 'scroll';
  grow?: number;
  shrink?: number;
};

export type BaseLayoutBlok = {
  gap?: BlokPropHandle<typeof spacingSchema>;
  padding?: BlokPropHandle<typeof spacingSchema>;
  margin?: BlokPropHandle<typeof spacingSchema>;
  width?: BlokPropHandle<typeof sizeSchema>;
  minWidth?: BlokPropHandle<typeof sizeSchema>;
  maxWidth?: BlokPropHandle<typeof sizeSchema>;
  height?: BlokPropHandle<typeof sizeSchema>;
  minHeight?: BlokPropHandle<typeof sizeSchema>;
  maxHeight?: BlokPropHandle<typeof sizeSchema>;
  background?: BlokPropHandle<z.ZodOptional<typeof BlokPropSchemas.DynamicString>>;
  color?: BlokPropHandle<z.ZodOptional<typeof BlokPropSchemas.DynamicString>>;
  borderColor?: BlokPropHandle<z.ZodOptional<typeof BlokPropSchemas.DynamicString>>;
  radius?: BlokPropHandle<typeof sizeSchema>;
  overflow?: BlokPropHandle<typeof overflowSchema>;
  grow?: BlokPropHandle<typeof numberSchema>;
  shrink?: BlokPropHandle<typeof numberSchema>;
};

export type TextPresentationBlok = {
  tone?: BlokPropHandle<typeof textToneSchema>;
  size?: BlokPropHandle<typeof textSizeSchema>;
  weight?: BlokPropHandle<typeof textWeightSchema>;
  align?: BlokPropHandle<typeof textAlignSchema>;
  mono?: BlokPropHandle<typeof boolSchema>;
  italic?: BlokPropHandle<typeof boolSchema>;
  truncate?: BlokPropHandle<typeof boolSchema>;
};

const ROOT_FONT_SIZE = 16;

/**
 * One CSS length as an RN dimension: `px` and bare numbers are points,
 * `rem`/`em` are 16 points, a percentage stays a percentage. Anything RN cannot
 * express (`calc()`, `vh`, `fit-content`) is dropped rather than crashing the
 * style.
 */
export const cssLength = (raw: string | number | undefined | null): DimensionValue | undefined => {
  if (raw == null || raw === '') return undefined;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : undefined;
  const value = raw.trim();
  if (value === 'auto') return 'auto';
  const match = /^(-?\d*\.?\d+)(px|rem|em|%)?$/.exec(value);
  if (!match) return undefined;
  const amount = Number(match[1]);
  switch (match[2]) {
    case '%':
      return `${amount}%`;
    case 'rem':
    case 'em':
      return amount * ROOT_FONT_SIZE;
    default:
      return amount;
  }
};

/** A length that must be a number (gap, border radius). */
export const cssPoints = (raw: string | number | undefined | null): number | undefined => {
  const length = cssLength(raw);
  return typeof length === 'number' ? length : undefined;
};

/**
 * The CSS shorthand `"a"`, `"a b"`, `"a b c"` or `"a b c d"` for padding or
 * margin, spread over RN's per-edge keys.
 */
export const cssBox = (
  raw: string | undefined,
  prefix: 'padding' | 'margin',
): ViewStyle => {
  if (!raw) return {};
  const parts = raw.trim().split(/\s+/).map(cssLength);
  const [top, right = top, bottom = top, left = right] = parts;
  return {
    [`${prefix}Top`]: top,
    [`${prefix}Right`]: right,
    [`${prefix}Bottom`]: bottom,
    [`${prefix}Left`]: left,
  };
};

/** A CSS colour RN understands; gradients and `var()` are dropped. */
export const cssColor = (raw: string | undefined): string | undefined =>
  raw && !/gradient|var\(|url\(/.test(raw) ? raw : undefined;

export const buildLayoutStyle = (props: BaseLayoutProps): ViewStyle => ({
  gap: cssPoints(props.gap),
  ...cssBox(props.padding, 'padding'),
  ...cssBox(props.margin, 'margin'),
  width: cssLength(props.width),
  minWidth: cssLength(props.minWidth),
  maxWidth: cssLength(props.maxWidth),
  height: cssLength(props.height),
  minHeight: cssLength(props.minHeight),
  maxHeight: cssLength(props.maxHeight),
  backgroundColor: cssColor(props.background),
  borderColor: cssColor(props.borderColor),
  borderRadius: cssPoints(props.radius),
  // RN clips or does not; a scrolling box is a `ScrollArea`.
  overflow: props.overflow === 'hidden' || props.overflow === 'auto' || props.overflow === 'scroll'
    ? 'hidden'
    : undefined,
  flexGrow: props.grow,
  flexShrink: props.shrink,
});

/** The layout colour that applies to text inside a box. */
export const buildLayoutTextStyle = (props: BaseLayoutProps): TextStyle | undefined => {
  const color = cssColor(props.color);
  return color ? {color} : undefined;
};

export const useBaseLayoutProps = (blok: BaseLayoutBlok): BaseLayoutProps => {
  const gap = useValue(blok.gap);
  const padding = useValue(blok.padding);
  const margin = useValue(blok.margin);
  const width = useValue(blok.width);
  const minWidth = useValue(blok.minWidth);
  const maxWidth = useValue(blok.maxWidth);
  const height = useValue(blok.height);
  const minHeight = useValue(blok.minHeight);
  const maxHeight = useValue(blok.maxHeight);
  const background = useValue(blok.background);
  const color = useValue(blok.color);
  const borderColor = useValue(blok.borderColor);
  const radius = useValue(blok.radius);
  const overflow = useValue(blok.overflow);
  const grow = useValue(blok.grow);
  const shrink = useValue(blok.shrink);

  return {
    gap,
    padding,
    margin,
    width,
    minWidth,
    maxWidth,
    height,
    minHeight,
    maxHeight,
    background,
    color,
    borderColor,
    radius,
    overflow,
    grow,
    shrink,
  };
};

export const useTextPresentationProps = (blok: TextPresentationBlok) => {
  const tone = useValue(blok.tone);
  const size = useValue(blok.size);
  const weight = useValue(blok.weight);
  const align = useValue(blok.align);
  const mono = useValue(blok.mono);
  const italic = useValue(blok.italic);
  const truncate = useValue(blok.truncate);

  return {tone, size, weight, align, mono, italic, truncate};
};

export const mapJustify = (justify?: z.infer<typeof justifySchema>) => {
  switch (justify) {
    case 'center':
      return 'justify-center';
    case 'end':
      return 'justify-end';
    case 'between':
      return 'justify-between';
    case 'around':
      return 'justify-around';
    case 'evenly':
      return 'justify-evenly';
    case 'start':
    default:
      return 'justify-start';
  }
};

export const mapAlign = (align?: z.infer<typeof alignSchema>) => {
  switch (align) {
    case 'center':
      return 'items-center';
    case 'end':
      return 'items-end';
    case 'baseline':
      return 'items-baseline';
    case 'stretch':
      return 'items-stretch';
    case 'start':
    default:
      return 'items-start';
  }
};

export const mapTextAlign = (align?: 'start' | 'center' | 'end') => {
  switch (align) {
    case 'center':
      return 'text-center';
    case 'end':
      return 'text-right';
    case 'start':
    default:
      return 'text-left';
  }
};

export const textVariants = cva('text-sm leading-relaxed', {
  variants: {
    tone: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      destructive: 'text-destructive',
      success: 'text-emerald-600 dark:text-emerald-400',
    },
    size: {
      xs: 'text-xs leading-relaxed',
      sm: 'text-sm leading-relaxed',
      base: 'text-base leading-7',
      lg: 'text-lg leading-8',
    },
    weight: {
      regular: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
  },
  defaultVariants: {
    tone: 'default',
    size: 'sm',
    weight: 'regular',
  },
});

/**
 * The class list every text-bearing blok composes. `truncate` is not a class
 * in RN: pass `numberOfLines={textLines(presentation)}` alongside.
 */
export const textPresentationClasses = (
  presentation: ReturnType<typeof useTextPresentationProps>,
): Array<string | false | undefined> => [
  textVariants({
    tone: presentation.tone,
    size: presentation.size,
    weight: presentation.weight,
  }),
  mapTextAlign(presentation.align),
  presentation.mono && 'font-mono',
  presentation.italic && 'italic',
];

export const textLines = (presentation: {truncate?: boolean}): number | undefined =>
  presentation.truncate ? 1 : undefined;
