import * as React from 'react';
import {loadVocabulary} from '@arkitektio/bsx/spec/vocabulary';
import {useBrand} from '@/lib/theme/BrandProvider';
import {buildBrandTokens, type Brand} from '@/lib/theme/brandTokens';

/**
 * orkestrator's `bloks/scene/colour.ts`: a scene colour is a colour role of
 * the theme (`brand`, `info`, `chart-2`, `spectrum-green`), resolved against
 * the viewer's brand. Orkestrator reads the role's CSS variable off the
 * document; pokket has no document, so the role is looked up in the tokens
 * the brand builds (`buildBrandTokens`, the same numbers the app's classes use).
 */

/** What a role paints as when the theme has no such token. */
export const FALLBACK_SCENE_RGB = '#38bdf8';

/** How a theme colour is found: the role's token, and a painter that turns it into a colour three.js parses. */
export type ThemeColourReader = {
  /** The role's token (an `H S% L%` triplet, or any CSS colour), or an empty string. */
  variable: (role: string) => string;
  /** The token as a colour three.js parses, or null when it cannot be painted. */
  paint: (css: string) => string | null;
};

const isRole = (value: string): boolean => loadVocabulary().theme.colourRoles.includes(value);

/**
 * A scene colour: a colour role of the theme resolved by `reader`. A value
 * that is no role (the validator warns about it) is passed through as written.
 */
export const resolveThemeColour = (value: string, reader: ThemeColourReader, fallback: string = FALLBACK_SCENE_RGB): string => {
  const role = value.trim();
  if (!isRole(role)) return value;
  const css = reader.variable(role).trim();
  if (!css) return fallback;
  return reader.paint(css) ?? fallback;
};

const TRIPLET = /^(-?[\d.]+)\s+(-?[\d.]+)%\s+(-?[\d.]+)%$/;

/** The reader of a brand's tokens: `--<role>` as `hsl(h, s%, l%)`, the spelling three.js parses. */
export const brandThemeReader = (brand: Brand): ThemeColourReader => {
  const tokens = buildBrandTokens(brand.hue, brand.chroma);
  return {
    variable: role => tokens[`--${role}`] ?? '',
    paint: css => {
      const triplet = TRIPLET.exec(css);
      return triplet ? `hsl(${triplet[1]}, ${triplet[2]}%, ${triplet[3]}%)` : null;
    },
  };
};

/** A scene colour prop resolved once per value and brand; undefined stays undefined (the prop was not given). */
export const useThemeColour = (value: string | undefined | null, fallback?: string): string | undefined => {
  const brand = useBrand();
  const reader = React.useMemo(() => brandThemeReader(brand), [brand]);
  return React.useMemo(() => (value ? resolveThemeColour(value, reader, fallback) : undefined), [value, reader, fallback]);
};
