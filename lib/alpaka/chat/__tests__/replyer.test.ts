import { describe, expect, it } from "@jest/globals";
import { chooseReplyer, messageKey, missingArgs, NO_REPLYER, Replyer, replyerArgs, replyerBlocker } from "../replyer";

const message = { key: "message", kind: "STRUCTURE", identifier: "@alpaka/message", nullable: false };
const model = { key: "model", kind: "STRUCTURE", identifier: "@alpaka/llmmodel", nullable: false };
const temperature = { key: "temperature", kind: "FLOAT", nullable: false, default: 0.7 };
const system = { key: "system", kind: "STRING", nullable: true };

const replyer = (over: Partial<Replyer> = {}): Replyer => ({
  id: "1",
  name: "Reply",
  args: [message, model, temperature, system],
  latestTask: null,
  ...over,
});

describe("a replyer", () => {
  it("takes the message in its message argument", () => {
    expect(messageKey(replyer())).toBe("message");
    expect(messageKey(replyer({ args: [model] }))).toBeNull();
  });

  it("cannot run without an argument nothing supplies", () => {
    expect(missingArgs(replyer())).toEqual(["model"]);
    expect(replyerBlocker(replyer())).toContain("model");
  });

  it("runs once its last run supplies what it needs", () => {
    const ran = replyer({ latestTask: { args: { model: { object: 3 }, message: { object: "old" } } } });
    expect(replyerBlocker(ran)).toBeNull();
    expect(replyerArgs(ran, "42")).toEqual({
      model: { object: 3 },
      message: { __identifier: "@alpaka/message", object: "42" },
    });
  });

  it("runs with only a message when that is all it needs", () => {
    const simple = replyer({ args: [message, temperature, system] });
    expect(replyerBlocker(simple)).toBeNull();
    expect(replyerArgs(simple, "7")).toEqual({ message: { __identifier: "@alpaka/message", object: "7" } });
  });

  it("drops arguments of its last run that it no longer declares", () => {
    const changed = replyer({ args: [message], latestTask: { args: { gone: 1 } } });
    expect(replyerArgs(changed, "7")).toEqual({ message: { __identifier: "@alpaka/message", object: "7" } });
  });

  it("is refused when it takes no message", () => {
    expect(replyerBlocker(replyer({ args: [model] }))).toBe("It does not take a message.");
  });
});

describe("choosing a room's replyer", () => {
  const blocked = replyer({ id: "a" });
  const ready = replyer({ id: "b", args: [message] });

  it("defaults to the first that can run", () => {
    expect(chooseReplyer([blocked, ready], null)?.id).toBe("b");
    expect(chooseReplyer([blocked], null)).toBeNull();
  });
  it("keeps the room's choice, even a blocked one", () => {
    expect(chooseReplyer([blocked, ready], "a")?.id).toBe("a");
  });
  it("falls back when the chosen one is gone", () => {
    expect(chooseReplyer([ready], "zzz")?.id).toBe("b");
  });
  it("respects choosing none", () => {
    expect(chooseReplyer([ready], NO_REPLYER)).toBeNull();
  });
});
