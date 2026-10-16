import { beforeEach, describe, expect, it } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { findPending, forgetPending, rememberPending } from "../pending";

const HOUR = 60 * 60 * 1000;

describe("pending logins", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("remembers a started login by its state", async () => {
    await rememberPending("s-1", { namespace: "bank", profile: "p-1", expiresAt: 10_000 }, 0);
    expect(await findPending("s-1", 0)).toEqual({ namespace: "bank", profile: "p-1", expiresAt: 10_000 });
    expect(await findPending("s-2", 0)).toBeNull();
  });

  it("forgets one without touching the others", async () => {
    await rememberPending("s-1", { namespace: "bank", profile: null, expiresAt: 10_000 }, 0);
    await rememberPending("s-2", { namespace: "kuvert", profile: null, expiresAt: 10_000 }, 0);
    await forgetPending("s-1", 0);
    expect(await findPending("s-1", 0)).toBeNull();
    expect((await findPending("s-2", 0))?.namespace).toBe("kuvert");
  });

  it("keeps a login a while past its deadline (a later step), then drops it", async () => {
    await rememberPending("s-1", { namespace: "bank", profile: null, expiresAt: 10_000 }, 0);
    expect(await findPending("s-1", 10_000 + HOUR - 1)).not.toBeNull();
    expect(await findPending("s-1", 10_000 + HOUR + 1)).toBeNull();
  });

  it("reads unreadable storage as nothing pending", async () => {
    await AsyncStorage.setItem("pokket.authflow.pending", "{not json");
    expect(await findPending("s-1")).toBeNull();
  });
});
