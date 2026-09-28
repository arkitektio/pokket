import { describe, expect, it } from "@jest/globals";
import { meshAliases, meshNeeded, onMesh } from "../meshNeed";
import type { ProfileMesh } from "../record";
import { fakts } from "@/lib/testing/meshFixtures";

const mesh: ProfileMesh = { id: "m1", label: "Test", controlUrl: "https://mesh.go.test", hosts: [], enabled: true };

const cases: [string, boolean][] = [
  ["mikro.mesh.go.test", true], // under the control server's domain
  ["MIKRO.mesh.go.test.", true],
  ["mesh.go.test", false], // the control server itself is direct
  ["mikro.go.test", false],
  ["100.64.0.1", true],
  ["100.127.255.254", true],
  ["100.128.0.1", false],
  ["fd7a:115c:a1e0::1", true],
  ["x.ts.net", true],
  ["mikro", false], // a bare label is a docker/LAN name
  ["192.168.1.10", false],
];

describe("onMesh", () => {
  it.each(cases)("%s -> %s", (host, expected) => {
    expect(onMesh(host, mesh)).toBe(expected);
  });

  it("counts pinned hosts and the MagicDNS suffix", () => {
    expect(onMesh("lab-pc", { ...mesh, hosts: ["lab-pc"] })).toBe(true);
    expect(onMesh("mikro.tail.example", { ...mesh, magicDnsSuffix: "tail.example" })).toBe(true);
  });
});

describe("meshAliases / meshNeeded", () => {
  it("lists the session's addresses on the mesh", () => {
    expect(meshAliases(fakts, mesh)).toEqual(["mikro.mesh.go.test", "100.64.1.2"]);
    expect(meshNeeded(fakts, mesh)).toBe(true);
  });

  it("is not needed without a mesh or on-mesh aliases", () => {
    expect(meshNeeded(fakts, undefined)).toBe(false);
    expect(meshNeeded({ ...fakts, instances: {} }, mesh)).toBe(false);
  });
});
