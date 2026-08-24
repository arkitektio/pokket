import { oklchToHslTriplet } from './oklch';

/**
 * The whole palette, derived from two numbers.
 *
 * The L/C constants come from orkestrator-next's `.dark` block (index.css), not
 * from pokket's own previous teal, on purpose. HSL hue 165 — what global.css
 * used to say — is OKLCh hue ~179, so a recipe calibrated to the old palette
 * would render every organization's brand color ~14 degrees off from what the
 * same person sees in orkestrator. Matching orkestrator is the point of the
 * feature, so the default teal shifted slightly rather than the other way round.
 *
 * Three tokens keep pokket's own measured values instead (see BASE below):
 * orkestrator's dark background is pure black, and its border/input are
 * white-alpha, which an HSL triplet cannot carry.
 */

export type Brand = { hue: number; chroma: number };

/** orkestrator-next's dark defaults. Used whenever no membership color applies. */
export const DEFAULT_BRAND: Brand = { hue: 165.057, chroma: 0.14384 };

/** `chroma` means "use the brand chroma"; `[m, chroma]` means "scale it". */
type ChromaSpec = number | 'chroma' | { scale: number };

type TokenSpec = {
  /** OKLCh lightness. */
  l: number;
  c: ChromaSpec;
  /** Degrees to add to the brand hue. */
  dh?: number;
};

const TOKENS: Record<string, TokenSpec> = {
  '--background': { l: 0.148, c: 0.004 },
  '--foreground': { l: 0.985, c: 0.005 },

  '--card': { l: 0.205, c: 0.01 },
  '--popover': { l: 0.205, c: 0.01 },

  '--primary': { l: 0.70058, c: 'chroma' },
  '--primary-foreground': { l: 0.15, c: 0.02 },

  '--secondary': { l: 0.274, c: 0.006 },
  '--muted': { l: 0.269, c: 0.005 },
  '--muted-foreground': { l: 0.708, c: 0.01 },
  '--accent': { l: 0.371, c: 0.01 },

  '--border': { l: 0.286, c: 0.01 },
  '--input': { l: 0.308, c: 0.011 },
  '--ring': { l: 0.556, c: { scale: 0.5 } },

  '--chart-1': { l: 0.85, c: 0.13, dh: 0 },
  '--chart-2': { l: 0.77, c: 0.15, dh: -2 },
  '--chart-3': { l: 0.7, c: 0.15, dh: -3 },
  '--chart-4': { l: 0.6, c: 0.13, dh: -2 },
  '--chart-5': { l: 0.51, c: 0.1, dh: 1 },
};

/** Tokens that mirror another token rather than deriving their own color. */
const ALIASES: Record<string, string> = {
  '--card-foreground': '--foreground',
  '--popover-foreground': '--foreground',
  '--secondary-foreground': '--foreground',
  '--accent-foreground': '--foreground',
};

/** Hue-independent, exactly as in orkestrator. */
const CONSTANTS: Record<string, string> = {
  '--white': '0 0% 100%',
  '--black': '0 0% 0%',
  '--destructive': '0 72% 51%',
  '--destructive-foreground': '0 0% 98%',
};

const resolveChroma = (c: ChromaSpec, chroma: number): number => {
  if (c === 'chroma') return chroma;
  if (typeof c === 'number') return c;
  return chroma * c.scale;
};

export function buildBrandTokens(
  hue: number = DEFAULT_BRAND.hue,
  chroma: number = DEFAULT_BRAND.chroma,
): Record<string, string> {
  const tokens: Record<string, string> = { ...CONSTANTS };

  for (const [name, spec] of Object.entries(TOKENS)) {
    tokens[name] = oklchToHslTriplet(spec.l, resolveChroma(spec.c, chroma), hue + (spec.dh ?? 0));
  }

  for (const [name, target] of Object.entries(ALIASES)) {
    tokens[name] = tokens[target];
  }

  return tokens;
}

/** A brand is only usable if both numbers are present and in range — the
 * backend fields are nullable and the app must never render untinted. */
export function normalizeBrand(
  hue: number | null | undefined,
  chroma: number | null | undefined,
): Brand {
  const hueOk = typeof hue === 'number' && Number.isFinite(hue) && hue >= 0 && hue <= 360;
  const chromaOk =
    typeof chroma === 'number' && Number.isFinite(chroma) && chroma >= 0 && chroma <= 1;

  if (!hueOk || !chromaOk) return DEFAULT_BRAND;
  return { hue, chroma };
}

/**
 * The same tokens as complete `hsl(...)` colors, for the React Native props
 * that take a color string rather than a class name — `color` on an icon,
 * `placeholderTextColor`, `trackColor` on a Switch. NativeWind's `vars()`
 * cannot reach those, which is why they were all hardcoded at the pre-brand
 * palette and stopped matching the rest of the UI.
 */
export type ThemeColors = {
  background: string;
  foreground: string;
  card: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  border: string;
  input: string;
  ring: string;
  destructive: string;
  destructiveForeground: string;
};

export function buildThemeColors(
  hue: number = DEFAULT_BRAND.hue,
  chroma: number = DEFAULT_BRAND.chroma,
): ThemeColors {
  const tokens = buildBrandTokens(hue, chroma);
  const color = (name: string) => `hsl(${tokens[name]})`;

  return {
    background: color('--background'),
    foreground: color('--foreground'),
    card: color('--card'),
    primary: color('--primary'),
    primaryForeground: color('--primary-foreground'),
    secondary: color('--secondary'),
    muted: color('--muted'),
    mutedForeground: color('--muted-foreground'),
    accent: color('--accent'),
    border: color('--border'),
    input: color('--input'),
    ring: color('--ring'),
    destructive: color('--destructive'),
    destructiveForeground: color('--destructive-foreground'),
  };
}
