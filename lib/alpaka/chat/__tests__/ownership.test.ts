import { describe, expect, it } from "@jest/globals";
import { byCreation, isOwnMessage } from "../ownership";
import { choiceFor, parseChoices, withChoice } from "../replyerChoice";

const me = { id: "7", username: "ada" };

describe("whose message it is", () => {
  it("is mine when my user is behind the agent", () => {
    expect(isOwnMessage({ name: "default", user: { id: "7" } }, me)).toBe(true);
    expect(isOwnMessage({ name: "pokket", user: { id: "7" } }, me)).toBe(true);
  });
  it("is not mine when someone else wrote it from their app", () => {
    expect(isOwnMessage({ name: "default", user: { id: "8", preferredUsername: "bob" } }, me)).toBe(false);
  });
  it("matches by name where the services number users differently", () => {
    expect(isOwnMessage({ name: "default", user: { id: "sub-abc", preferredUsername: "ada" } }, me)).toBe(true);
  });
  it("does not claim a bot that runs as me", () => {
    expect(isOwnMessage({ name: "ollama", user: { id: "sub-abc", preferredUsername: "ada" } }, me)).toBe(false);
  });
  it("is nobody's when there is no agent or no user", () => {
    expect(isOwnMessage(null, me)).toBe(false);
    expect(isOwnMessage({ name: "default", user: null }, me)).toBe(false);
  });
  it("goes by the app's agent name until we know who we are", () => {
    expect(isOwnMessage({ name: "default", user: { id: "8" } }, null)).toBe(true);
    expect(isOwnMessage({ name: "ollama", user: { id: "8" } }, null)).toBe(false);
  });
});

describe("message order", () => {
  it("is oldest first, without touching the input", () => {
    const messages = [{ createdAt: "2026-10-10T10:00:00Z" }, { createdAt: "2026-10-10T09:00:00Z" }];
    expect(byCreation(messages).map((m) => m.createdAt)).toEqual(["2026-10-10T09:00:00Z", "2026-10-10T10:00:00Z"]);
    expect(messages[0].createdAt).toBe("2026-10-10T10:00:00Z");
  });
});

describe("remembered replyers", () => {
  it("keeps one choice per room, the latest", () => {
    const choices = withChoice(withChoice([], "1", "a"), "1", "b");
    expect(choices).toEqual([["1", "b"]]);
    expect(choiceFor(choices, "1")).toBe("b");
    expect(choiceFor(choices, "2")).toBeNull();
  });
  it("lets go of the rooms used longest ago, whatever their ids", () => {
    let choices = withChoice([], "900", "first");
    for (let i = 0; i < 199; i++) choices = withChoice(choices, String(i), "a");
    choices = withChoice(choices, "900", "again");
    choices = withChoice(choices, "500", "a");
    expect(choices).toHaveLength(200);
    expect(choiceFor(choices, "0")).toBeNull();
    expect(choiceFor(choices, "900")).toBe("again");
  });
  it("reads pairs, and the map an earlier version stored", () => {
    expect(parseChoices(null)).toEqual([]);
    expect(parseChoices("nope")).toEqual([]);
    expect(parseChoices('[["1","a"],["2",3],"x"]')).toEqual([["1", "a"]]);
    expect(parseChoices('{"1":"a","2":3}')).toEqual([["1", "a"]]);
  });
});
