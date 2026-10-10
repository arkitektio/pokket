import { describe, expect, it } from "@jest/globals";
import { PortKind } from "../kinds";
import { blockingPorts, effectiveWidget, isEditablePort, unsupportedReason } from "../supported";
import type { FormPort } from "../types";

const port = (over: Partial<FormPort>): FormPort => ({ key: "p", kind: PortKind.String, nullable: false, ...over });

describe("what pokket can edit", () => {
  it("covers the everyday kinds", () => {
    for (const kind of [PortKind.String, PortKind.Int, PortKind.Float, PortKind.Bool, PortKind.Enum, PortKind.Date, PortKind.Structure, PortKind.Model]) {
      expect(isEditablePort(port({ kind }))).toBe(true);
    }
  });
  it("leaves the rest to orkestrator", () => {
    for (const kind of [PortKind.Dict, PortKind.Union, PortKind.Quantity, PortKind.MemoryStructure, PortKind.Interface, "SOMETHING_NEW"]) {
      expect(isEditablePort(port({ kind }))).toBe(false);
    }
  });
  it("edits a list when it can edit what is in it", () => {
    expect(isEditablePort(port({ kind: PortKind.List, children: [port({ kind: PortKind.Int })] }))).toBe(true);
    expect(isEditablePort(port({ kind: PortKind.List, children: [port({ kind: PortKind.Union })] }))).toBe(false);
    expect(isEditablePort(port({ kind: PortKind.List, children: [] }))).toBe(false);
  });
  it("cannot draw a widget that reads an agent's state", () => {
    const stateChoice = port({ widget: { __typename: "StateChoiceAssignWidget" } });
    expect(isEditablePort(stateChoice)).toBe(false);
    expect(unsupportedReason(stateChoice)).toContain("live state");
  });
  it("draws a custom widget by its fallback", () => {
    const slider = { __typename: "SliderAssignWidget", min: 0, max: 1 };
    expect(effectiveWidget(port({ widget: { __typename: "CustomAssignWidget", fallback: slider } }))).toBe(slider);
    expect(effectiveWidget(port({ widget: { __typename: "CustomAssignWidget" } }))).toBeNull();
    expect(isEditablePort(port({ widget: { __typename: "CustomAssignWidget", fallback: { __typename: "ProxyWidget" } } }))).toBe(false);
  });
  it("says what the port is", () => {
    expect(unsupportedReason(port({ kind: PortKind.Union }))).toBe("It is one of several kinds.");
    expect(unsupportedReason(port({ kind: "SOMETHING_NEW" }))).toContain("something_new");
  });
});

describe("what stops a form", () => {
  const union = port({ key: "u", kind: PortKind.Union });
  it("is a required port pokket cannot edit and that has no value", () => {
    expect(blockingPorts([union], {})).toEqual([union]);
    expect(blockingPorts([union], { u: null })).toEqual([union]);
  });
  it("is not one that is optional, or already has a value", () => {
    expect(blockingPorts([{ ...union, nullable: true }], {})).toEqual([]);
    expect(blockingPorts([union], { u: { __use: "0", __value: 3 } })).toEqual([]);
  });
  it("is never a port pokket can edit: validation speaks for those", () => {
    expect(blockingPorts([port({ key: "s" })], {})).toEqual([]);
  });
  it("is found inside a model", () => {
    const model = port({ key: "m", kind: PortKind.Model, children: [union, port({ key: "s" })] });
    expect(blockingPorts([model], { m: { s: "x" } })).toEqual([union]);
    expect(blockingPorts([model], { m: { u: 1 } })).toEqual([]);
    expect(blockingPorts([{ ...model, nullable: true }], {})).toEqual([]);
  });
});
