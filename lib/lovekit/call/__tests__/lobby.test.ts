import { describe, expect, it } from "@jest/globals";
import { applyInviteEvent } from "../inviteEvents";
import { callClock, initials, lobbyLine, participantNames } from "../lobby";

describe("lobby", () => {
  it("counts one person on two devices once", () => {
    const names = participantNames([
      { identity: "7-phone", name: "ada" },
      { identity: "7-laptop", name: "ada" },
      { identity: "9", name: "" },
    ]);
    expect(names).toEqual(["ada (2 devices)", "9"]);
  });

  it("says who is in", () => {
    expect(lobbyLine([])).toBe("Nobody is in the call yet");
    expect(lobbyLine(["ada"])).toBe("ada is in the call");
    expect(lobbyLine(["ada", "bob"])).toBe("2 in the call: ada, bob");
  });

  it("keeps a clock and makes initials", () => {
    expect(callClock(0, 65_000)).toBe("1:05");
    expect(callClock(10_000, 0)).toBe("0:00");
    expect(initials("ada lovelace")).toBe("AL");
    expect(initials("")).toBe("?");
  });
});

describe("invite events", () => {
  const invites = [{ id: "1" }, { id: "2" }];

  it("puts a new invitation first, once", () => {
    expect(applyInviteEvent(invites, { create: { id: "3" } }).map((i) => i.id)).toEqual(["3", "1", "2"]);
    expect(applyInviteEvent(invites, { create: { id: "1" } })).toBe(invites);
  });

  it("removes the one that was put away", () => {
    expect(applyInviteEvent(invites, { delete: "1" })).toEqual([{ id: "2" }]);
    expect(applyInviteEvent(invites, { delete: "9" })).toBe(invites);
  });

  it("leaves the list alone on an empty event", () => {
    expect(applyInviteEvent(invites, null)).toBe(invites);
    expect(applyInviteEvent(invites, {})).toBe(invites);
  });
});
