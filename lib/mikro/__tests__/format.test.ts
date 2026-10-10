import { describe, expect, it } from "@jest/globals";
import type { LensKind, ListLensFragment } from "../api/graphql";
import {
  bytesLabel,
  extensionOf,
  humanize,
  lensDetail,
  lensSnapshot,
  lensTitle,
  shapeLabel,
  sliceLabel,
  specLabel,
  windowLabel,
} from "../format";
import { grantExpiresAt, signingWindow } from "../media/window";

const snapshot = (id: string) => ({ id, name: id, createdAt: "", store: { id, key: `${id}.png`, bucket: "media" } });

const arrayLens = (over: Partial<Extract<ListLensFragment, { __typename: "ArrayLens" }>> = {}): ListLensFragment => ({
  __typename: "ArrayLens",
  id: "1",
  name: null,
  kind: "ARRAY" as LensKind,
  createdAt: "",
  coordinateSystem: { id: "1", name: "s" },
  defaultScene: null,
  shape: [3, 10],
  axisNames: ["c", "z"],
  slices: [{ axis: "z", start: 4, stop: 10, step: null }],
  dataset: { id: "9", name: "Embryo", axisNames: ["c", "z"], shape: [3, 40] },
  latestSnapshot: null,
  ...over,
} as ListLensFragment);

describe("labels", () => {
  it("humanizes enum values", () => {
    expect(humanize("COORDINATE_FIELD")).toBe("Coordinate field");
    expect(humanize(null)).toBe("");
  });
  it("names at most two specs", () => {
    expect(specLabel(["IMAGE", "MULTICHANNEL", "FLIM"])).toBe("Image · Multichannel");
  });
  it("pairs sizes with axis names when they match", () => {
    expect(shapeLabel([3, 2048, 2048], ["c", "y", "x"])).toBe("c 3 × y 2048 × x 2048");
    expect(shapeLabel([3, 2048], ["c"])).toBe("3 × 2048");
    expect(shapeLabel([])).toBe("");
  });
  it("writes sizes in decimal units", () => {
    expect(bytesLabel(0)).toBe("0 B");
    expect(bytesLabel(999)).toBe("999 B");
    expect(bytesLabel(1500)).toBe("1.5 kB");
    expect(bytesLabel(250_000_000)).toBe("250 MB");
    expect(bytesLabel(null)).toBe("");
  });
  it("writes slices and windows", () => {
    expect(sliceLabel({ axis: "z", start: 4, stop: 10, step: 1 })).toBe("z 4:10");
    expect(sliceLabel({ axis: "t", start: null, stop: null, step: 2 })).toBe("t ::2");
    expect(windowLabel({ axis: "x", min: 0, max: null })).toBe("x 0 – ∞");
  });
  it("finds a file's extension", () => {
    expect(extensionOf("stack.ome.TIFF")).toBe("tiff");
    expect(extensionOf("README")).toBe("");
  });
});

describe("lenses", () => {
  it("are known by what they select over when unnamed", () => {
    expect(lensTitle(arrayLens())).toBe("Embryo");
    expect(lensDetail(arrayLens())).toBe("Array · z 4:10");
  });
  it("say their subject when they have a name of their own", () => {
    const lens = arrayLens({ name: "Nucleus" });
    expect(lensTitle(lens)).toBe("Nucleus");
    expect(lensDetail(lens)).toBe("Array · Embryo · z 4:10");
  });
  it("show their own picture before their default scene's", () => {
    const scene = { id: "2", name: "s", latestSnapshot: snapshot("scene") };
    expect(lensSnapshot(arrayLens())).toBeNull();
    expect(lensSnapshot(arrayLens({ defaultScene: scene }))?.id).toBe("scene");
    expect(lensSnapshot(arrayLens({ defaultScene: scene, latestSnapshot: snapshot("own") }))?.id).toBe("own");
  });
});

describe("signing window", () => {
  const hour = 3_600_000;
  it("starts at the hour and ends with the grant", () => {
    const now = 10 * hour + 1234;
    const { at, expiresSeconds } = signingWindow(now, now + 600_000);
    expect(at.getTime()).toBe(10 * hour);
    expect(expiresSeconds).toBe(601);
  });
  it("never exceeds a week", () => {
    expect(signingWindow(0, 30 * 24 * hour).expiresSeconds).toBe(7 * 24 * 3600);
  });
  it("gives a grant without an expiry the hour and the next", () => {
    expect(grantExpiresAt(900, 1000)).toBe(901_000);
    expect(grantExpiresAt(null, 10 * hour + 5)).toBe(12 * hour);
  });
});
