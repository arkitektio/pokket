/* global jest */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Before anything imports the library: a test that loads a scene at the top would
// otherwise bind to the real native module, which has no binary under Jest.
require("react-native-gesture-handler/jestSetup");

// Reanimated registers its CSS event handler as it loads, and its JS stand-in for
// the native module (all it has under Jest) always throws on that one call.
jest.mock("react-native-reanimated/src/css/native/proxy", () => ({
  ...jest.requireActual("react-native-reanimated/src/css/native/proxy"),
  setCSSEventHandler: jest.fn(),
}));

// The native WebGPU module has no binary under Jest; the package ships a JS stand-in.
jest.mock("react-native-webgpu", () => require("react-native-webgpu/lib/module/mock"));

// The native clipboard has no binary under Jest: `ui.copy` writes into this.
jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(() => Promise.resolve(true)),
  getStringAsync: jest.fn(() => Promise.resolve("")),
}));

// What the app's root configures before anything renders (`app/_layout.tsx`): the
// bloks' native views, AsyncStorage and the clipboard for @arkitektio/bsx.
require("./lib/ports/blok/platform");
