import { describe, expect, it, jest } from "@jest/globals";
import { checkAliasHealth, resolveWorkingAlias } from "../resolve";
import type { AliasRouter } from "../../types";
import { fakts, meshAlias, publicAlias } from "@/lib/testing/meshFixtures";

const standIn = { ...meshAlias, host: "127.0.0.1", port: 41000, ssl: false };

const router = (reachable = true): AliasRouter => ({
  isRouted: (alias) => alias.host === meshAlias.host,
  prepare: jest.fn(async () => (reachable ? standIn : null)),
  resolve: (alias) => (alias.host === meshAlias.host ? standIn : alias),
});

const serve = (ok: (url: string) => boolean) => {
  const urls: string[] = [];
  globalThis.fetch = jest.fn(async (url: string) => {
    urls.push(url);
    return { ok: ok(url), status: ok(url) ? 200 : 502 };
  }) as any;
  return urls;
};

describe("resolveWorkingAlias with a router", () => {
  it("tries direct aliases first, then the mesh through its stand-in", async () => {
    // Mesh alias listed first in fakts; it must still come last.
    const instance = { ...fakts.instances.mikro, aliases: [meshAlias, publicAlias] };
    const urls = serve((url) => url.includes("127.0.0.1"));
    const chosen = await resolveWorkingAlias({ instance, controller: new AbortController(), router: router(), timeout: 1000 });
    expect(urls).toEqual(["https://mikro.go.test/ht", "http://127.0.0.1:41000/ht"]);
    // What gets stored is the fakts' alias, not the loopback address.
    expect(chosen).toBe(meshAlias);
  });

  it("does not wait for the mesh when a direct alias works", async () => {
    const r = router();
    serve(() => true);
    const chosen = await resolveWorkingAlias({ instance: fakts.instances.mikro, controller: new AbortController(), router: r });
    expect(chosen).toEqual(publicAlias);
    expect(r.prepare).not.toHaveBeenCalled();
  });

  it("skips a mesh alias the router cannot reach", async () => {
    serve(() => false);
    await expect(
      resolveWorkingAlias({ instance: fakts.instances.mikro, controller: new AbortController(), router: router(false) }),
    ).rejects.toThrow(/No working alias/);
  });
});

describe("checkAliasHealth with a router", () => {
  it("checks a mesh alias through its stand-in", async () => {
    const urls = serve(() => true);
    await expect(checkAliasHealth(meshAlias, 1000, new AbortController(), router())).resolves.toBe(true);
    expect(urls).toEqual(["http://127.0.0.1:41000/ht"]);
  });

  it("is unhealthy when the mesh is unreachable", async () => {
    serve(() => true);
    await expect(checkAliasHealth(meshAlias, 1000, new AbortController(), router(false))).resolves.toBe(false);
  });
});
