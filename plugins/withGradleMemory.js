// Gives Gradle enough memory for a release build of this app.
//
// Expo's template caps the Gradle daemon's Metaspace at 512 MB. A release
// build of pokket (R8, Hermes, the mesh's Go library, WebRTC, MapLibre) runs
// past that, and the daemon does not fail: it throws OutOfMemoryError:
// Metaspace in a loop and hangs, which is how two releases sat for six hours
// until GitHub cancelled them. Set here so that every build gets it: CI,
// `eas build`, and `expo run:android`.
const { withGradleProperties } = require("expo/config-plugins");

const JVM_ARGS = "-Xmx6g -XX:MaxMetaspaceSize=1g -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8";

module.exports = (config) =>
  withGradleProperties(config, (config) => {
    const props = config.modResults.filter((p) => !(p.type === "property" && p.key === "org.gradle.jvmargs"));
    props.push({ type: "property", key: "org.gradle.jvmargs", value: JVM_ARGS });
    config.modResults = props;
    return config;
  });
