import { describe, expect, it } from "@jest/globals";
import {
  firstMessageAttachments,
  loadTalkingAbout,
  parseTalkingAbout,
  saveTalkingAbout,
  talkingAboutFor,
  withTalkingAbout,
} from "../talkingAbout";

const task = { identifier: "@rekuest/task", object: 42 };
const image = { identifier: "@mikro/image", object: 5 };

const memory = () => {
  const store = new Map<string, string>();
  return {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
  };
};

describe("what a room is about", () => {
  it("is remembered per room and read back", async () => {
    const storage = memory();
    await saveTalkingAbout("1", [task], storage);
    await saveTalkingAbout("2", [image], storage);
    expect(await loadTalkingAbout("1", storage)).toEqual([task]);
    expect(await loadTalkingAbout("2", storage)).toEqual([image]);
    expect(await loadTalkingAbout("3", storage)).toEqual([]);
  });

  it("keeps nothing for a room about nothing", async () => {
    const storage = memory();
    await saveTalkingAbout("1", [], storage);
    expect(await storage.getItem("alpaka-room-talking-about")).toBeNull();
  });

  it("replaces a room's entry and moves it to the end", () => {
    const all = withTalkingAbout(withTalkingAbout(withTalkingAbout([], "1", [task]), "2", [task]), "1", [image]);
    expect(all.map(([room]) => room)).toEqual(["2", "1"]);
    expect(talkingAboutFor(all, "1")).toEqual([image]);
  });

  it("lets the oldest rooms go", () => {
    let all = withTalkingAbout([], "first", [task]);
    for (let i = 0; i < 200; i++) all = withTalkingAbout(all, String(i), [task]);
    expect(all).toHaveLength(200);
    expect(talkingAboutFor(all, "first")).toEqual([]);
  });

  it("reads past what is not a structure, or not JSON", () => {
    expect(parseTalkingAbout("nope")).toEqual([]);
    expect(parseTalkingAbout(JSON.stringify({ 1: [task] }))).toEqual([]);
    expect(parseTalkingAbout(JSON.stringify([["1", [task, { identifier: "x", object: "7" }]], ["2"]]))).toEqual([["1", [task]]]);
  });

  it("is attached to the first message only", () => {
    expect(firstMessageAttachments([], [task])).toEqual([task]);
    expect(firstMessageAttachments([{}], [task])).toEqual([]);
  });
});
