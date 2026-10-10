// Config plugin for pokket's mesh sidecar (registered in app.json).
//
// Android: the mesh reaches services through reverse proxies on
// http://127.0.0.1:<port>, and some deployments advertise plain-http aliases
// on their LAN. Expo's template only allows cleartext in debug builds, so a
// release APK would refuse both ("CLEARTEXT communication not permitted").
// Cleartext is therefore allowed app-wide, in release too.
//
// iOS: the node probes the LAN for direct paths to peers, which raises the
// Local Network prompt; that needs a usage string. ATS already allows local
// networking in Expo's template; loopback gets an explicit exception on top.
const { withAndroidManifest, withInfoPlist } = require("expo/config-plugins");

const LOCAL_NETWORK_USAGE =
  "Orkestrator connects to your organisation's mesh, and looks for the machines on it on your local network to reach them directly.";

const withMeshAndroid = (config) =>
  withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application?.[0];
    if (app) {
      app.$["android:usesCleartextTraffic"] = "true";
    }
    return config;
  });

const withMeshIos = (config, { localNetworkUsage } = {}) =>
  withInfoPlist(config, (config) => {
    const plist = config.modResults;
    // Set, not defaulted: expo-dev-client puts its own "Expo Dev Launcher"
    // wording here, which would otherwise ship in release builds.
    plist.NSLocalNetworkUsageDescription = localNetworkUsage || LOCAL_NETWORK_USAGE;
    const ats = { ...(plist.NSAppTransportSecurity || {}) };
    ats.NSAllowsLocalNetworking = true;
    ats.NSExceptionDomains = {
      ...(ats.NSExceptionDomains || {}),
      localhost: { NSExceptionAllowsInsecureHTTPLoads: true },
    };
    plist.NSAppTransportSecurity = ats;
    return config;
  });

module.exports = (config, props = {}) => withMeshIos(withMeshAndroid(config), props);
