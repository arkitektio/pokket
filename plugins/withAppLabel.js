// The name under the icon on Android.
//
// The app is called Orkestrator, but `name` in app.json has to stay "pokket":
// Expo also names the Xcode project, its scheme and the built .app after it,
// and CI builds those by name. iOS takes its label from CFBundleDisplayName
// (app.json); Android takes it from the `app_name` string, which Expo fills
// from `name`. This sets that one string.
const { withStringsXml } = require("expo/config-plugins");

const LABEL = "Orkestrator";

module.exports = (config) =>
  withStringsXml(config, (config) => {
    const strings = config.modResults.resources.string ?? [];
    const others = strings.filter((entry) => entry.$.name !== "app_name");
    config.modResults.resources.string = [{ $: { name: "app_name" }, _: LABEL }, ...others];
    return config;
  });
