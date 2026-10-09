import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Room } from "livekit-client";
import { callStore } from "../store";

const state = () => callStore.getState();
const room = () => ({ disconnect: jest.fn(async () => undefined) }) as unknown as Room;

beforeEach(() => state().leave());

describe("call store", () => {
  it("starts connecting with the token, speaking unless told otherwise", () => {
    state().start({ id: "1", title: "One" }, "token");
    expect(state()).toMatchObject({ status: "connecting", token: "token", media: { audio: true } });
    state().start({ id: "1", title: "One" }, "token", { audio: false });
    expect(state().media.audio).toBe(false);
  });

  it("leaves the call it was in when another starts", () => {
    const first = room();
    state().start({ id: "1", title: "One" }, "a");
    state().setRoom(first);
    state().start({ id: "2", title: "Two" }, "b");
    expect(first.disconnect).toHaveBeenCalled();
    expect(state().call?.id).toBe("2");
    expect(state().room).toBeNull();
  });

  it("keeps a lost call on screen, without its token", () => {
    state().start({ id: "1", title: "One" }, "a");
    state().connected();
    state().fail("The connection was lost");
    expect(state()).toMatchObject({ status: "error", error: "The connection was lost", token: null });
    expect(state().call?.id).toBe("1");
  });

  it("does not report a drop after hanging up", () => {
    state().start({ id: "1", title: "One" }, "a");
    state().leave();
    state().fail("The connection was lost");
    expect(state().status).toBe("idle");
  });
});
