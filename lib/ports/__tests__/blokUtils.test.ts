import { describe, expect, it } from '@jest/globals';

import {
  getValueAtPath,
  isRecord,
  isString,
  splitPathSegments,
} from '@arkitektio/bsx/renderer/runtime/utils';

describe("isRecord", () => {
  it("is true for plain objects and arrays, false for null/primitives", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord("x")).toBe(false);
    expect(isRecord(1)).toBe(false);
  });
});

describe("isString", () => {
  it("distinguishes strings", () => {
    expect(isString("x")).toBe(true);
    expect(isString(1)).toBe(false);
    expect(isString(null)).toBe(false);
  });
});

describe("splitPathSegments", () => {
  it("strips a leading slash and splits on both '/' and '.'", () => {
    expect(splitPathSegments("/a/b.c")).toEqual(["a", "b", "c"]);
  });

  it("filters out empty segments from doubled separators", () => {
    expect(splitPathSegments("a//b..c")).toEqual(["a", "b", "c"]);
  });

  it("returns an empty array for an empty path", () => {
    expect(splitPathSegments("")).toEqual([]);
  });
});

describe("getValueAtPath", () => {
  const model = {
    user: { name: "Ada", tags: ["x", "y"] },
    items: [{ id: 1 }, { id: 2 }],
  };

  it("returns the whole model for an empty path", () => {
    expect(getValueAtPath(model, "")).toBe(model);
  });

  it("traverses nested object properties", () => {
    expect(getValueAtPath(model, "user.name")).toBe("Ada");
  });

  it("indexes into arrays with numeric segments", () => {
    expect(getValueAtPath(model, "items.1.id")).toBe(2);
    expect(getValueAtPath(model, "user/tags/0")).toBe("x");
  });

  it("returns undefined for a non-integer array index", () => {
    expect(getValueAtPath(model, "items.foo")).toBeUndefined();
  });

  it("returns undefined when descending into a primitive", () => {
    expect(getValueAtPath(model, "user.name.nope")).toBeUndefined();
  });
});
