// Keeps R8's shrinking off in Android release builds.
//
// Expo's template turns it on from SDK 58, and it removes what it cannot see
// being used. PokketMeshModule loads GoMeshBackend with Class.forName and takes
// any failure to mean there is no mesh, so a shrunk release would report the
// mesh as unavailable with no error at all, and only in release builds. The Go
// library and WebRTC cross into Java the same way. Turning this on means keep
// rules for all of those first. Set here so that every build gets it: CI,
// `eas build`, and `expo run:android`.
const { withGradleProperties } = require("expo/config-plugins");

const KEY = "android.enableMinifyInReleaseBuilds";

module.exports = (config) =>
  withGradleProperties(config, (config) => {
    const props = config.modResults.filter((p) => !(p.type === "property" && p.key === KEY));
    props.push({ type: "property", key: KEY, value: "false" });
    config.modResults = props;
    return config;
  });
