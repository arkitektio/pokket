import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AppState } from "react-native";
import { createFakeMeshNative } from "@/lib/testing/fakeMeshNative";

const mockNative = createFakeMeshNative();
const fake = mockNative;

jest.mock("@/modules/pokket-mesh", () => ({
  meshNative: () => mockNative,
  parseMeshStatus: (json: string | null) => (json ? JSON.parse(json) : null),
}));
jest.mock("expo-device", () => ({ deviceName: "Pixel 8 Pro", modelName: "Pixel" }));

// Imported after the mocks are in place.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- after the mocks, on purpose
const { openMeshRoute } = require("../headless") as typeof import("../headless");

const mesh = { id: "n1", label: "Lab", controlUrl: "https://mesh.lab.test", hosts: ["lokate.lab.test"], enabled: true };
const alias = { id: "lokate-1", host: "lokate.lab.test", ssl: true, challenge: "ht" };

const setAppState = (state: string) => Object.defineProperty(AppState, "currentState", { value: state, configurable: true });
const reportStatus = (state: string | null) =>
  // The fake's own `status` only ever answers null; these answer as the Go node does.
  fake.status.mockImplementation((async () => (state ? JSON.stringify({ id: mesh.id, state }) : null)) as () => Promise<null>);

describe("openMeshRoute", () => {
  beforeEach(() => {
    fake.calls.length = 0;
    fake.startOutcome = "running";
    reportStatus("stopped");
    setAppState("background");
  });

  it("rejoins a stopped node without a key, forwards, and stops it on release", async () => {
    const route = await openMeshRoute(mesh, alias);
    expect(route?.alias).toMatchObject({ host: "127.0.0.1", ssl: false, id: "lokate-1" });
    expect(fake.calls[0]).toEqual(["start", "n1", "https://mesh.lab.test", "pokket-pixel-8-pro", null]);
    expect(fake.calls).toContainEqual(["forward", "n1", "lokate.lab.test", 0, true]);
    await route!.release();
    expect(fake.calls.at(-1)).toEqual(["stop", "n1"]);
  });

  it("uses a node that is already up, and leaves it running", async () => {
    reportStatus("running");
    const route = await openMeshRoute(mesh, alias);
    expect(fake.calls.some(([call]) => call === "start")).toBe(false);
    await route!.release();
    expect(fake.calls.some(([call]) => call === "stop")).toBe(false);
  });

  it("gives up on a node that cannot get in, and stops it", async () => {
    fake.startOutcome = "needs-login";
    const route = await openMeshRoute(mesh, alias, { timeoutMs: 10_000 });
    expect(route).toBeNull();
    expect(fake.calls.at(-1)).toEqual(["stop", "n1"]);
  });

  it("leaves the node to the app when it came to the foreground meanwhile", async () => {
    const route = await openMeshRoute(mesh, alias);
    setAppState("active");
    await route!.release();
    expect(fake.calls.some(([call]) => call === "stop")).toBe(false);
  });
});
