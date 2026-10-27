import { describe, expect, it, jest } from "@jest/globals";
import { createHash } from "node:crypto";
import {
  deploymentOrigin,
  frameConfig,
  parseInfo,
  parseStatus,
  wifiConfig,
  DeviceProtocolError,
  openProvisioningDevice,
} from "../protocol";
import type { GattConnection } from "../gatt";

const enc = (v: unknown) => new TextEncoder().encode(typeof v === "string" ? v : JSON.stringify(v));
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

const INFO = {
  protocol: 2,
  manifest: {
    identifier: "live.arkitekt.esp32",
    version: "2.0.0",
    device_id: "a1b2c3d4e5f6",
    scopes: [],
    requirements: [{ key: "rekuest", service: "live.arkitekt.rekuest", optional: false }],
  },
  build: "abc123",
  state: "idle",
  has_key: false,
  has_wifi: false,
};

describe("provisioning protocol v2", () => {
  it("reads a device's info", () => {
    const info = parseInfo(enc(INFO));
    expect(info.manifest.device_id).toBe("a1b2c3d4e5f6");
    expect(info.manifest.requirements[0]).toEqual({ key: "rekuest", service: "live.arkitekt.rekuest", optional: false });
  });

  it("names the protocol an old device speaks", () => {
    expect(() => parseInfo(enc({ identifier: "x", version: "1", requirements: [] }))).toThrow("protocol 1");
    expect(() => parseInfo(enc("Ready"))).toThrow(DeviceProtocolError);
    expect(() => parseInfo(enc({ ...INFO, manifest: { ...INFO.manifest, device_id: "" } }))).toThrow("device_id");
  });

  it("frames a document as BEGIN, chunks, COMMIT with its sha256", async () => {
    const config = { wifi: { ssid: "Läb", password: "pässwörd" }, origin: "https://go.arkitekt.live", key: "k".repeat(43) };
    const frames = await frameConfig(config, 16);
    const document = new TextEncoder().encode(JSON.stringify(config));
    expect(dec(frames[0])).toBe(`BEGIN ${document.length}`);
    const body = frames.slice(1, -1);
    expect(body.every((f) => f.length <= 16)).toBe(true);
    // Raw UTF-8 on the wire, split anywhere (even inside a character): never base64.
    expect(Buffer.concat(body)).toEqual(Buffer.from(document));
    expect(dec(frames.at(-1)!)).toBe(`COMMIT ${createHash("sha256").update(document).digest("hex")}`);
  });

  it("turns a profile into the document's wifi", () => {
    expect(wifiConfig({ type: "standard", ssid: "Lab", password: "longenough" })).toEqual({
      ssid: "Lab",
      password: "longenough",
    });
    const eduroam = { type: "eduroam" as const, ssid: "eduroam", password: "x", identity: "j@uni", pemCertificate: "PEM" };
    expect(wifiConfig(eduroam).eap).toEqual({ identity: "j@uni", ca_pem: "PEM" });
    expect(wifiConfig({ ...eduroam, skipCertValidation: true, anonymousIdentity: "anon@uni" }).eap).toEqual({
      identity: "j@uni",
      anonymous_identity: "anon@uni",
    });
  });

  it("reads status and its outcome", () => {
    expect(parseStatus(enc({ state: "wifi_connecting", detail: "" }))).toMatchObject({ state: "wifi_connecting", outcome: "pending", detail: null });
    expect(parseStatus(enc({ state: "registered", detail: "agent 42" }))).toMatchObject({ outcome: "success", detail: "agent 42" });
    expect(parseStatus(enc({ state: "login_failed:invalid_grant" }))).toMatchObject({
      state: "login_failed",
      reason: "invalid_grant",
      outcome: "failure",
    });
  });

  it("sends only the origin of the deployment", () => {
    expect(deploymentOrigin("https://go.arkitekt.live/lok/")).toBe("https://go.arkitekt.live");
    expect(deploymentOrigin("http://192.168.1.4:8080")).toBe("http://192.168.1.4:8080");
  });
});

describe("config size", () => {
  it("refuses a document larger than a device takes", () => {
    expect(() => frameConfig({ wifi: { ssid: "x", eap: { identity: "i", ca_pem: "A".repeat(17_000) } } })).toThrow(
      "at most 16384",
    );
  });
});

describe("the upload on a connection", () => {
  const gattWith = (maxWrite: number) => {
    const writes: Uint8Array[] = [];
    const gatt: GattConnection = {
      deviceId: "d",
      has: () => true,
      read: async () => new Uint8Array(),
      write: async (_s, _c, value) => {
        writes.push(value);
      },
      notify: async () => () => undefined,
      onDisconnected: () => () => undefined,
      disconnect: async () => undefined,
      connected: true,
      maxWrite,
    };
    return { gatt, writes };
  };

  it("fits the chunks to what the link takes, and they make up the document", async () => {
    const { gatt, writes } = gattWith(20);
    const config = { wifi: { ssid: "Lab", password: "longenough" }, origin: "https://go.arkitekt.live", key: "K".repeat(43) };
    await openProvisioningDevice(gatt).writeConfig(config);
    const chunks = writes.slice(1, -1);
    expect(chunks.every((c) => c.length <= 20)).toBe(true);
    const joined = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    chunks.reduce((at, c) => (joined.set(c, at), at + c.length), 0);
    expect(JSON.parse(dec(joined))).toEqual(config);
    expect(dec(writes[0])).toBe(`BEGIN ${joined.length}`);
    expect(dec(writes[writes.length - 1])).toBe(`COMMIT ${createHash("sha256").update(joined).digest("hex")}`);
  });

  it("refuses a device without provisioning v2", () => {
    const { gatt } = gattWith(180);
    expect(() => openProvisioningDevice({ ...gatt, has: () => false })).toThrow(DeviceProtocolError);
  });
});
