import { EnhancedManifest } from "../types";
import { FaktsEndpoint } from "./endpointSchema";
import { deviceAuthorization } from "./start";

/**
 * The credentials a provisioned device needs to complete its own grant.
 *
 * This is deliberately *not* a token. The device receives a device code that
 * has already been approved on its behalf, and exchanges it once at the token
 * endpoint for its access token, refresh token and rendered instances. A
 * sniffed blob is therefore useful for minutes, once, and only for the client
 * that was registered against this device's node id.
 */
export type DeviceProvisioningBlob = {
  /** Where the device runs its grant — the deployment's fakts base URL. */
  base_url: string;
  /** The public OAuth2 client registered for this device at authorization. */
  client_id: string;
  /** The full-entropy, single-use device code. Burned at first exchange. */
  device_code: string;
};

/**
 * The staged authorization for a device, before it has been approved.
 *
 * `user_code` never reaches the device: it is the proof-of-possession the
 * accept mutation requires, and it stays in Pokket.
 */
export type StagedDeviceAuthorization = {
  device_code: string;
  user_code: string;
  client_id: string;
  expires_in: number;
};

/**
 * The device's manifest, as read from its BLE `MANIFEST` characteristic.
 *
 * The firmware calls the field `device_id`; fakts calls the same thing
 * `node_id`. `stageDeviceAuthorization` is where the two names meet.
 */
export type BleDeviceManifest = {
  identifier: string;
  version: string;
  device_id: string;
  scopes?: string[];
  logo?: string;
  requirements: {
    key: string;
    service: string;
    description?: string;
    optional: boolean;
  }[];
};

/**
 * Stage an authorization *for a device we are holding*, not for ourselves.
 *
 * The manifest sent here is the device's own, so the client fakts registers is
 * the device's client: bound to its node id, carrying its requirements, and
 * scoped by its own manifest rather than Pokket's. Pokket is only the operator
 * driving the exchange.
 *
 * The device registers as an unattended agent — it is authorized once and then
 * runs on its own, which is exactly what the `agent` role describes.
 */
export const stageDeviceAuthorization = async ({
  endpoint,
  controller,
  manifest,
  expirationTime,
}: {
  endpoint: FaktsEndpoint;
  controller: AbortController;
  manifest: BleDeviceManifest;
  expirationTime?: number;
}): Promise<StagedDeviceAuthorization> => {
  const deviceManifest: EnhancedManifest = {
    identifier: manifest.identifier,
    version: manifest.version,
    scopes: manifest.scopes ?? [],
    logo: manifest.logo,
    requirements: manifest.requirements.map((requirement) => ({
      key: requirement.key,
      service: requirement.service,
      optional: requirement.optional,
    })),
    // The device's own stable hardware identity. Never the BLE peripheral id —
    // that is a per-install random UUID on iOS, so using it would register a
    // fresh Device row every time the same board is re-provisioned.
    node_id: manifest.device_id,
  };

  const authorization = await deviceAuthorization({
    endpoint,
    controller,
    manifest: deviceManifest,
    expirationTime,
    requestedClientKind: "development",
    requestedClientRole: "agent",
  });

  return {
    device_code: authorization.device_code,
    user_code: authorization.user_code,
    client_id: authorization.client_id,
    expires_in: authorization.expires_in,
  };
};

/**
 * Assemble what actually crosses the BLE link.
 *
 * `base_url` comes from the endpoint Pokket itself is connected to, so a device
 * always lands on the same deployment as the operator provisioning it.
 */
export const buildProvisioningBlob = ({
  endpoint,
  authorization,
}: {
  endpoint: FaktsEndpoint;
  authorization: StagedDeviceAuthorization;
}): DeviceProvisioningBlob => ({
  base_url: endpoint.base_url,
  client_id: authorization.client_id,
  device_code: authorization.device_code,
});
