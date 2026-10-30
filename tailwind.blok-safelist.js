/**
 * Tailwind classes a blok's `className` can use.
 *
 * Nativewind compiles classes at build time, from the classes it finds in
 * `content`. A blok's `className` arrives from the server at runtime, so a
 * class no pokket source happens to use would be silently dropped. This
 * list compiles the vocabulary blok authors reach for regardless.
 *
 * Only utilities React Native can draw are listed: no `grid-cols-*`,
 * `space-*`, `hover:` or breakpoints. A blok's typed props (`padding`,
 * `gap`, `tone`, …) remain the portable way to style it.
 *
 * Test: components/blok/__tests__/tailwindSafelist.test.ts
 */

const SPACING =
  "0|px|0\\.5|1|1\\.5|2|2\\.5|3|3\\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96";
const FRACTIONS = "1/2|1/3|2/3|1/4|2/4|3/4|1/5|2/5|3/5|4/5";
const SIZES = "xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl";

/** The app's own colours: they follow the brand colour and the theme. */
const THEME_COLORS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  // Blok language v2 status and spectral roles (vocabulary `theme`).
  ...["success", "warning", "info"].flatMap((role) => [role, `${role}-foreground`, `${role}-soft`]),
  ...["violet", "blue", "cyan", "green", "yellow", "orange", "red"].flatMap((band) => [
    `spectrum-${band}`,
    `spectrum-${band}-soft`,
  ]),
  "white",
  "black",
];

const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const SHADES = "50|100|200|300|400|500|600|700|800|900|950";
/** Palette hues are solid at every shade; tinted washes take the 500 shade. */
const TINT_OPACITIES = [10, 20, 30, 50];

const OPACITIES = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90];
const COLOR_UTILITIES = ["bg", "text", "border"];

const withOpacities = (classes) =>
  classes.flatMap((name) => [name, ...OPACITIES.map((opacity) => `${name}/${opacity}`)]);

module.exports = [
  // Layout
  {
    pattern: new RegExp(
      `^-?(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|top|right|bottom|left|inset|inset-x|inset-y)-(${SPACING})$`,
    ),
  },
  { pattern: /^(m|mx|my|mt|mr|mb|ml|inset|top|right|bottom|left)-auto$/ },
  {
    pattern: new RegExp(
      `^(w|h|size|min-w|min-h|max-h|basis)-(${SPACING}|${FRACTIONS}|auto|full|0)$`,
    ),
  },
  { pattern: new RegExp(`^max-w-(${SIZES}|full|none)$`) },
  {
    pattern:
      /^(flex|flex-(row|col|row-reverse|col-reverse|wrap|wrap-reverse|nowrap|1|auto|initial|none)|grow|grow-0|shrink|shrink-0|hidden|relative|absolute|overflow-(hidden|visible|scroll))$/,
  },
  { pattern: /^(items|self)-(start|end|center|baseline|stretch|auto)$/ },
  { pattern: /^justify-(start|end|center|between|around|evenly)$/ },
  { pattern: /^content-(start|end|center|between|around|stretch)$/ },
  { pattern: /^(z-(0|10|20|30|40|50)|opacity-(0|5|10|20|25|30|40|50|60|70|75|80|90|95|100))$/ },
  { pattern: /^aspect-(square|video)$/ },

  // Typography
  { pattern: new RegExp(`^text-(${SIZES}|base|8xl|9xl)$`) },
  { pattern: /^text-(left|center|right|justify)$/ },
  { pattern: /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black|mono|sans|serif)$/ },
  { pattern: /^leading-(none|tight|snug|normal|relaxed|loose|3|4|5|6|7|8|9|10)$/ },
  { pattern: /^tracking-(tighter|tight|normal|wide|wider|widest)$/ },
  {
    pattern:
      /^(italic|not-italic|underline|line-through|no-underline|uppercase|lowercase|capitalize|normal-case|line-clamp-(1|2|3|4|5|6))$/,
  },

  // Borders and surfaces
  { pattern: /^border(-(t|r|b|l|x|y))?(-(0|2|4|8))?$/ },
  { pattern: /^border-(solid|dashed|dotted|hairline)$/ },
  { pattern: /^rounded(-(t|r|b|l|tl|tr|br|bl))?(-(none|sm|md|lg|xl|2xl|3xl|full))?$/ },
  { pattern: /^shadow(-(sm|md|lg|xl|2xl|none))?$/ },

  // Colours: the theme's with opacity, the palette solid at every shade…
  ...withOpacities(
    COLOR_UTILITIES.flatMap((utility) => [
      ...THEME_COLORS.map((color) => `${utility}-${color}`),
    ]),
  ),
  ...COLOR_UTILITIES.map((utility) => `${utility}-transparent`),
  { pattern: new RegExp(`^(bg|text|border)-(${PALETTE})-(${SHADES})$`) },
  // …and tinted washes, `bg-sky-500/10` with `border-sky-500/30`.
  ...["bg", "border"].flatMap((utility) =>
    PALETTE.split("|").flatMap((hue) =>
      TINT_OPACITIES.map((opacity) => `${utility}-${hue}-500/${opacity}`),
    ),
  ),

  // The language's two data attributes (`data-busy`, `data-stale`, set by
  // every component through its `dataSet`): `data-[busy]:opacity-60`. Only
  // opacity: React Native draws no `grayscale` filter.
  ...["busy", "stale"].flatMap((attribute) =>
    ["0", "20", "25", "30", "40", "50", "60", "70", "75", "80", "90"].map(
      (opacity) => `data-[${attribute}]:opacity-${opacity}`,
    ),
  ),
];
