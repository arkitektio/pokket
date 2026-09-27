// Shared fixtures for the fakts and mesh tests (not a test file itself).
import { FaktsEndpointSchema } from "@/lib/arkitekt/fakts/endpointSchema";
import { ActiveFaktsSchema } from "@/lib/arkitekt/fakts/faktsSchema";

export const endpoint = FaktsEndpointSchema.parse({
  name: "Test",
  version: "1",
  protocol_version: "2",
  base_url: "https://go.test/lok/f/",
  device_authorization_endpoint: "https://go.test/lok/o/app-authorization/",
  token_endpoint: "https://go.test/lok/o/token/",
  mesh_coord_url: "https://mesh.go.test",
});

export const publicAlias = { id: "pub", host: "mikro.go.test", ssl: true, challenge: "ht" };
export const meshAlias = { id: "mesh", host: "mikro.mesh.go.test", port: 8080, ssl: false, challenge: "ht" };

export const fakts = ActiveFaktsSchema.parse({
  self: {
    deployment_name: "d",
    alias: { id: "self", host: "go.test", ssl: true, path: "lok", challenge: "ht" },
    sub: "1",
  },
  instances: {
    mikro: { identifier: "1", service: "live.arkitekt.mikro", aliases: [publicAlias, meshAlias] },
    rekuest: {
      identifier: "2",
      service: "live.arkitekt.rekuest",
      aliases: [{ id: "a", host: "100.64.1.2", ssl: false, challenge: "ht" }],
    },
  },
});

export const grantJson = {
  access_token: "a",
  token_type: "Bearer",
  refresh_token: "r",
  client_id: "c",
  ...fakts,
};
