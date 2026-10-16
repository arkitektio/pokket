const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname)

// 3D scenes draw with three's WebGPU renderer on react-native-webgpu. Bare
// `three` (what three's addons and R3F import) is the WebGPU build, so there is
// one copy of three in the bundle, and R3F is its web bundle: its React Native
// entry is the expo-gl path, which this app does not use.
const threeWebGPU = require.resolve("three/webgpu");

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "three" || moduleName === "three/webgpu") {
    return { type: "sourceFile", filePath: threeWebGPU };
  }
  if (platform !== "web" && moduleName === "@react-three/fiber") {
    return context.resolveRequest(
      { ...context, unstable_conditionNames: ["module"], mainFields: ["module"] },
      moduleName,
      platform,
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' , inlineRem: 16})
