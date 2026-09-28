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

  it("joins with the one-shot key and never stores it", async () => {
    const mesh = createMeshIntegration();
    await mesh.onGrant({ endpoint, fakts, granted: { authKey: "SECRET-KEY" } });
    const record = mesh.record()!;
    expect(record.mesh.controlUrl).toBe("https://mesh.go.test");
    expect(fake.calls[0]).toEqual(["start", record.mesh.id, "https://mesh.go.test", "pokket-pixel-8-pro", "SECRET-KEY"]);
    const stored = JSON.stringify(await (AsyncStorage as any).multiGet(await AsyncStorage.getAllKeys()));
    expect(stored).toContain(record.mesh.id);
    expect(stored).not.toContain("SECRET-KEY");
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
    await second.onRestore({ endpoint, fakts });
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
    expect(mesh.wantsKey(endpoint)).toBe(false);
    expect(routesChanged).toHaveBeenCalled();
  });

  it("a grant for another deployment forgets the old node", async () => {
    const mesh = createMeshIntegration();
    await mesh.onGrant({ endpoint, fakts, granted: { authKey: "k" } });
    const oldId = mesh.record()!.mesh.id;
    await mesh.onGrant({ endpoint: { ...endpoint, base_url: "https://other.test/lok/f/" }, fakts });
    expect(fake.calls).toContainEqual(["forget", oldId]);
    expect(mesh.record()).toBeNull();
  });

  it("logout forgets the node", async () => {
    const mesh = createMeshIntegration();
    await mesh.onGrant({ endpoint, fakts, granted: { authKey: "k" } });
    const id = mesh.record()!.mesh.id;
    await mesh.onDisconnect();
    expect(fake.calls).toContainEqual(["forget", id]);
    expect(mesh.record()).toBeNull();
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
