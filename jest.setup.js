/* global jest */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// The native WebGPU module has no binary under Jest; the package ships a JS stand-in.
jest.mock("react-native-webgpu", () => require("react-native-webgpu/lib/module/mock"));
