import { describe, expect, it } from "@jest/globals";
import { asVariable, declaredVariables, onlyDeclared, toOptions } from "../search";

const QUERY = `query Search($search: String, $values: [ID!], $arg0: ID) {
  options: things(filters: { search: $search, ids: $values, parent: $arg0 }) { value: id label: name }
}`;

describe("a search widget's query", () => {
  it("says which variables it takes", () => {
    expect(declaredVariables(QUERY)).toEqual({ search: "String", values: "ID", arg0: "ID" });
    expect(declaredVariables("not graphql")).toEqual({});
  });
  it("is sent only those, and none that are unset", () => {
    expect(onlyDeclared(QUERY, { search: "a", values: undefined, limit: 25, arg0: "3" })).toEqual({ search: "a", arg0: "3" });
  });
});

describe("its answer", () => {
  it("becomes options with string values", () => {
    expect(toOptions({ options: [{ value: 3, label: "Three", description: "d" }, { value: "4" }, null, { label: "no value" }] })).toEqual([
      { value: "3", label: "Three", description: "d" },
      { value: "4", label: "4", description: null },
    ]);
  });
  it("is nothing when the query was not aliased to options", () => {
    expect(toOptions({ things: [] })).toEqual([]);
    expect(toOptions(null)).toEqual([]);
  });
});

describe("a form value as a variable", () => {
  const folder = { __identifier: "@mikro/folder", object: "9" };
  it("is a structure's id where the query takes an id", () => {
    expect(asVariable(folder, "ID")).toBe("9");
    expect(onlyDeclared(QUERY, { arg0: folder })).toEqual({ arg0: "9" });
  });
  it("is the structure itself where the query takes one", () => {
    expect(asVariable(folder, "StructureInput")).toBe(folder);
  });
  it("is anything else as it is", () => {
    expect(asVariable("x", "ID")).toBe("x");
    expect(asVariable(null, "ID")).toBeNull();
  });
});
