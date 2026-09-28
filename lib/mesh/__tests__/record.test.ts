import { describe, expect, it } from "@jest/globals";
import { meshFromGrant } from "../record";
import { endpoint } from "@/lib/testing/meshFixtures";

describe("meshFromGrant", () => {
  it("needs a key", () => {
    expect(meshFromGrant(endpoint, undefined, undefined)).toBeUndefined();
  });

  it("falls back to the deployment's control server", () => {
    const mesh = meshFromGrant(endpoint, { authKey: "k" }, undefined)!;
    expect(mesh.controlUrl).toBe("https://mesh.go.test");
    expect(mesh.id).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    expect(mesh.enabled).toBe(true);
    expect(JSON.stringify(mesh)).not.toContain('"k"');
  });

  it("refuses an insecure control server", () => {
    expect(meshFromGrant(endpoint, { authKey: "k", controlUrl: "http://evil.test" }, undefined)).toBeUndefined();
    expect(meshFromGrant(endpoint, { authKey: "k", controlUrl: "https://u:p@ion.test" }, undefined)).toBeUndefined();
  });

  it("keeps a re-approved mesh's id and switch, but not across control servers", () => {
    const first = meshFromGrant(endpoint, { authKey: "k" }, undefined)!;
    const again = meshFromGrant(endpoint, { authKey: "k" }, { ...first, enabled: false })!;
    expect(again.id).toBe(first.id);
    expect(again.enabled).toBe(false);
    const moved = meshFromGrant(endpoint, { authKey: "k", controlUrl: "https://other.test" }, first)!;
    expect(moved.id).not.toBe(first.id);
  });
});
