import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as Notifications from "expo-notifications";
import { AppRegistry, AppState, Platform } from "react-native";
import { startUploadService, stopUploadService, updateUploadService } from "../uploadService";

const mockNative = {
  start: jest.fn((_text: string) => undefined),
  update: jest.fn((_text: string, _fraction: number) => undefined),
  stop: jest.fn((_summary: string | null) => undefined),
};

jest.mock("@/modules/pokket-upload", () => ({
  UPLOAD_TASK_KEY: "PokketUpload",
  get uploadNative() {
    return mockNative;
  },
}));

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}));

const permissions = Notifications.getPermissionsAsync as unknown as jest.Mock<() => Promise<object>>;
const request = Notifications.requestPermissionsAsync as unknown as jest.Mock<() => Promise<object>>;

describe("the upload service", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    Object.values(mockNative).forEach((mock) => mock.mockReset());
    permissions.mockReset();
    request.mockReset();
    permissions.mockResolvedValue({ status: "granted", canAskAgain: true });
    request.mockResolvedValue({ status: "granted" });
    Platform.OS = "android";
    AppState.currentState = "active";
  });

  it("registers the task the native side holds open", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    AppRegistry.startHeadlessTask(1, "PokketUpload", {});
    expect(warn).not.toHaveBeenCalled();
  });

  describe("asking to show progress", () => {
    it("asks when it has not been allowed and still can", async () => {
      permissions.mockResolvedValue({ status: "undetermined", canAskAgain: true });
      await startUploadService();
      expect(request).toHaveBeenCalledTimes(1);
      expect(mockNative.start).toHaveBeenCalledTimes(1);
    });

    it("does not nag someone who said no, and starts anyway", async () => {
      permissions.mockResolvedValue({ status: "denied", canAskAgain: false });
      await startUploadService();
      expect(request).not.toHaveBeenCalled();
      expect(mockNative.start).toHaveBeenCalledTimes(1);
    });

    it("starts even when asking fails", async () => {
      jest.spyOn(console, "warn").mockImplementation(() => undefined);
      permissions.mockRejectedValue(new Error("no"));
      await startUploadService();
      expect(mockNative.start).toHaveBeenCalledTimes(1);
    });

    it("does not ask on iOS", async () => {
      Platform.OS = "ios";
      await startUploadService();
      expect(permissions).not.toHaveBeenCalled();
    });
  });

  it("never lets the service get in the way of the upload", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const broken = () => {
      throw new Error("refused");
    };
    mockNative.start.mockImplementation(broken);
    mockNative.update.mockImplementation(broken);
    mockNative.stop.mockImplementation(broken);
    await expect(startUploadService()).resolves.toBeUndefined();
    expect(() => updateUploadService("a", 0.5)).not.toThrow();
    expect(() => stopUploadService("done")).not.toThrow();
  });

  it("shows a new file at once, and its progress about once a second", async () => {
    const now = jest.spyOn(Date, "now");
    await startUploadService();
    now.mockReturnValue(10_000);
    updateUploadService("a", 0);
    now.mockReturnValue(10_100);
    updateUploadService("a", 0.1);
    now.mockReturnValue(10_200);
    updateUploadService("b", 0);
    now.mockReturnValue(11_300);
    updateUploadService("b", 0.5);
    expect(mockNative.update.mock.calls).toEqual([
      ["a", 0],
      ["b", 0],
      ["b", 0.5],
    ]);
  });

  it("only leaves a summary behind for someone who is not looking", () => {
    stopUploadService("3 files uploaded.");
    expect(mockNative.stop).toHaveBeenLastCalledWith(null);
    AppState.currentState = "background";
    stopUploadService("3 files uploaded.");
    expect(mockNative.stop).toHaveBeenLastCalledWith("3 files uploaded.");
    stopUploadService();
    expect(mockNative.stop).toHaveBeenLastCalledWith(null);
  });
});
