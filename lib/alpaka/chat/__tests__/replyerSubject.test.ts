import { describe, expect, it } from "@jest/globals";
import { replyerSubject, sameSubject, subjectWire } from "../replyerSubject";

const task = { identifier: "@rekuest/task", object: 42 };
const image = { identifier: "@mikro/image", object: 5 };
const file = { identifier: "@mikro/file", object: 9 };

describe("what the next reply is about", () => {
  it("is what is staged first", () => {
    expect(replyerSubject({ staged: [image], messages: [{ attachedStructures: [file], createdAt: "2026-01-01" }], about: [task] })).toEqual(image);
  });

  it("is else what the latest message carried", () => {
    const messages = [
      { attachedStructures: [file], createdAt: "2026-01-02" },
      { attachedStructures: [image], createdAt: "2026-01-01" },
      { attachedStructures: [], createdAt: "2026-01-03" },
    ];
    expect(replyerSubject({ staged: [], messages, about: [task] })).toEqual(file);
  });

  it("is else what the room was opened about, or nothing", () => {
    expect(replyerSubject({ staged: [], messages: [], about: [task] })).toEqual(task);
    expect(replyerSubject({ staged: [], messages: [], about: [] })).toBeNull();
  });

  it("goes over the wire as rekuest takes a structure", () => {
    expect(subjectWire(task)).toEqual({ __identifier: "@rekuest/task", object: "42" });
  });

  it("is the same subject by what it names", () => {
    expect(sameSubject(task, { ...task })).toBe(true);
    expect(sameSubject(task, image)).toBe(false);
    expect(sameSubject(null, null)).toBe(true);
    expect(sameSubject(task, null)).toBe(false);
  });
});
