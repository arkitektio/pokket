import { describe, expect, it, jest } from "@jest/globals";
import { discover } from "../discover";

const wellKnown = {
  name: "Test",
  version: "1",
  base_url: "https://go.test/lok/f/",
  device_authorization_endpoint: "https://go.test/lok/o/app-authorization/",
  token_endpoint: "https://go.test/lok/o/token/",
};

const serve = (doc: unknown) => {
  globalThis.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => doc })) as any;
};

describe("discover", () => {
  it("accepts protocol 2 and reads the mesh", async () => {
    serve({ ...wellKnown, protocol_version: "2", mesh_coord_url: "https://mesh.go.test" });
    const endpoint = await discover({ url: "https://go.test", controller: new AbortController() });
    expect(endpoint.mesh_coord_url).toBe("https://mesh.go.test");
  });

  it("accepts a document without protocol_version", async () => {
    serve(wellKnown);
    await expect(discover({ url: "https://go.test", controller: new AbortController() })).resolves.toBeTruthy();
  });

  it("refuses another protocol by name", async () => {
    serve({ ...wellKnown, protocol_version: "1" });
    await expect(discover({ url: "https://go.test", controller: new AbortController() })).rejects.toThrow(
      /protocol 1/,
    );
  });

  it("refuses a protocol-1 document (no OAuth endpoints)", async () => {
    serve({ name: "Old", version: "1", base_url: "https://x/f/", claim: "https://x/f/claim/" });
    await expect(discover({ url: "https://x", controller: new AbortController() })).rejects.toThrow(
      /No valid Fakts endpoint/,
    );
  });
});
