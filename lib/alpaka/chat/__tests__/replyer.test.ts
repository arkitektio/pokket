import { describe, expect, it } from "@jest/globals";
import {
  bySubject,
  chooseReplyer,
  hasSettings,
  isSpecific,
  messageKey,
  missingArgs,
  NO_REPLYER,
  Replyer,
  replyerArgs,
  replyerBlocker,
  subjectKey,
} from "../replyer";

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

  it("runs with the settings saved on this phone before those of its last run", () => {
    const ran = replyer({ latestTask: { args: { model: { object: 3 } } } });
    const saved = { model: { object: 9 }, system: "Be brief" };
    expect(replyerBlocker(replyer(), saved)).toBeNull();
    expect(replyerArgs(ran, "42", saved)).toEqual({
      model: { object: 9 },
      system: "Be brief",
      message: { __identifier: "@alpaka/message", object: "42" },
    });
  });

  it("says what it needs set", () => {
    expect(replyerBlocker(replyer())).toBe("Needs settings: model.");
  });

  it("has settings when it takes more than the message", () => {
    expect(hasSettings(replyer())).toBe(true);
    expect(hasSettings(replyer({ args: [message] }))).toBe(false);
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
  it("judges what can run by the blocker it is given", () => {
    expect(chooseReplyer([blocked, ready], null, () => null)?.id).toBe("a");
  });
  it("respects choosing none", () => {
    expect(chooseReplyer([ready], NO_REPLYER)).toBeNull();
  });
});

describe("a replyer about a structure", () => {
  const image = { key: "image", kind: "STRUCTURE", identifier: "@mikro/image", nullable: false };
  const subject = { identifier: "@mikro/image", object: 5 };
  const specific = replyer({ id: "s", args: [message, image] });
  const generic = replyer({ id: "g", args: [message] });

  it("takes the subject in the argument of its kind", () => {
    expect(subjectKey(specific, subject)).toBe("image");
    expect(subjectKey(specific, { identifier: "@rekuest/task" })).toBeNull();
    expect(subjectKey(specific, null)).toBeNull();
  });

  it("never takes the subject in its message", () => {
    const messages = { identifier: "@alpaka/message" };
    expect(subjectKey(replyer({ args: [message] }), messages)).toBeNull();
  });

  it("does not need the subject set, the chat fills it", () => {
    expect(replyerBlocker(specific, null, subject)).toBeNull();
    expect(missingArgs(specific)).toEqual(["image"]);
    expect(hasSettings(specific, subject)).toBe(false);
  });

  it("is handed the subject beside the message", () => {
    expect(replyerArgs(specific, "42", null, subject)).toEqual({
      message: { __identifier: "@alpaka/message", object: "42" },
      image: { __identifier: "@mikro/image", object: "5" },
    });
    expect(replyerArgs(generic, "42", null, subject)).toEqual({
      message: { __identifier: "@alpaka/message", object: "42" },
    });
  });

  it("comes first among the replyers, so a room about it picks it", () => {
    expect(isSpecific(specific, subject)).toBe(true);
    expect(bySubject([generic, specific], subject).map((r) => r.id)).toEqual(["s", "g"]);
    expect(bySubject([generic, specific], null).map((r) => r.id)).toEqual(["g", "s"]);
    expect(chooseReplyer(bySubject([generic, specific], subject), null, (r) => replyerBlocker(r, null, subject))?.id).toBe("s");
  });
});
