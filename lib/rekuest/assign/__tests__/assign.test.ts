import { describe, expect, it } from "@jest/globals";
import { argsFor, parseRemembered, withRemembered } from "../rememberedArgs";
import { actionRoute, objectArgs, parseOn, runOrAsk } from "../runOrAsk";

const dataset = { identifier: "@mikro/arraydataset", object: 7 };
const image = { key: "image", kind: "STRUCTURE", identifier: "@mikro/arraydataset" };
const sigma = { key: "sigma", kind: "FLOAT" };

describe("running an action on an object", () => {
  it("puts the object in the first argument, id as a string", () => {
    expect(objectArgs([image, sigma], dataset)).toEqual({ image: { __identifier: "@mikro/arraydataset", object: "7" } });
  });
  it("runs at once when the object is all it takes", () => {
    expect(runOrAsk([image], dataset)).toEqual({ kind: "run", args: { image: { __identifier: "@mikro/arraydataset", object: "7" } } });
  });
  it("asks for the rest, with the object filled in and out of sight", () => {
    expect(runOrAsk([image, sigma], dataset)).toMatchObject({ kind: "ask", hidden: ["image"] });
  });
  it("does not fit an action whose first argument is something else", () => {
    expect(runOrAsk([sigma, image], dataset)).toEqual({ kind: "unfit" });
    expect(runOrAsk([{ ...image, identifier: "@mikro/file" }], dataset)).toEqual({ kind: "unfit" });
    expect(runOrAsk([], dataset)).toEqual({ kind: "unfit" });
  });
});

describe("an action's route", () => {
  it("carries the object it is started on", () => {
    const route = actionRoute("3", { on: dataset });
    expect(route).toBe("/actions/3?on=%40mikro%2Farraydataset%3A7");
    expect(parseOn(decodeURIComponent(route.split("on=")[1]))).toEqual({ identifier: "@mikro/arraydataset", object: "7" });
  });
  it("carries the task to run again", () => {
    expect(actionRoute("3", { task: "99" })).toBe("/actions/3?task=99");
    expect(actionRoute("3")).toBe("/actions/3");
  });
  it("reads nothing from a malformed object", () => {
    expect(parseOn("")).toBeNull();
    expect(parseOn("noseparator")).toBeNull();
    expect(parseOn("@mikro/file:")).toBeNull();
    expect(parseOn(":7")).toBeNull();
  });
  it("keeps a colon inside the id", () => {
    expect(parseOn("@x/y:a:b")).toEqual({ identifier: "@x/y", object: "a:b" });
  });
});

describe("remembered arguments", () => {
  it("keep the latest per action", () => {
    const all = withRemembered(withRemembered([], "1", { a: 1 }), "1", { a: 2 });
    expect(all).toEqual([["1", { a: 2 }]]);
    expect(argsFor(all, "1")).toEqual({ a: 2 });
    expect(argsFor(all, "2")).toBeNull();
    expect(argsFor(null, "1")).toBeNull();
  });
  it("let go of the actions used longest ago, whatever their ids", () => {
    let all = withRemembered([], "900", { first: true });
    for (let i = 0; i < 99; i++) all = withRemembered(all, String(i), { i });
    all = withRemembered(all, "900", { again: true });
    all = withRemembered(all, "500", {});
    expect(all).toHaveLength(100);
    expect(argsFor(all, "0")).toBeNull();
    expect(argsFor(all, "900")).toEqual({ again: true });
  });
  it("read nothing from what is not a list of argument records", () => {
    expect(parseRemembered(null)).toEqual([]);
    expect(parseRemembered("x")).toEqual([]);
    expect(parseRemembered('{"1":{"a":1}}')).toEqual([]);
    expect(parseRemembered('[["1",{"a":1}],["2","no"],[3,{}],["4",[1]]]')).toEqual([["1", { a: 1 }]]);
  });
});
