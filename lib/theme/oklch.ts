/**
 * OKLCh -> HSL triplet, for feeding NativeWind CSS variables.
 *
 * The whole palette is derived from a brand hue/chroma pair in OKLCh, the way
 * orkestrator-next does it. Orkestrator can write `oklch(L C var(--brand-hue))`
 * straight into its stylesheet and let the browser resolve it; we cannot.
 * react-native-css-interop rejects `oklch` outright (`Invalid color unit`, see
 * css-to-rn/parseDeclaration.js), as it does `oklab`/`lab`/`lch`/`hwb`, and
 * React Native's own color parser only knows hex/rgb/hsl/hwb/named. So the
 * conversion happens here, in JS, and the result is injected through `vars()`.
 *
 * The output is a bare `H S% L%` triplet rather than a color, because
 * tailwind.config.js consumes every token as `hsl(var(--x))`. Emitting hex
 * would produce `hsl(#2dbfa0)` — not an error, just a color that never renders.
 */

export type Rgb = { r: number; g: number; b: number };

/** OKLCh -> sRGB, clamped into gamut. Ported from orkestrator-next's
 * `oklchToHex` (rekuest/components/spaces/task/elements/brandColors.ts). */
export function oklchToRgb(L: number, C: number, H: number): Rgb {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLin = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const toGamma = (x: number) => {
    const c = Math.max(0, Math.min(1, x));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };

  return { r: toGamma(rLin), g: toGamma(gLin), b: toGamma(bLin) };
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** sRGB (0..1 per channel) -> `"H S% L%"`. */
export function rgbToHslTriplet({ r, g, b }: Rgb): string {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

  return `${round(h)} ${round(s * 100)}% ${round(l * 100)}%`;
}

export function oklchToHslTriplet(L: number, C: number, H: number): string {
  return rgbToHslTriplet(oklchToRgb(L, C, H));
}

/** Inverse of `oklchToHslTriplet`, for tests only. Nothing at runtime needs it,
 * but it is the only way to check the forward conversion without restating it. */
export function hslTripletToOklch(triplet: string): { L: number; C: number; H: number } {
  const [hRaw, sRaw, lRaw] = triplet.trim().split(/\s+/);
  const h = ((parseFloat(hRaw) % 360) + 360) % 360;
  const s = parseFloat(sRaw) / 100;
  const l = parseFloat(lRaw) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  const toLin = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const [r, g, b] = rgb.map((v) => toLin(v + m));

  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;

  return { L, C: Math.hypot(A, B), H };
}
