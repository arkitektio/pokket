import { describe, expect, it, jest } from "@jest/globals";
import { SINGLE_PUT_LIMIT_BYTES, uploadRefusal, uploadToGrant } from "../upload";

const grant = {
  accessKey: "key",
  secretKey: "secret",
  sessionToken: "token",
  region: "us-east-1",
  expiresIn: 3600,
  maxBytes: 1000,
  bucket: "bigfiles",
  key: "a/b.tif",
};
const datalayer = { own: "http://store:9000", reached: "http://127.0.0.1:41000" };

const fileOf = (size: number, answer = { status: 200, body: "", headers: {} }) => ({
  size,
  upload: jest.fn(async (_url: string, _options: unknown) => answer),
});

describe("uploadToGrant", () => {
  it("puts the file where the store is reached, signed for the store's own host", async () => {
    const file = fileOf(10);
    await uploadToGrant(file as never, grant, datalayer, { contentType: "image/tiff" });

    const [url, options] = file.upload.mock.calls[0];
    expect(url.startsWith("http://127.0.0.1:41000/bigfiles/a/b.tif?")).toBe(true);
    expect(url).toContain("X-Amz-Security-Token=token");
    expect(options).toMatchObject({ httpMethod: "PUT", headers: { "Content-Type": "image/tiff" } });
  });

  it("signs for no longer than SigV4 allows, however long the grant runs", async () => {
    const file = fileOf(10);
    await uploadToGrant(file as never, { ...grant, expiresIn: 30 * 24 * 3600 }, datalayer);
    expect(file.upload.mock.calls[0][0]).toContain("X-Amz-Expires=604800");
  });

  it("reports progress as a fraction", async () => {
    const file = fileOf(10);
    file.upload.mockImplementation(async (_url, options) => {
      (options as { onProgress: (p: { bytesSent: number; totalBytes: number }) => void }).onProgress({ bytesSent: 5, totalBytes: 10 });
      return { status: 200, body: "", headers: {} };
    });
    const onProgress = jest.fn((_fraction: number) => undefined);
    await uploadToGrant(file as never, grant, datalayer, { onProgress });
    expect(onProgress).toHaveBeenCalledWith(0.5);
  });

  it("fails on anything but a success from the store", async () => {
    const file = fileOf(10, { status: 403, body: "<Error>AccessDenied</Error>", headers: {} });
    await expect(uploadToGrant(file as never, grant, datalayer)).rejects.toThrow("refused the file (403)");
  });

  it("does not send a file larger than the grant allows", async () => {
    const file = fileOf(1001);
    await expect(uploadToGrant(file as never, grant, datalayer)).rejects.toThrow("larger than");
    expect(file.upload).not.toHaveBeenCalled();
  });
});

describe("uploadRefusal", () => {
  it("lets through what fits", () => {
    expect(uploadRefusal(SINGLE_PUT_LIMIT_BYTES)).toBeNull();
    expect(uploadRefusal(1000, 1000)).toBeNull();
  });
  it("takes no limit from a grant that names none", () => {
    expect(uploadRefusal(10, 0)).toBeNull();
    expect(uploadRefusal(10, null)).toBeNull();
  });
  it("refuses what one PUT cannot carry, whatever the grant says", () => {
    expect(uploadRefusal(SINGLE_PUT_LIMIT_BYTES + 1, SINGLE_PUT_LIMIT_BYTES * 2)).toContain("the limit here");
  });
});
