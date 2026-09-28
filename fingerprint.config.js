/**
 * What counts as "native" for the runtime version (app.config.ts): Expo's
 * defaults, plus the mesh sidecar's Go sources. Those are native code too —
 * CI compiles them into the app — but they sit outside every directory the
 * fingerprint reads, so without this a Go-only release would ship its JS to
 * apps still running the old mesh. Their compiled output is ignored instead
 * (.fingerprintignore): not reproducible byte for byte.
 */
/** @type {import('expo/fingerprint').Config} */
const config = {
  extraSources: [
    {
      type: "dir",
      filePath: "modules/pokket-mesh/go",
      reasons: ["pokket-mesh Go sources (compiled into the app by scripts/build-mesh-mobile.sh)"],
    },
  ],
};

module.exports = config;
