import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import type { SharedFile } from "../files";
import { startUploadService, stopUploadService, updateUploadService } from "../uploadService";
import { useShareUploads } from "../useShareUploads";

jest.mock("../uploadService", () => ({
  startUploadService: jest.fn(async () => undefined),
  updateUploadService: jest.fn(),
  stopUploadService: jest.fn(),
}));

const start = startUploadService as unknown as jest.Mock;
const update = updateUploadService as unknown as jest.Mock;
const stop = stopUploadService as unknown as jest.Mock;

const filesOf = (...names: string[]) =>
  names.map((name): SharedFile => ({ uri: `file:///${name}`, name, size: 1, mimeType: null }));

const render = (files: SharedFile[], send: Parameters<typeof useShareUploads>[1]) => {
  const current: { result: ReturnType<typeof useShareUploads> } = { result: undefined as never };
  const Host = () => {
    current.result = useShareUploads(files, send);
    return null;
  };
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<Host />);
  });
  return { current, renderer };
};

describe("an upload and its service", () => {
  beforeEach(() => {
    start.mockClear();
    update.mockClear();
    stop.mockClear();
  });

  it("runs the service for as long as the files are going, and says how they went", async () => {
    const order: string[] = [];
    start.mockImplementationOnce(async () => void order.push("start"));
    stop.mockImplementationOnce(() => void order.push("stop"));
    const send = jest.fn(async (_file: SharedFile, { onProgress }: { onProgress?: (fraction: number) => void }) => {
      order.push("send");
      onProgress?.(0.5);
    });
    const { current, renderer } = render(filesOf("a", "b"), send);
    await act(async () => current.result.start());

    expect(order).toEqual(["start", "send", "send", "stop"]);
    expect(update).toHaveBeenCalledWith("1 of 2: a", 0.5);
    expect(update).toHaveBeenCalledWith("2 of 2: b", 0);
    expect(stop).toHaveBeenCalledWith("2 files uploaded.");
    act(() => renderer.unmount());
  });

  it("leaves out the count for one file", async () => {
    const { current, renderer } = render(filesOf("a"), jest.fn(async () => undefined));
    await act(async () => current.result.start());
    expect(update).toHaveBeenCalledWith("a", 0);
    expect(stop).toHaveBeenCalledWith("File uploaded.");
    act(() => renderer.unmount());
  });

  it("says when files did not make it", async () => {
    const send = jest.fn(async (file: SharedFile) => {
      if (file.name === "b") throw new Error("no network");
    });
    const { current, renderer } = render(filesOf("a", "b"), send);
    await act(async () => current.result.start());
    expect(stop).toHaveBeenCalledWith("1 of 2 files did not upload. Open Orkestrator to try again.");
    act(() => renderer.unmount());
  });

  it("stops without a word when the screen is left", async () => {
    let release = () => {};
    const send = jest.fn(async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    });
    const { current, renderer } = render(filesOf("a", "b"), send);
    let run!: Promise<void>;
    await act(async () => {
      run = current.result.start();
      await Promise.resolve();
    });
    act(() => renderer.unmount());
    release();
    await run;
    expect(send).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledWith(null);
  });
});
