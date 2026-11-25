import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { createFakeMeshNative } from "@/lib/testing/fakeMeshNative";
import { endpoint, fakts } from "@/lib/testing/meshFixtures";

const mockNative = createFakeMeshNative();
const fake = mockNative;

jest.mock("@/modules/pokket-mesh", () => ({
  ...(jest.requireActual("@/modules/pokket-mesh") as object),
  meshNative: () => mockNative,
}));
jest.mock("expo-device", () => ({ deviceName: "Pixel 8 Pro", modelName: "Pixel" }));
jest.spyOn(AppState, "addEventListener").mockImplementation(() => ({ remove: () => {} }) as any);

// Imported after the mocks are in place.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- after the mocks, on purpose
const { createMeshIntegration, MediaBridgeError } = require("../integration") as typeof import("../integration");

/**
 * Live media to a LiveKit only on the mesh goes through the node's media bridge
 * (a TURN server on loopback), handed to WebRTC as its ICE server; anything
 * else goes direct.
 */
describe("the media path", () => {
  beforeEach(async () => {
    fake.calls.length = 0;
    fake.startOutcome = "running";
    fake.mediaBridgeError = null;
    await AsyncStorage.clear();
  });

  it("is direct without a mesh, and for a LiveKit that is not on it", async () => {
    const mesh = createMeshIntegration();
    expect(await mesh.mediaPathFor("livekit.mesh.go.test")).toEqual({ kind: "direct" });
    await mesh.onGrant({ endpoint, fakts, granted: { authKey: "k" } });
    expect(await mesh.mediaPathFor("livekit.go.test")).toEqual({ kind: "direct" });
    expect(fake.calls.filter(([op]) => op === "mediaBridge")).toEqual([]);
  });

  it("goes through the bridge for a LiveKit on the mesh, asked by its own host", async () => {
    const mesh = createMeshIntegration();
    await mesh.onGrant({ endpoint, fakts, granted: { authKey: "k" } });
    const id = mesh.record()!.mesh.id;

    const [path, same] = await Promise.all([
      mesh.mediaPathFor("livekit.mesh.go.test"),
      mesh.mediaPathFor("livekit.mesh.go.test"),
    ]);
    expect(path).toEqual({
      kind: "media-bridge",
      meshLabel: mesh.record()!.mesh.label,
      rtcConfig: {
        iceServers: [{ urls: ["turn:127.0.0.1:41000?transport=udp"], username: "u", credential: "c" }],
        iceTransportPolicy: "all",
      },
    });
    expect(same).toBe(path);
    // Rooms joining at once share one ask; the bridge relays to the media server only.
    expect(fake.calls.filter(([op]) => op === "mediaBridge")).toEqual([["mediaBridge", id, ["livekit.mesh.go.test"]]]);

    // Nothing is kept past the answer: a node restarted since has a new bridge.
    await mesh.mediaPathFor("livekit.mesh.go.test");
    expect(fake.calls.filter(([op]) => op === "mediaBridge")).toHaveLength(2);
  });

  it("says why, as a sentence, when the bridge cannot start", async () => {
    const mesh = createMeshIntegration();
    await mesh.onGrant({ endpoint, fakts, granted: { authKey: "k" } });
    fake.mediaBridgeError = "svc is not a machine on this mesh";
    const failed = mesh.mediaPathFor("livekit.mesh.go.test");
    await expect(failed).rejects.toBeInstanceOf(MediaBridgeError);
    await expect(failed).rejects.toThrow(/media bridge could not start: svc is not a machine on this mesh/);
  });

  it("says the app needs updating when its native build has no bridge", async () => {
    const mesh = createMeshIntegration();
    await mesh.onGrant({ endpoint, fakts, granted: { authKey: "k" } });
    const bridge = fake.mediaBridge;
    (fake as any).mediaBridge = undefined;
    try {
      await expect(mesh.mediaPathFor("livekit.mesh.go.test")).rejects.toThrow(/no media bridge \(update it\)/);
    } finally {
      fake.mediaBridge = bridge;
    }
  });
});
