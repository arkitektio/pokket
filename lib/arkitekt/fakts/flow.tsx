import { EnhancedManifest, WindowPopper } from "../types";
import { FaktsEndpoint } from "./endpointSchema";
import { GrantResult, pollToken } from "./pollToken";
import { popOutWindowOpen } from "./popout";
import { deviceAuthorization } from "./start";

/**
 * The canonical fakts grant: register + stage a device code, let a human
 * approve it, then poll the OAuth2 token endpoint once. Tokens and the
 * rendered service instances come back together in that single response —
 * there is no separate claim or client_credentials trip any more.
 */
export const flow = async ({
  endpoint,
  controller,
  manifest,
  windowPopper,
  expirationTime,
  requestMeshKey = false,
}: {
  endpoint: FaktsEndpoint;
  controller: AbortController;
  manifest: EnhancedManifest;
  windowPopper: WindowPopper;
  expirationTime?: number;
  /**
   * Whether this app can join a mesh and wants a key for it (the provider's
   * `mesh` integration decides: sidecar present, mesh not switched off).
   */
  requestMeshKey?: boolean;
}): Promise<GrantResult> => {
  // 1. Device authorization (also dynamically registers our public client).
  //    A deployment with a mesh is asked for a one-shot key when the app
  //    wants one. Whether one comes back is the approver's call.
  const authorization = await deviceAuthorization({
    endpoint,
    controller,
    manifest,
    expirationTime,
    requestAuthKey: !!endpoint.mesh_coord_url && requestMeshKey,
  });

  // 2. Open the configure page for the human
  const handle = await popOutWindowOpen({
    verificationUri: authorization.verification_uri_complete,
    windowPopper,
  });

  // 3. Poll the token endpoint until approved → tokens + instances (+ the
  //    mesh key, if lok minted one)
  try {
    return await pollToken({
      tokenEndpoint: authorization.token_endpoint,
      deviceCode: authorization.device_code,
      clientId: authorization.client_id,
      controller,
      interval: authorization.interval,
      expiresIn: authorization.expires_in,
    });
  } finally {
    await handle?.close();
  }
};
