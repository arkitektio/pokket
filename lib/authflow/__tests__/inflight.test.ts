import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { awaitCallback, claimCallback, completionOf, finishRedirect, onAuthUpdate, resetInflight } from "../inflight";
import type { AuthCompletion, AuthUpdate } from "../types";

const done: AuthUpdate = { status: "DONE", result: { identifier: "@bank/connection", id: "4" } };

describe("finishRedirect", () => {
  afterEach(resetInflight);

  it("exchanges a code once, however many paths bring it", async () => {
    const complete = jest.fn(async (_: AuthCompletion) => done);
    const heard = jest.fn();
    onAuthUpdate("s-1", heard);
    const [a, b] = await Promise.all([
      finishRedirect({ state: "s-1", code: "c" }, complete),
      finishRedirect({ state: "s-1", code: "c" }, complete),
    ]);
    expect(await finishRedirect({ state: "s-1", code: "c" }, complete)).toBe(done);
    expect(a).toBe(done);
    expect(b).toBe(done);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(heard).toHaveBeenCalledWith(done);
  });

  it("lets a failed request be tried again", async () => {
    const complete = jest
      .fn<(c: AuthCompletion) => Promise<AuthUpdate>>()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(done);
    await expect(finishRedirect({ state: "s-1", code: "c" }, complete)).rejects.toThrow("network down");
    expect(await finishRedirect({ state: "s-1", code: "c" }, complete)).toBe(done);
  });
});

describe("claimCallback", () => {
  afterEach(resetInflight);

  it("hands a redirect to the sheet waiting on its state, and nothing else", () => {
    const claimer = jest.fn();
    const release = awaitCallback("s-1", claimer);
    expect(claimCallback("orkestrator://bank/auth/callback?code=c&state=s-2")).toBe(false);
    expect(claimCallback("orkestrator://bank/auth/callback?code=c&state=s-1")).toBe(true);
    expect(claimer).toHaveBeenCalledWith({ state: "s-1", code: "c" });
    release();
    expect(claimCallback("orkestrator://bank/auth/callback?code=c&state=s-1")).toBe(false);
  });

  it("hands on a refusal as one", () => {
    expect(completionOf("orkestrator://bank/auth/callback?error=access_denied&state=s-1")).toEqual({
      state: "s-1",
      error: "access_denied",
      errorDescription: undefined,
    });
    expect(completionOf("orkestrator://bank/auth/callback?code=c")).toBeNull();
  });
});
