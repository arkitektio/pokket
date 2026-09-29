import { describe, expect, it } from "@jest/globals";
import { DEFAULT_SEGMENT_OPTIONS } from "../segment";
import { defaultTimelineSettings, parseTimelineSettings, presetOf, PRESETS, segmentOptionsOf } from "../settings";

describe("timeline settings", () => {
  it("defaults to the balanced preset", () => {
    expect(presetOf(defaultTimelineSettings())).toBe("balanced");
  });

  it("recognises each preset, and custom values as none", () => {
    for (const key of Object.keys(PRESETS) as (keyof typeof PRESETS)[]) {
      expect(presetOf({ ...defaultTimelineSettings(), ...PRESETS[key].values })).toBe(key);
    }
    expect(presetOf({ ...defaultTimelineSettings(), distanceIntervalM: 42 })).toBeNull();
  });

  it("keeps good values and replaces bad ones with their defaults", () => {
    const parsed = parseTimelineSettings(
      JSON.stringify({ enabled: true, stayRadiusM: 200, minStayMin: -3, accuracy: "warp", preset: "saver" }),
    );
    expect(parsed.enabled).toBe(true);
    expect(parsed.stayRadiusM).toBe(200);
    expect(parsed.minStayMin).toBe(defaultTimelineSettings().minStayMin);
    expect(parsed.accuracy).toBe("balanced");
  });

  it("falls back to the defaults for unreadable storage", () => {
    expect(parseTimelineSettings("{not json")).toEqual(defaultTimelineSettings());
  });

  it("maps the defaults to (about) the segmenter's own", () => {
    const options = segmentOptionsOf(defaultTimelineSettings());
    for (const key of Object.keys(DEFAULT_SEGMENT_OPTIONS) as (keyof typeof options)[]) {
      expect(options[key]).toBeCloseTo(DEFAULT_SEGMENT_OPTIONS[key], -1);
    }
  });

  it("never lets cycling top out below walking", () => {
    const options = segmentOptionsOf({ ...defaultTimelineSettings(), walkMaxKmh: 12, bikeMaxKmh: 5 });
    expect(options.bikeMaxMps).toBeGreaterThanOrEqual(options.walkMaxMps);
  });
});
