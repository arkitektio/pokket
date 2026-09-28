import { describe, expect, it } from "@jest/globals";
import {
  disabled,
  emptyPushRecord,
  needsRegistration,
  parsePushRecord,
  REREGISTER_AFTER_MS,
  withRegistration,
} from "../state";

describe("push registration record", () => {
  it("is off until chosen, and survives garbage", () => {
    expect(emptyPushRecord().enabled).toBe(false);
    expect(parsePushRecord("nonsense").enabled).toBe(false);
    expect(parsePushRecord(null).registrations).toEqual({});
  });

  it("registers an organization once per token, and again when it goes stale", () => {
    const record = withRegistration({ ...emptyPushRecord(), enabled: true }, "org-a", "tok1", 1000);
    expect(needsRegistration(record, "org-a", "tok1", 2000)).toBe(false);
    expect(needsRegistration(record, "org-a", "tok2", 2000)).toBe(true);
    expect(needsRegistration(record, "org-b", "tok1", 2000)).toBe(true);
    expect(needsRegistration(record, "org-a", "tok1", 1000 + REREGISTER_AFTER_MS + 1)).toBe(true);
  });

  it("turning off forgets the token and every registration", () => {
    const record = withRegistration({ ...emptyPushRecord(), enabled: true }, "org-a", "tok1");
    const off = disabled(record);
    expect(off).toEqual({ enabled: false, token: undefined, registrations: {} });
  });
});
