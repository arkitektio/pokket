import {describe, expect, it} from '@jest/globals';
import {
  buildBrandTokens,
  buildLogoPalette,
  buildRoleOklch,
  buildRoleTokens,
  DEFAULT_BRAND,
  nearBrand,
  SPECTRUM_BANDS_ORDER,
  STATUS_ROLES,
  type ColorScheme,
} from '../brandTokens';
import vocabulary from '@arkitektio/bsx/spec/vocabulary.json';

const ROLES = [
  ...STATUS_ROLES.flatMap(role => [role, `${role}-foreground`, `${role}-soft`]),
  ...SPECTRUM_BANDS_ORDER.flatMap(band => [`spectrum-${band}`, `spectrum-${band}-soft`]),
];

describe('blok v2 colour roles', () => {
  it('are the vocabulary roles beyond the brand palette', () => {
    const declared = vocabulary.theme.colour_roles.filter(
      role => vocabulary.theme.status_roles.some(status => role.startsWith(status)) || role.startsWith('spectrum-'),
    );
    expect([...ROLES].sort()).toEqual([...declared].sort());
  });

  it.each<ColorScheme>(['light', 'dark'])('every role has a colour in %s', scheme => {
    const tokens = buildRoleTokens(DEFAULT_BRAND.hue, DEFAULT_BRAND.chroma, scheme);
    for (const role of ROLES) expect(tokens[`--${role}`]).toMatch(/^[\d.]+ [\d.]+% [\d.]+%$/);
  });

  it('takes the spectral lightness per band from the vocabulary', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const roles = buildRoleOklch(DEFAULT_BRAND.hue, DEFAULT_BRAND.chroma, scheme);
      for (const [band, spec] of Object.entries(vocabulary.theme.spectrum.bands)) {
        expect(roles[`--spectrum-${band}`]).toMatchObject({l: spec[scheme], h: spec.hue});
      }
    }
  });

  it('moves a status away from the brand in lightness when their hues meet', () => {
    expect(nearBrand(150, 150)).toBeCloseTo(1);
    expect(nearBrand(200, 150)).toBe(0);
    const near = buildRoleOklch(150, 0.15, 'dark')['--success'];
    const far = buildRoleOklch(300, 0.15, 'dark')['--success'];
    expect(near.l).toBeCloseTo(0.84);
    expect(far.l).toBeCloseTo(0.72);
    // Spectral roles never shift.
    expect(buildRoleOklch(145, 0.15, 'dark')['--spectrum-green'].l).toBe(0.78);
  });

  it('clamps the status and spectral chroma', () => {
    expect(buildRoleOklch(0, 0, 'dark')['--success'].c).toBeCloseTo(0.07);
    expect(buildRoleOklch(0, 0, 'dark')['--spectrum-red'].c).toBeCloseTo(0.1);
    expect(buildRoleOklch(0, 1, 'dark')['--spectrum-red'].c).toBeCloseTo(0.2);
  });

  it('are part of the app tokens and the logo pens', () => {
    const tokens = buildBrandTokens();
    for (const role of ROLES) {
      expect(tokens[`--${role}`]).toBeDefined();
    }
    const pens = buildLogoPalette();
    expect(pens.success).toMatch(/^hsl\(/);
    expect(pens['spectrum-red']).toMatch(/^hsl\(/);
  });
});
