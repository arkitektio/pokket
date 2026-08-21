import { z } from "zod";
import { EnhancedManifest } from "../types";
import { FaktsEndpoint } from "./endpointSchema";

/**
 * The app authorization response: RFC 8628 device authorization plus fakts'
 * dynamic client registration — the `client_id` is minted here, from the
 * manifest, and is unusable until a human approves the code.
 */
export const DeviceAuthorizationSchema = z.object({
  status: z.string(),
  /** Full-entropy polling secret — never shown to the user. */
  device_code: z.string(),
  /** Short, human-transcribable code; what the configure URL carries. */
  user_code: z.string(),
  client_id: z.string(),
  token_endpoint: z.string().url(),
  verification_uri: z.string().url(),
  verification_uri_complete: z.string().url(),
  expires_in: z.number(),
  interval: z.number(),
});

export type DeviceAuthorization = z.infer<typeof DeviceAuthorizationSchema>;

/**
 * The client kinds the fakts server knows (`ClientKindVanilla`). Sending
 * anything else is rejected at the authorization endpoint, so the union is
 * spelled out here rather than left as a bare string.
 */
export type RequestedClientKind =
  | "website"
  | "development"
  | "desktop"
  | "hub"
  | "relying_party";

/** The operational role of the client, orthogonal to its kind. */
export type RequestedClientRole = "interface" | "agent";

export const deviceAuthorization = async ({
  endpoint,
  controller,
  manifest,
  expirationTime,
  requestedClientKind = "desktop",
  requestedClientRole = "interface",
}: {
  endpoint: FaktsEndpoint;
  controller: AbortController;
  manifest: EnhancedManifest;
  expirationTime?: number;
  requestedClientKind?: RequestedClientKind;
  requestedClientRole?: RequestedClientRole;
}): Promise<DeviceAuthorization> => {
  const response = await fetch(endpoint.device_authorization_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      manifest,
      expiration_time_seconds: expirationTime,
      // The kind is a label on the registered client (the grant is the same
      // either way). Pokket itself registers as `desktop` — a public client
      // driven by a human; the ESP32s it provisions register as unattended
      // `development`/`agent` clients.
      requested_client_kind: requestedClientKind,
      requested_client_role: requestedClientRole,
    }),
    signal: controller.signal,
  });

  const json = await response.json();

  if (!response.ok || json.status !== "granted") {
    throw new Error(
      json.error || json.message || "Device authorization was refused",
    );
  }

  const parsed = DeviceAuthorizationSchema.safeParse(json);
  if (!parsed.success) {
    console.error("Malformed device authorization response", parsed.error, json);
    throw new Error("Malformed device authorization response");
  }

  return parsed.data;
};
