import {describe, expect, it} from '@jest/globals';
import {z} from "zod";

import {createBlokComponent} from '@arkitektio/bsx/renderer/runtime/components';
import {createBlokCatalog} from '@arkitektio/bsx/renderer/runtime/functions';
import {preflightBlokDocument} from '@arkitektio/bsx/renderer/runtime/preflight';
import {BlokPropSchemas} from '@arkitektio/bsx/renderer/runtime/schemas';

const Box = createBlokComponent(
  {
    name: "Box",
    schema: z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      onClick: BlokPropSchemas.Action.optional(),
      children: BlokPropSchemas.ChildList,
    }),
  },
  () => null,
);

const catalog = createBlokCatalog("test-catalog", [Box]);

const preflight = (roots: unknown[]) => preflightBlokDocument(roots, catalog);

const validNode = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  component: "Box",
  props: [{key: "title", static_value: "hello"}],
  ...extra,
});

describe("preflightBlokDocument", () => {
  it("accepts a valid tree and registers every node by id", () => {
    const result = preflight([validNode("root", {children: [validNode("child")]})]);

    expect(result.errors).toEqual([]);
    expect(result.rootIds).toEqual(["root"]);
    expect([...result.nodes.keys()].sort()).toEqual(["child", "root"]);
  });

  it("reports an unknown component", () => {
    const result = preflight([{id: "a", component: "Nope"}]);

    expect(result.errors[0].message).toContain('Unknown component "Nope"');
    expect(result.invalidNodes.has("a")).toBe(true);
  });

  it("reports an unknown prop", () => {
    const result = preflight([
      {id: "a", component: "Box", props: [{key: "title", static_value: "x"}, {key: "bogus"}]},
    ]);

    expect(result.errors[0].message).toContain('Unknown prop "bogus"');
  });

  it("reports a missing required prop", () => {
    const result = preflight([{id: "a", component: "Box"}]);

    expect(result.errors[0].message).toContain('Missing required prop "title"');
  });

  it("does not require `children` when the node declares children", () => {
    const result = preflight([validNode("root", {children: [validNode("child")]})]);
    expect(result.errors).toEqual([]);
  });

  it("reports a duplicate id and keeps the first node", () => {
    const result = preflight([
      validNode("root", {children: [validNode("dupe"), validNode("dupe")]}),
    ]);

    expect(result.errors.some(error => error.message.includes("Duplicate component id"))).toBe(
      true,
    );
    expect(result.nodes.get("dupe")?.id).toBe("dupe");
  });

  it("keeps valid siblings renderable when one node is invalid", () => {
    const result = preflight([
      validNode("root", {children: [validNode("good"), {id: "bad", component: "Nope"}]}),
    ]);

    expect(result.nodes.has("root")).toBe(true);
    expect(result.nodes.has("good")).toBe(true);
    expect(result.nodes.has("bad")).toBe(false);
    expect(result.invalidNodes.has("bad")).toBe(true);
  });

  it("accepts the `{uiComponents: [...]}` envelope shape", () => {
    const result = preflightBlokDocument({uiComponents: [validNode("root")]}, catalog);
    expect(result.rootIds).toEqual(["root"]);
  });

  it("reports an unparseable root as a document-level error", () => {
    const result = preflight([{component: "Box"}]);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].componentId).toBeUndefined();
  });
});

describe("preflightBlokDocument for a v2 blok", () => {
  const box = (props: unknown[]) => ({id: "box", component: "Box", props: [{key: "title", static_value: "t"}, ...props]});

  it("knows the vocabulary's functions, not the catalog's", () => {
    expect(preflight([box([{key: "subtitle", util_call: {operation: "str.upper", arguments: [{key: "value", value_literal: "x"}]}}])]).nodes.has("box")).toBe(true);
    const unknown = preflight([box([{key: "subtitle", util_call: {operation: "double", arguments: []}}])]);
    expect(unknown.invalidNodes.get("box")?.[0]).toContain("not a function of the blok language");
  });

  it("allows an effect only as a callback's one thing", () => {
    const copy = {operation: "ui.copy", arguments: [{key: "text", value_literal: "x"}]};
    expect(preflight([box([{key: "onClick", util_call: copy}])]).nodes.has("box")).toBe(true);
    expect(preflight([box([{key: "subtitle", util_call: copy}])]).invalidNodes.has("box")).toBe(true);
  });

  it("lets when guard any component", () => {
    expect(preflight([box([{key: "when", dynamic_value: {path: "flag"}}])]).nodes.has("box")).toBe(true);
  });

  it("refuses a call kind it does not know, a reserved service_call above all", () => {
    const result = preflight([box([{key: "onClick", service_call: {mutation: "drop"}}])]);
    expect(result.invalidNodes.get("box")?.[0]).toContain("service_call");
  });
});
