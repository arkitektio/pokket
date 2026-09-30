/**
 * What counts as "native" for the runtime version (app.config.ts): Expo's
 * defaults, plus the mesh sidecar's Go sources. Those are native code too —
 * CI compiles them into the app — but they sit outside every directory the
 * fingerprint reads, so without this a Go-only release would ship its JS to
 * apps still running the old mesh. Their compiled output is ignored instead
 * (.fingerprintignore): not reproducible byte for byte.
 */
const { SourceSkips } = require("expo/fingerprint");

/** @type {import('expo/fingerprint').Config} */
const config = {
  // The app's version is package.json's, which semantic-release bumps on
  // every release (app.config.ts). It is not native: counting it would give
  // every release a new runtime version, so none could ever be delivered
  // over the air, and every release would need new binaries.
  sourceSkips: SourceSkips.ExpoConfigVersions,
  extraSources: [
    {
      type: "dir",
      filePath: "modules/pokket-mesh/go",
      reasons: ["pokket-mesh Go sources (compiled into the app by scripts/build-mesh-mobile.sh)"],
    },
  ],
};

module.exports = config;
