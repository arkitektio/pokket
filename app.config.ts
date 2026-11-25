import type { ConfigContext, ExpoConfig } from "expo/config";
import pkg from "./package.json";

/**
 * app.json holds the app's static config; this adds what has to be computed.
 *
 * - `version` comes from package.json, which semantic-release bumps on every
 *   release — app.json's own number was never updated, so every build
 *   claimed to be 1.0.0.
 * - Android's `versionCode` is that version as one number (1.19.0 is
 *   1019000). Google Play refuses an upload whose versionCode is not higher
 *   than the last one's, and semantic-release only ever counts up.
 * - Over-the-air updates come from our own Expo Updates server,
 *   updates.arkitekt.live (scripts/ci/publish-update.sh publishes them). A
 *   release publishes its JS to the channel its builds were made for
 *   (eas.json). Updates are code-signed: the app takes only those that verify
 *   against certs/certificate.pem, whose private key stays on the server; a
 *   new certificate means a new binary. The runtime version is the
 *   native fingerprint, so an update only ever reaches binaries whose native
 *   side it was built against; a release that changes native code (a new
 *   module, the mesh's Go sources) needs a new build, and older apps simply
 *   keep what they have.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const [major, minor, patch] = pkg.version.split(".").map(Number);
  return {
    ...config,
    name: config.name ?? "pokket",
    slug: config.slug ?? "pokket",
    version: pkg.version,
    android: { ...config.android, versionCode: major * 1_000_000 + minor * 1_000 + patch },
    // The native fingerprint. `POKKET_RUNTIME_VERSION` hands in that same value computed once
    // (`expo-updates fingerprint:generate`): Metro otherwise hashes the native sources again for
    // every manifest it serves, which with a prebuilt ios/ takes longer than the 10 s a
    // development build waits for one (scripts/ci/mesh-e2e-lib.sh). Never set for a build.
    runtimeVersion: process.env.POKKET_RUNTIME_VERSION || { policy: "fingerprint" },
    updates: {
      url: "https://updates.arkitekt.live/api/manifest",
      // Check on every launch, apply on the next one (or at once, from the
      // prompt in lib/updates) — never block startup on the network.
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 0,
      // Updates are signed; the app refuses any that don't verify against this.
      codeSigningCertificate: "./certs/certificate.pem",
      codeSigningMetadata: { keyid: "main", alg: "rsa-v1_5-sha256" },
    },
  };
};
