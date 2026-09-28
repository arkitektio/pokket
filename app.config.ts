import type { ConfigContext, ExpoConfig } from "expo/config";
import pkg from "./package.json";

/**
 * app.json holds the app's static config; this adds what has to be computed.
 *
 * - `version` comes from package.json, which semantic-release bumps on every
 *   release — app.json's own number was never updated, so every build
 *   claimed to be 1.0.0.
 * - Over-the-air updates (EAS Update): a release publishes its JS to the
 *   channel its builds were made for (eas.json). The runtime version is the
 *   native fingerprint, so an update only ever reaches binaries whose native
 *   side it was built against; a release that changes native code (a new
 *   module, the mesh's Go sources) needs a new build, and older apps simply
 *   keep what they have.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const projectId = config.extra?.eas?.projectId as string;
  return {
    ...config,
    name: config.name ?? "pokket",
    slug: config.slug ?? "pokket",
    version: pkg.version,
    runtimeVersion: { policy: "fingerprint" },
    updates: {
      url: `https://u.expo.dev/${projectId}`,
      // Check on every launch, apply on the next one (or at once, from the
      // prompt in lib/updates) — never block startup on the network.
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 0,
    },
  };
};
