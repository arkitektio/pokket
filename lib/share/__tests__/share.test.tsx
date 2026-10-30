import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { redirectSystemPath } from "@/app/+native-intent";
import { clearPendingLink, getPendingLink } from "@/lib/deeplink/pending";
import { discardSharedFiles, openSharedFile, sharedFiles, type SharedFile } from "../files";
import { clearPendingShare, isShareLink, rememberPendingShare, usePendingShare } from "../pending";
import { useShareUploads } from "../useShareUploads";

const mockDisk = new Map<string, number>();
const mockDeleted: string[] = [];

jest.mock("expo-file-system", () => ({
  File: class {
    uri: string;
    constructor(uri: string) {
      this.uri = uri;
    }
    get exists() {
      return mockDisk.has(this.uri);
    }
    get size() {
      return mockDisk.get(this.uri) ?? 0;
    }
    delete() {
      mockDeleted.push(this.uri);
    }
  },
}));

const payload = (over: object) => ({
  value: "content://media/1",
  shareType: "image",
  mimeType: "image/png",
  contentUri: "file:/data/cache/a.png",
  contentType: "image",
  contentMimeType: "image/png",
  originalName: "a.png",
  contentSize: 10,
  ...over,
});

describe("isShareLink", () => {
  it("knows the link of the share extension and the share intent", () => {
    expect(isShareLink("pokket://expo-sharing")).toBe(true);
    expect(isShareLink("orkestrator://expo-sharing/")).toBe(true);
    expect(isShareLink("POKKET://expo-sharing?x=1")).toBe(true);
  });
  it("leaves every other link alone", () => {
    expect(isShareLink("pokket://mikro/files/1")).toBe(false);
    expect(isShareLink("pokket://expo-sharing-other")).toBe(false);
    expect(isShareLink("https://expo-sharing")).toBe(false);
  });
});

describe("a share link arriving", () => {
  const seen: boolean[] = [];
  const Watch = () => {
    seen.push(usePendingShare());
    return null;
  };

  beforeEach(() => {
    seen.length = 0;
    clearPendingShare();
    clearPendingLink();
  });

  it("marks a share as pending and does not become a link to a page", () => {
    expect(redirectSystemPath({ path: "pokket://expo-sharing", initial: true })).toBe("/");
    expect(getPendingLink()).toBeNull();
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<Watch />);
    });
    expect(seen.at(-1)).toBe(true);
    act(() => renderer.unmount());
  });

  it("stays where it is while the app is running", () => {
    expect(redirectSystemPath({ path: "pokket://expo-sharing", initial: false })).toBe("");
    expect(getPendingLink()).toBeNull();
  });

  it("does not disturb a link to a page", () => {
    redirectSystemPath({ path: "pokket://mikro/files/1", initial: false });
    expect(getPendingLink()?.path).toBe("/mikro/files/1");
  });

  it("notifies who is waiting, and clears", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<Watch />);
    });
    expect(seen.at(-1)).toBe(false);
    act(() => rememberPendingShare());
    expect(seen.at(-1)).toBe(true);
    act(() => clearPendingShare());
    expect(seen.at(-1)).toBe(false);
    act(() => renderer.unmount());
  });
});

describe("sharedFiles", () => {
  it("makes a file of what can be uploaded", () => {
    expect(sharedFiles([payload({})] as never)).toEqual([
      { uri: "file:///data/cache/a.png", name: "a.png", size: 10, mimeType: "image/png" },
    ]);
  });
  it("leaves out text and web links", () => {
    const text = payload({ shareType: "text", contentType: "text", contentUri: null });
    const site = payload({ shareType: "url", contentType: "website", contentUri: "https://example.org" });
    expect(sharedFiles([text, site] as never)).toEqual([]);
  });
  it("leaves a proper uri alone", () => {
    expect(sharedFiles([payload({ contentUri: "file:///group/a.png" })] as never)[0].uri).toBe("file:///group/a.png");
  });
  it("falls back on the end of the uri for a name", () => {
    expect(sharedFiles([payload({ originalName: null, contentUri: "file:///group/a%20b.png" })] as never)[0].name).toBe("a b.png");
  });
});

describe("the copies on disk", () => {
  const shared = (uri: string): SharedFile => ({ uri, name: "a", size: 1, mimeType: null });

  beforeEach(() => {
    mockDisk.clear();
    mockDeleted.length = 0;
  });

  it("refuses a copy that is not there or is empty, as Android's failed copying leaves it", () => {
    mockDisk.set("file:///empty", 0);
    expect(() => openSharedFile(shared("file:///missing"))).toThrow("could not be read");
    expect(() => openSharedFile(shared("file:///empty"))).toThrow("could not be read");
  });

  it("removes only our own copies", () => {
    mockDisk.set("file:///a", 1);
    mockDisk.set("content://media/1", 1);
    discardSharedFiles([shared("file:///a"), shared("content://media/1"), shared("file:///gone")]);
    expect(mockDeleted).toEqual(["file:///a"]);
  });
});

describe("useShareUploads", () => {
  const files = ["a", "b", "c"].map((name): SharedFile => ({ uri: `file:///${name}`, name, size: 1, mimeType: null }));
  type Result = ReturnType<typeof useShareUploads>;

  const render = (send: Parameters<typeof useShareUploads>[1]) => {
    const current: { result: Result } = { result: undefined as never };
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

  it("sends one at a time and finishes", async () => {
    let inFlight = 0;
    let most = 0;
    const send = jest.fn(async () => {
      most = Math.max(most, ++inFlight);
      await Promise.resolve();
      inFlight -= 1;
    });
    const { current, renderer } = render(send);
    await act(async () => current.result.start());
    expect(send).toHaveBeenCalledTimes(3);
    expect(most).toBe(1);
    expect(current.result.allDone).toBe(true);
    expect(current.result.running).toBe(false);
    act(() => renderer.unmount());
  });

  it("keeps going past a failure, and a retry sends only what has not gone", async () => {
    let failing = true;
    const send = jest.fn(async (file: SharedFile) => {
      if (file.name === "b" && failing) throw new Error("no network");
    });
    const { current, renderer } = render(send);
    await act(async () => current.result.start());

    expect(send).toHaveBeenCalledTimes(3);
    expect(current.result.stateOf(files[1])).toEqual({ status: "failed", message: "no network" });
    expect(current.result.stateOf(files[2])).toEqual({ status: "done" });
    expect(current.result.allDone).toBe(false);
    expect(current.result.anyFailed).toBe(true);

    failing = false;
    send.mockClear();
    await act(async () => current.result.start());
    expect(send.mock.calls.map(([file]) => file.name)).toEqual(["b"]);
    expect(current.result.allDone).toBe(true);
    act(() => renderer.unmount());
  });

  it("shows how far a file has got", async () => {
    let release = () => {};
    const send = jest.fn(async (_file: SharedFile, { onProgress }: { onProgress?: (fraction: number) => void }) => {
      onProgress?.(0.25);
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    });
    const { current, renderer } = render(send);
    let run!: Promise<void>;
    await act(async () => {
      run = current.result.start();
      await Promise.resolve();
    });
    expect(current.result.stateOf(files[0])).toEqual({ status: "sending", fraction: 0.25 });
    expect(current.result.running).toBe(true);
    act(() => renderer.unmount());
    release();
    await run;
  });

  it("stops when the screen is left, and the rest are not sent", async () => {
    let release = () => {};
    let signal: AbortSignal | undefined;
    const send = jest.fn(async (_file: SharedFile, upload: { signal?: AbortSignal }) => {
      signal = upload.signal;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      throw new Error("aborted");
    });
    const { current, renderer } = render(send);
    let run!: Promise<void>;
    await act(async () => {
      run = current.result.start();
      await Promise.resolve();
    });
    act(() => renderer.unmount());
    expect(signal?.aborted).toBe(true);
    release();
    await run;
    expect(send).toHaveBeenCalledTimes(1);
  });
});
