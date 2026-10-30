/* global jest */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

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
