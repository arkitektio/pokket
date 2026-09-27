import { describe, expect, it } from "@jest/globals";
import { splitGrantResponse, splitRefreshResponse } from "../pollToken";
import { grantJson } from "@/lib/testing/meshFixtures";

describe("splitGrantResponse", () => {
  it("takes the mesh key from `mesh`", () => {
    const result = splitGrantResponse({
      ...grantJson,
      mesh: { ionscale_auth_key: "k1", ionscale_coord_url: "https://ion.test" },
    });
    expect(result.mesh).toEqual({ authKey: "k1", controlUrl: "https://ion.test" });
    // The key never ends up on the stored token.
    expect(JSON.stringify(result.token)).not.toContain("k1");
    expect(JSON.stringify(result.fakts)).not.toContain("k1");
  });

  it("accepts the older `auth` name", () => {
    expect(splitGrantResponse({ ...grantJson, auth: { ionscale_auth_key: "k2" } }).mesh).toEqual({
      authKey: "k2",
      controlUrl: undefined,
    });
  });

  it("has no mesh without a key", () => {
    expect(splitGrantResponse(grantJson).mesh).toBeUndefined();
    expect(splitGrantResponse({ ...grantJson, mesh: { ionscale_auth_key: null } }).mesh).toBeUndefined();
  });

  it("keeps who the grant is for", () => {
    expect(splitGrantResponse(grantJson).fakts.self.sub).toBe("1");
  });
});

describe("splitRefreshResponse", () => {
  it("drops a key a refresh should never carry", () => {
    const result = splitRefreshResponse({ ...grantJson, mesh: { ionscale_auth_key: "k3" } });
    expect(JSON.stringify(result)).not.toContain("k3");
    expect(result.fakts).not.toBeNull();
  });

  it("keeps the session when the envelope is missing", () => {
    const { self, instances, statuses, ...tokenOnly } = grantJson as any;
    expect(splitRefreshResponse(tokenOnly).fakts).toBeNull();
  });
});
