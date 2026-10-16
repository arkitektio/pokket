// Android 8.0 (API 26) is the oldest Android this app builds for.
//
// react-native-webgpu (3D views) shares frames with the GPU through
// AHardwareBuffer, which Android has from API 26; its C++ does not compile
// for the template's default of 24. Expo's autolinking reads the minimum
// from `android.minSdkVersion` in gradle.properties, as expo-build-properties
// would set it.
const { withGradleProperties } = require("expo/config-plugins");

const MIN_SDK = "26";

module.exports = (config) =>
  withGradleProperties(config, (config) => {
    const props = config.modResults.filter((p) => !(p.type === "property" && p.key === "android.minSdkVersion"));
    props.push({ type: "property", key: "android.minSdkVersion", value: MIN_SDK });
    config.modResults = props;
    return config;
  });
