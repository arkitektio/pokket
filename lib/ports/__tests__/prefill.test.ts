import { describe, expect, it } from "@jest/globals";
import { PortKind } from "../kinds";
import { fitArgs, prefill, structureRef, withRestingValues } from "../prefill";
import type { PortablePort } from "../types";

const image: PortablePort = { key: "image", kind: PortKind.Structure, identifier: "@mikro/arraydataset" };
const sigma: PortablePort = { key: "sigma", kind: PortKind.Float };
const name: PortablePort = { key: "name", kind: PortKind.String };
const images: PortablePort = { key: "images", kind: PortKind.List, children: [image] };
const options: PortablePort = { key: "options", kind: PortKind.Model, children: [sigma, name] };

describe("fitting arguments to ports", () => {
  it("reads a structure in either spelling, with a string id", () => {
    const fitted = { image: { __identifier: "@mikro/arraydataset", object: "7" } };
    expect(fitArgs({ image: { __identifier: "@mikro/arraydataset", object: "7" } }, [image])).toEqual(fitted);
    expect(fitArgs({ image: { __identifier: "@mikro/arraydataset", object: 7 } }, [image])).toEqual(fitted);
    expect(fitArgs({ image: "7" }, [image])).toEqual(fitted);
    expect(fitArgs({ image: 7 }, [image])).toEqual(fitted);
  });
  it("drops what the action does not declare, and what no longer fits", () => {
    expect(fitArgs({ gone: 1, sigma: 2 }, [sigma])).toEqual({ sigma: 2 });
    expect(fitArgs({ name: 5, sigma: { a: 1 }, image: { nothing: true } }, [name, sigma, image])).toEqual({});
  });
  it("fits lists and models item by item", () => {
    expect(fitArgs({ images: ["1", { object: 2 }] }, [images])).toEqual({
      images: [
        { __identifier: "@mikro/arraydataset", object: "1" },
        { __identifier: "@mikro/arraydataset", object: "2" },
      ],
    });
    expect(fitArgs({ options: { sigma: 1.5, name: 3, extra: true } }, [options])).toEqual({ options: { sigma: 1.5 } });
  });
  it("makes nothing of what is not a record", () => {
    expect(fitArgs(null, [sigma])).toEqual({});
    expect(fitArgs([1], [sigma])).toEqual({});
  });
});

describe("prefill", () => {
  it("takes each port from the first source that has it", () => {
    expect(prefill([sigma, name], { sigma: 1 }, { sigma: 2, name: "b" }, { name: "c" })).toEqual({ sigma: 1, name: "b" });
  });
  it("skips sources that are missing", () => {
    expect(prefill([sigma], undefined, null, { sigma: 3 })).toEqual({ sigma: 3 });
  });
});

describe("resting values", () => {
  const flag: PortablePort = { key: "flag", kind: PortKind.Bool, nullable: false };
  it("turns an untouched required switch off", () => {
    expect(withRestingValues([flag], {})).toEqual({ flag: false });
  });
  it("leaves a value, a default and an optional switch alone", () => {
    expect(withRestingValues([flag], { flag: true })).toEqual({ flag: true });
    expect(withRestingValues([{ ...flag, default: true }], {})).toEqual({});
    expect(withRestingValues([{ ...flag, nullable: true }], {})).toEqual({});
  });
});

describe("the object a value names", () => {
  it("is read from a structure in either spelling", () => {
    const dataset = { identifier: "@mikro/arraydataset", object: 7 };
    expect(structureRef({ __identifier: "@mikro/arraydataset", object: "7" })).toEqual(dataset);
    expect(structureRef("7", image)).toEqual(dataset);
    expect(structureRef(7, image)).toEqual(dataset);
  });
  it("is nothing without an identifier or a whole-number id", () => {
    expect(structureRef("7", sigma)).toBeNull();
    expect(structureRef("7")).toBeNull();
    expect(structureRef("abc", image)).toBeNull();
    expect(structureRef({ __identifier: "@mikro/file", object: "a-b" })).toBeNull();
    expect(structureRef(null, image)).toBeNull();
  });
});
