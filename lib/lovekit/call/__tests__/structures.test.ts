import { describe, expect, it } from "@jest/globals";
import { callRoute, callTitle } from "../links";
import { currentTopic, toStructureInput, toStructureInputs } from "../structureInput";
import { objectForRoute, structureForRoute, structureKindName, structureLabel, structureRoute } from "../structures";

describe("the object a page shows", () => {
  it("is found for any page of a known kind, callable or not", () => {
    expect(objectForRoute("/mikro/arraydatasets/7")).toEqual({ identifier: "@mikro/arraydataset", object: 7 });
    expect(objectForRoute("/calls/5")).toEqual({ identifier: "@lovekit/call", object: 5 });
    expect(structureForRoute("/calls/5")).toBeNull();
  });
  it("is nothing for a list, a page without a whole-number id, or an unknown page", () => {
    expect(objectForRoute("/mikro/arraydatasets")).toBeNull();
    expect(objectForRoute("/tasks/abc")).toBeNull();
    expect(objectForRoute("/settings")).toBeNull();
  });
  it("is named by its kind", () => {
    expect(structureKindName("@mikro/arraydataset")).toBe("Dataset");
    expect(structureKindName("@kraph/entity")).toBe("entity");
  });
});

describe("call structures", () => {
  it("names and links the objects pokket has a page for", () => {
    expect(structureLabel({ identifier: "@rekuest/task", object: 42 })).toBe("Task 42");
    expect(structureRoute({ identifier: "@rekuest/task", object: 42 })).toBe("/tasks/42");
    expect(structureRoute({ identifier: "@lovekit/call", object: 3 })).toBe("/calls/3");
  });

  it("names what it does not know by its identifier, and links nowhere", () => {
    expect(structureLabel({ identifier: "@mikro/image", object: 7 })).toBe("image 7");
    expect(structureRoute({ identifier: "@mikro/image", object: 7 })).toBeNull();
  });

  it("finds the object a page shows", () => {
    expect(structureForRoute("/bank/transaction/12")).toEqual({
      identifier: "@bank/transaction",
      object: 12,
      label: "Transaction 12",
    });
    expect(structureForRoute("/mail/thread/5")?.identifier).toBe("@kuvert/thread");
  });

  it("offers no call about a list, a page without a whole-number id, or a call", () => {
    expect(structureForRoute("/tasks")).toBeNull();
    expect(structureForRoute("/solo-broadcast/start")).toBeNull();
    expect(structureForRoute("/tasks/abc-1")).toBeNull();
    expect(structureForRoute("/tasks/4/logs")).toBeNull();
    expect(structureForRoute("/calls/4")).toBeNull();
  });
});

describe("structure input", () => {
  it("takes whole-number ids only", () => {
    expect(toStructureInput({ identifier: "@rekuest/task", id: "42" })).toEqual({ identifier: "@rekuest/task", object: 42 });
    expect(toStructureInput({ identifier: "@rekuest/task", id: "a1" })).toBeNull();
    expect(toStructureInput({ identifier: "@rekuest/task", id: "" })).toBeNull();
    expect(toStructureInputs([{ identifier: "a", id: 1 }, { identifier: "b", id: null }])).toHaveLength(1);
  });

  it("reads the last thing a call took on as its topic", () => {
    expect(currentTopic({ about: [1, 2, 3] })).toBe(3);
    expect(currentTopic({ about: [] })).toBeUndefined();
  });
});

describe("call links", () => {
  it("builds the call page, joining on arrival when asked", () => {
    expect(callRoute("5")).toBe("/calls/5");
    expect(callRoute("5", { join: true })).toBe("/calls/5?join=1");
  });

  it("titles a call nobody named", () => {
    expect(callTitle([{ identifier: "@rekuest/task", label: "Task 42" }])).toBe("Call about Task 42");
    expect(callTitle([{ identifier: "@rekuest/task" }])).toBe("Call about task");
    expect(callTitle([{ identifier: "a" }, { identifier: "b" }])).toBe("Call about 2 objects");
  });
});
