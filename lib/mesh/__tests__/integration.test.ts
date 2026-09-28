import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { createFakeMeshNative } from "@/lib/testing/fakeMeshNative";
import { endpoint, fakts, meshAlias, publicAlias } from "@/lib/testing/meshFixtures";

const mockNative = createFakeMeshNative();
const fake = mockNative;

jest.mock("@/modules/pokket-mesh", () => ({
  meshNative: () => mockNative,
  parseMeshStatus: (json: string) => JSON.parse(json),
}));
jest.mock("expo-device", () => ({ deviceName: "Pixel 8 Pro", modelName: "Pixel" }));

let appStateListener: ((state: string) => void) | undefined;
jest.spyOn(AppState, "addEventListener").mockImplementation((_type: any, listener: any) => {
  appStateListener = listener;
  return { remove: () => {} } as any;
});

// Imported after the mocks are in place.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- after the mocks, on purpose
const { createMeshIntegration } = require("../integration") as typeof import("../integration");

const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("mesh integration", () => {
  beforeEach(async () => {
    fake.calls.length = 0;
    fake.startOutcome = "running";
    await AsyncStorage.clear();
  });

  it("asks for a key only when the deployment has a mesh", () => {
    const mesh = createMeshIntegration();
    expect(mesh.wantsKey(endpoint)).toBe(true);
    expect(mesh.wantsKey({ ...endpoint, mesh_coord_url: null })).toBe(false);
  });

  it("asks per login: a login whose mesh is switched off asks for none", () => {
    const mesh = createMeshIntegration();
    const off = { id: "n1", label: "x", controlUrl: "https://mesh.go.test", hosts: [], enabled: false };
    expect(mesh.wantsKey(endpoint, off)).toBe(false);
    expect(mesh.wantsKey(endpoint, { ...off, enabled: true })).toBe(true);
  });

  it("joins with the one-shot key and hands back a mesh without it", async () => {
    const mesh = createMeshIntegration();
    const persisted = jest.fn();
    mesh.bind!(persisted);
    const granted = await mesh.onGrant({ endpoint, fakts, granted: { authKey: "SECRET-KEY" } });
    const record = mesh.record()!;
    expect(granted).toEqual(record.mesh);
    expect(record.mesh.controlUrl).toBe("https://mesh.go.test");
    expect(fake.calls[0]).toEqual(["start", record.mesh.id, "https://mesh.go.test", "pokket-pixel-8-pro", "SECRET-KEY"]);
    expect(JSON.stringify(granted)).not.toContain("SECRET-KEY");
    expect(JSON.stringify(persisted.mock.calls)).not.toContain("SECRET-KEY");
  });

  it("gives a login on a hub without a mesh none", async () => {
    const mesh = createMeshIntegration();
    const granted = await mesh.onGrant({ endpoint: { ...endpoint, mesh_coord_url: null }, fakts });
    expect(granted).toBeUndefined();
    expect(mesh.record()).toBeNull();
    expect(mesh.router.isRouted(meshAlias)).toBe(false);
    expect(fake.calls).toEqual([]);
  });

  it("routes mesh aliases through a loopback stand-in", async () => {
    const mesh = createMeshIntegration();
    await mesh.onGrant({ endpoint, fakts, granted: { authKey: "k" } });
    expect(mesh.router.isRouted(meshAlias)).toBe(true);
    expect(mesh.router.isRouted(publicAlias)).toBe(false);

    const standIn = await mesh.router.prepare(meshAlias, new AbortController());
    expect(standIn).toEqual({ ...meshAlias, host: "127.0.0.1", port: expect.any(Number), ssl: false });
    expect(mesh.router.resolve(meshAlias)).toEqual(standIn);
    expect(mesh.router.resolve(publicAlias)).toBe(publicAlias);
    // The node's MagicDNS suffix is remembered.
    expect(mesh.record()!.mesh.magicDnsSuffix).toBe("tail.example");
  });

  it("keeps each alias' own path when several services share a host", async () => {
    const mesh = createMeshIntegration();
    await mesh.onGrant({ endpoint, fakts, granted: { authKey: "k" } });
    const rekuest = { ...meshAlias, id: "rekuest", path: "rekuest" };
    const kuvert = { ...meshAlias, id: "kuvert", path: "kuvert" };
    await mesh.router.prepare(rekuest, new AbortController());
    await mesh.router.prepare(kuvert, new AbortController());

    const resolvedRekuest = mesh.router.resolve(rekuest);
    const resolvedKuvert = mesh.router.resolve(kuvert);
    expect(resolvedKuvert.path).toBe("kuvert");
    expect(resolvedKuvert.id).toBe("kuvert");
    expect(resolvedRekuest.path).toBe("rekuest");
    // Both through the one forward to that host.
    expect(resolvedKuvert.port).toBe(resolvedRekuest.port);
    expect(resolvedKuvert.host).toBe("127.0.0.1");
  });

  it("gives up on a node that cannot log in", async () => {
    const mesh = createMeshIntegration();
    fake.startOutcome = "needs-login";
    await mesh.onGrant({ endpoint, fakts, granted: { authKey: "k" } });
    await flush();
    // Restart the node through prepare: it stays in needs-login.
    await fake.stop(mesh.record()!.mesh.id);
    const standIn = await mesh.router.prepare(meshAlias, new AbortController());
    expect(standIn).toBeNull();
  }, 15000);

  it("rejoins from state (no key) on restore when an alias needs it", async () => {
    const first = createMeshIntegration();
    await first.onGrant({ endpoint, fakts, granted: { authKey: "k" } });
    fake.calls.length = 0;

    const second = createMeshIntegration(); // a fresh app launch
    await second.onRestore({ endpoint, fakts, mesh: first.record()!.mesh });
    expect(fake.calls).toEqual([["start", first.record()!.mesh.id, "https://mesh.go.test", "pokket-pixel-8-pro", null]]);
  });

  it("registers the node and parks it when no alias needs the mesh", async () => {
    const mesh = createMeshIntegration();
    await mesh.onGrant({ endpoint, fakts: { ...fakts, instances: {} }, granted: { authKey: "k" } });
    await flush();
    await flush();
    const id = mesh.record()!.mesh.id;
    expect(fake.calls.map((c) => c[0])).toEqual(["start", "stop"]);
    expect(fake.calls[1]).toEqual(["stop", id]);
  });

  it("the switch stops routing and stops asking for keys", async () => {
    const mesh = createMeshIntegration();
    await mesh.onGrant({ endpoint, fakts, granted: { authKey: "k" } });
    await mesh.router.prepare(meshAlias, new AbortController());
    const routesChanged = jest.fn();
    mesh.subscribe(routesChanged);

    await mesh.setEnabled(false, fakts);
    expect(mesh.router.isRouted(meshAlias)).toBe(false);
    expect(mesh.router.resolve(meshAlias)).toBe(meshAlias);
    expect(mesh.wantsKey(endpoint, mesh.record()!.mesh)).toBe(false);
    expect(routesChanged).toHaveBeenCalled();
  });

  it("switching to a login without a mesh stops the node but keeps it", async () => {
    const mesh = createMeshIntegration();
    await mesh.onGrant({ endpoint, fakts, granted: { authKey: "k" } });
    const own = mesh.record()!.mesh;
    await mesh.router.prepare(meshAlias, new AbortController());
    const routesChanged = jest.fn();
    mesh.subscribe(routesChanged);
    fake.calls.length = 0;

    await mesh.onRestore({ endpoint: { ...endpoint, base_url: "https://other.test/lok/f/", mesh_coord_url: null }, fakts });
    expect(fake.calls).toEqual([["stop", own.id]]);
    expect(mesh.record()).toBeNull();
    expect(mesh.router.isRouted(meshAlias)).toBe(false);
    expect(mesh.router.resolve(meshAlias)).toBe(meshAlias);
    expect(routesChanged).toHaveBeenCalled();

    // And back: the node rejoins from its state, with no key.
    fake.calls.length = 0;
    await mesh.onRestore({ endpoint, fakts, mesh: own });
    expect(fake.calls).toEqual([["start", own.id, "https://mesh.go.test", "pokket-pixel-8-pro", null]]);
  });

  it("parking for another sign-in stops the node but keeps it", async () => {
    const mesh = createMeshIntegration();
    await mesh.onGrant({ endpoint, fakts, granted: { authKey: "k" } });
    const id = mesh.record()!.mesh.id;
    await mesh.onPark();
    expect(fake.calls).toContainEqual(["stop", id]);
    expect(fake.calls).not.toContainEqual(["forget", id]);
    expect(mesh.record()).toBeNull();
  });

  it("signing out of a login forgets its node", async () => {
    const mesh = createMeshIntegration();
    await mesh.onGrant({ endpoint, fakts, granted: { authKey: "k" } });
    const own = mesh.record()!.mesh;
    await mesh.onDisconnect(own);
    expect(fake.calls).toContainEqual(["forget", own.id]);
    expect(mesh.record()).toBeNull();
  });

  it("the switch is kept on the login's profile", async () => {
    const mesh = createMeshIntegration();
    const persisted = jest.fn();
    mesh.bind!(persisted);
    await mesh.onGrant({ endpoint, fakts, granted: { authKey: "k" } });
    await mesh.setEnabled(false, fakts);
    expect(persisted).toHaveBeenLastCalledWith(expect.objectContaining({ id: mesh.record()!.mesh.id, enabled: false }));
  });

  it("re-binds forwards when the app comes back and reports moved routes", async () => {
    const mesh = createMeshIntegration();
    await mesh.onGrant({ endpoint, fakts, granted: { authKey: "k" } });
    const before = await mesh.router.prepare(meshAlias, new AbortController());
    const routesChanged = jest.fn();
    mesh.subscribe(routesChanged);

    fake.rebindAll();
    appStateListener!("active");
    await flush();
    const after = mesh.router.resolve(meshAlias);
    expect(after.port).not.toBe(before!.port);
    expect(fake.refreshNetwork).toHaveBeenCalled();
    expect(routesChanged).toHaveBeenCalled();
  });
});
