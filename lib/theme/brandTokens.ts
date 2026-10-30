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

/**
 * The blok language v2 colour roles beyond the brand palette (vocabulary
 * `theme.status_roles` / `theme.spectrum`), exactly as orkestrator's index.css
 * defines them for `:root` (light) and `.dark`:
 *
 * - status roles `success`, `warning`, `info`, each with `-foreground` and
 *   `-soft`: fixed hues (150, 75, 240), chroma following the brand's
 *   (`--status-chroma`), and near the brand hue a lightness shift so a status
 *   never reads as the brand (`--<role>-near`: 1 at the brand's own hue, 0 at
 *   40 degrees apart). Light gets darker there, dark lighter.
 * - spectral roles `spectrum-<band>` and `spectrum-<band>-soft`: fixed hues,
 *   `--spectrum-chroma`, a per-band lightness, no near-brand shift.
 *
 * Pokket's palette is orkestrator's `.dark` one, so the app uses `dark`;
 * `light` is kept so the two stay comparable with orkestrator's.
 */
export type ColorScheme = 'light' | 'dark';

export const STATUS_ROLES = ['success', 'warning', 'info'] as const;
export type StatusRole = (typeof STATUS_ROLES)[number];

/** vocabulary `theme.spectrum.bands`: hue and lightness per scheme. */
export const SPECTRUM_BANDS = {
  violet: { hue: 300, light: 0.55, dark: 0.7 },
  blue: { hue: 260, light: 0.58, dark: 0.72 },
  cyan: { hue: 215, light: 0.68, dark: 0.8 },
  green: { hue: 145, light: 0.64, dark: 0.78 },
  yellow: { hue: 100, light: 0.8, dark: 0.88 },
  orange: { hue: 60, light: 0.7, dark: 0.8 },
  red: { hue: 27, light: 0.6, dark: 0.72 },
} as const;
export type SpectrumBand = keyof typeof SPECTRUM_BANDS;
export const SPECTRUM_BANDS_ORDER = Object.keys(SPECTRUM_BANDS) as SpectrumBand[];

type Oklch = { l: number; c: number; h: number };

type StatusSpec = {
  hue: number;
  /** [light, dark]: the role's lightness far from the brand, and its shift near it. */
  role: Record<ColorScheme, { l: number; near: number }>;
  foreground: Record<ColorScheme, { l: number; c: number; h: number }>;
  soft: Record<ColorScheme, { l: number; near: number; c: number; h: number }>;
};

const STATUS: Record<StatusRole, StatusSpec> = {
  success: {
    hue: 150,
    role: { light: { l: 0.6, near: -0.16 }, dark: { l: 0.72, near: 0.12 } },
    foreground: { light: { l: 0.985, c: 0.15, h: 150 }, dark: { l: 0.18, c: 0.4, h: 150 } },
    soft: { light: { l: 0.95, near: -0.06, c: 0.35, h: 150 }, dark: { l: 0.3, near: 0.06, c: 0.45, h: 150 } },
  },
  warning: {
    hue: 75,
    role: { light: { l: 0.7, near: -0.16 }, dark: { l: 0.8, near: 0.1 } },
    foreground: { light: { l: 0.24, c: 0.4, h: 60 }, dark: { l: 0.2, c: 0.4, h: 60 } },
    soft: { light: { l: 0.96, near: -0.06, c: 0.35, h: 85 }, dark: { l: 0.32, near: 0.06, c: 0.45, h: 75 } },
  },
  info: {
    hue: 240,
    role: { light: { l: 0.6, near: -0.16 }, dark: { l: 0.72, near: 0.12 } },
    foreground: { light: { l: 0.985, c: 0.15, h: 240 }, dark: { l: 0.18, c: 0.4, h: 240 } },
    soft: { light: { l: 0.95, near: -0.06, c: 0.35, h: 240 }, dark: { l: 0.3, near: 0.06, c: 0.45, h: 240 } },
  },
};

const clamp = (min: number, value: number, max: number) => Math.min(max, Math.max(min, value));

/** `--status-chroma: clamp(0.07, calc(var(--brand-chroma) * 1.05), 0.2)` */
export const statusChroma = (chroma: number) => clamp(0.07, chroma * 1.05, 0.2);

/** `--spectrum-chroma: clamp(0.1, calc(var(--brand-chroma) * 1.1), 0.2)` */
export const spectrumChroma = (chroma: number) => clamp(0.1, chroma * 1.1, 0.2);

/** `--<role>-near`: 1 at the brand's own hue, falling to 0 at 40 degrees apart. */
export const nearBrand = (brandHue: number, roleHue: number) =>
  Math.max(0, (Math.cos(((brandHue - roleHue) * Math.PI) / 180) - 0.766) / 0.234);

/** The status and spectral roles as OKLCh, by CSS variable name. */
export function buildRoleOklch(
  hue: number = DEFAULT_BRAND.hue,
  chroma: number = DEFAULT_BRAND.chroma,
  scheme: ColorScheme = 'dark',
): Record<string, Oklch> {
  const roles: Record<string, Oklch> = {};
  const status = statusChroma(chroma);
  for (const name of STATUS_ROLES) {
    const spec = STATUS[name];
    const near = nearBrand(hue, spec.hue);
    const role = spec.role[scheme];
    const foreground = spec.foreground[scheme];
    const soft = spec.soft[scheme];
    roles[`--${name}`] = { l: role.l + role.near * near, c: status, h: spec.hue };
    roles[`--${name}-foreground`] = { l: foreground.l, c: status * foreground.c, h: foreground.h };
    roles[`--${name}-soft`] = { l: soft.l + soft.near * near, c: status * soft.c, h: soft.h };
  }
  const spectrum = spectrumChroma(chroma);
  for (const band of SPECTRUM_BANDS_ORDER) {
    const spec = SPECTRUM_BANDS[band];
    roles[`--spectrum-${band}`] = { l: spec[scheme], c: spectrum, h: spec.hue };
    roles[`--spectrum-${band}-soft`] =
      scheme === 'light' ? { l: 0.95, c: spectrum * 0.35, h: spec.hue } : { l: 0.3, c: spectrum * 0.45, h: spec.hue };
  }
  return roles;
}

/** The status and spectral roles as `H S% L%` triplets, by CSS variable name. */
export function buildRoleTokens(
  hue: number = DEFAULT_BRAND.hue,
  chroma: number = DEFAULT_BRAND.chroma,
  scheme: ColorScheme = 'dark',
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(buildRoleOklch(hue, chroma, scheme)).map(([name, { l, c, h }]) => [name, oklchToHslTriplet(l, c, h)]),
  );
}

/**
 * Every v2 status and spectral role (`success`, `success-soft`,
 * `spectrum-green`, ...) as a complete `hsl(...)` colour, by role name: what a
 * renderer that takes a colour string (a scene's `color="spectrum-green"`, a
 * logo pen) looks a role up in.
 */
export function buildRoleColors(
  hue: number = DEFAULT_BRAND.hue,
  chroma: number = DEFAULT_BRAND.chroma,
  scheme: ColorScheme = 'dark',
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(buildRoleTokens(hue, chroma, scheme)).map(([name, triplet]) => [name.slice(2), `hsl(${triplet})`]),
  );
}

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

  return { ...tokens, ...buildRoleTokens(hue, chroma, 'dark') };
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

/**
 * What an action logo paints with (bloks `logo.tsx`), keyed by the palette
 * token a shape names. orkestrator's `.dark` `--logo-*` block (index.css):
 * three brand shades a logo can tell apart, plus the text and card colors.
 * Complete `hsl(...)` colors, since react-native-svg takes a color string.
 */
export type LogoPalette = {
  ink: string;
  muted: string;
  brand: string;
  'brand-strong': string;
  'brand-soft': string;
  surface: string;
} & Record<StatusRole | `spectrum-${SpectrumBand}`, string>;

export function buildLogoPalette(
  hue: number = DEFAULT_BRAND.hue,
  chroma: number = DEFAULT_BRAND.chroma,
): LogoPalette {
  const colors = buildThemeColors(hue, chroma);
  const shade = (l: number, c: number) => `hsl(${oklchToHslTriplet(l, c, hue)})`;
  const roles = buildRoleColors(hue, chroma, 'dark');

  return {
    // The status and spectral pens are their roles (`--logo-success: var(--success)`).
    success: roles.success,
    warning: roles.warning,
    info: roles.info,
    'spectrum-violet': roles['spectrum-violet'],
    'spectrum-blue': roles['spectrum-blue'],
    'spectrum-cyan': roles['spectrum-cyan'],
    'spectrum-green': roles['spectrum-green'],
    'spectrum-yellow': roles['spectrum-yellow'],
    'spectrum-orange': roles['spectrum-orange'],
    'spectrum-red': roles['spectrum-red'],
    ink: colors.foreground,
    muted: colors.mutedForeground,
    brand: shade(0.72, chroma),
    'brand-strong': shade(0.87, chroma * 0.75),
    'brand-soft': shade(0.42, chroma * 0.6),
    surface: colors.card,
  };
}
