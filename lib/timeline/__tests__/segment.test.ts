import { describe, expect, it } from "@jest/globals";
import { clean, DEFAULT_SEGMENT_OPTIONS, Fix, guessMode, haversine, segment } from "../segment";

const MIN = 60 * 1000;
const T0 = Date.UTC(2026, 8, 29, 8, 0);

/** ~111 m per 0.001° latitude. */
const at = (minutes: number, lat: number, lon = 13.4, acc = 10): Fix => ({ ts: T0 + minutes * MIN, lat, lon, acc });

/** Walking north at ~1.4 m/s: one fix a minute, ~84 m apart. */
const walk = (fromMin: number, toMin: number, fromLat: number): Fix[] =>
  Array.from({ length: toMin - fromMin + 1 }, (_, k) => at(fromMin + k, fromLat + k * 0.00076));

describe("haversine", () => {
  it("measures a degree of latitude as ~111 km", () => {
    expect(haversine({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeGreaterThan(111_000);
    expect(haversine({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeLessThan(111_400);
  });
});

describe("clean", () => {
  it("drops inaccurate fixes and teleports", () => {
    const fixes = [at(0, 52.5), at(1, 52.5001, 13.4, 500), at(2, 53.5), at(3, 52.5002)];
    expect(clean(fixes).map((f) => f.lat)).toEqual([52.5, 52.5002]);
  });
});

describe("guessMode", () => {
  it("tells walking, cycling and driving apart", () => {
    expect(guessMode(1000, 12 * MIN)).toBe("walk");
    expect(guessMode(4000, 12 * MIN)).toBe("bike");
    expect(guessMode(20000, 15 * MIN)).toBe("vehicle");
    expect(guessMode(10, MIN)).toBe("unknown");
  });

  it("follows the configured thresholds", () => {
    const options = { walkMaxMps: 1, bikeMaxMps: 2 };
    expect(guessMode(1000, 12 * MIN, options)).toBe("bike");
    expect(guessMode(4000, 12 * MIN, options)).toBe("vehicle");
  });
});

describe("segment", () => {
  it("finds a stay, the walk, and the next stay", () => {
    const fixes = [
      // Home: jitter for an hour, sparse (a still phone reports little).
      at(0, 52.5),
      at(20, 52.50005),
      at(60, 52.49997),
      ...walk(61, 80, 52.502),
      // Office, a couple of km on.
      at(81, 52.5185),
      at(140, 52.51855),
      at(200, 52.51848),
    ];
    const { visits, trips } = segment(fixes);
    expect(visits).toHaveLength(2);
    expect(visits[0].start).toBe(T0);
    expect(visits[0].end).toBe(T0 + 60 * MIN);
    expect(visits[1].start).toBe(T0 + 81 * MIN);
    expect(trips).toHaveLength(1);
    expect(trips[0]).toMatchObject({ from: 0, to: 1, mode: "walk" });
    expect(trips[0].start).toBe(visits[0].end);
    expect(trips[0].end).toBe(visits[1].start);
  });

  it("treats one long gap between two nearby fixes as a stay", () => {
    const { visits, trips } = segment([at(0, 52.5), at(180, 52.5003)]);
    expect(visits).toHaveLength(1);
    expect(visits[0].end - visits[0].start).toBe(180 * MIN);
    expect(trips).toHaveLength(0);
  });

  it("counts a stay still in progress only when told the time", () => {
    const fixes = [...walk(0, 10, 52.5), at(11, 52.5084)];
    expect(segment(fixes).visits).toHaveLength(0);
    const { visits, trips } = segment(fixes, DEFAULT_SEGMENT_OPTIONS, T0 + 30 * MIN);
    expect(visits).toHaveLength(1);
    expect(trips).toHaveLength(1);
    expect(trips[0]).toMatchObject({ from: null, to: 0 });
  });

  it("makes one trip of fixes that never settle", () => {
    const { visits, trips } = segment(walk(0, 30, 52.5));
    expect(visits).toHaveLength(0);
    expect(trips).toHaveLength(1);
    expect(trips[0].distance).toBeGreaterThan(2000);
  });

  it("returns nothing for no fixes", () => {
    expect(segment([])).toEqual({ visits: [], trips: [] });
  });
});
