import { describe, expect, it, jest } from "@jest/globals";
import { findStandingMandate } from "../standing";

const AGENT = "live.arkitekt.orkestrator";
const mandate = (over: Partial<Parameters<typeof findStandingMandate>[0][number]> = {}) => ({
  id: "m",
  agentIdentifier: AGENT,
  claimant: "AGENT",
  allowMesh: true,
  subject: { identifier: "live.arkitekt.esp32" },
  parent: null,
  ...over,
});

describe("findStandingMandate", () => {
  it("finds this app's parentless agent mandate for the firmware", () => {
    const found = findStandingMandate(
      [
        mandate({ id: "child", parent: { id: "p" } }),
        mandate({ id: "pokket", agentIdentifier: "live.arkitekt.pokket" }),
        mandate({ id: "keyed", claimant: "KEY", agentIdentifier: null }),
        mandate({ id: "other-app", subject: { identifier: "live.arkitekt.other" } }),
        mandate({ id: "no-mesh", allowMesh: false }),
        mandate({ id: "standing" }),
      ],
      AGENT,
      "live.arkitekt.esp32",
      true,
    );
    expect(found?.id).toBe("standing");
  });

  it("does not reuse a mandate whose devices may not join the mesh for ones that may, or the other way", () => {
    const mandates = [mandate({ id: "no-mesh", allowMesh: false })];
    expect(findStandingMandate(mandates, AGENT, "live.arkitekt.esp32", true)).toBeUndefined();
    expect(findStandingMandate(mandates, AGENT, "live.arkitekt.esp32", false)?.id).toBe("no-mesh");
  });

  it("finds nothing to reuse when there is none", () => {
    expect(findStandingMandate([], AGENT, "live.arkitekt.esp32", true)).toBeUndefined();
  });
});

describe("a standing mandate covers the device", () => {
  const wanted = {
    version: "1",
    scopes: ["openid"],
    requirements: [{ key: "rekuest", service: "live.arkitekt.rekuest" }],
  };
  const subject = {
    identifier: "live.arkitekt.esp32",
    version: "1",
    scopes: ["openid"],
    requirements: [{ key: "rekuest", service: "live.arkitekt.rekuest" }],
  };

  it("passes over one made for less, so the device's key is not refused at login", () => {
    const found = findStandingMandate(
      [
        mandate({ id: "no-scopes", subject: { ...subject, scopes: [] } }),
        mandate({ id: "no-rekuest", subject: { ...subject, requirements: [] } }),
        mandate({ id: "old-version", subject: { ...subject, version: "0" } }),
        mandate({ id: "covers", subject: { ...subject, scopes: ["openid", "read"] } }),
      ],
      AGENT,
      "live.arkitekt.esp32",
      true,
      wanted,
    );
    expect(found?.id).toBe("covers");
  });

  it("finds none when none covers it: a new one is made", () => {
    const found = findStandingMandate([mandate({ subject: { ...subject, scopes: [] } })], AGENT, "live.arkitekt.esp32", true, wanted);
    expect(found).toBeUndefined();
  });
});
