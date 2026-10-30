import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  FinishBigfileUploadDocument,
  FromFileLikeDocument,
  RequestBigfileUploadDocument,
} from "../../api/graphql";
import { uploadFileToMikro } from "../upload";

jest.mock("sonner-native", () => ({ toast: { error: jest.fn() } }));

const datalayer = { own: "http://store:9000", reached: "http://store:9000" };
const grant = {
  accessKey: "key",
  secretKey: "secret",
  sessionToken: "token",
  region: "us-east-1",
  expiresIn: 3600,
  maxBytes: 1000,
  bucket: "bigfiles",
  key: "a/b.tif",
  store: "store-1",
};

const steps: string[] = [];

const clientWith = (answers: Partial<{ grant: typeof grant | null; created: object | null }> = {}) => {
  const mutate = jest.fn(async ({ mutation }: { mutation: unknown; variables: unknown }) => {
    if (mutation === RequestBigfileUploadDocument) {
      steps.push("request");
      return { data: { requestBigfileUpload: answers.grant === undefined ? grant : answers.grant } };
    }
    if (mutation === FinishBigfileUploadDocument) {
      steps.push("finish");
      return { data: { finishBigfileUpload: { id: "store-1" } } };
    }
    if (mutation === FromFileLikeDocument) {
      steps.push("create");
      return { data: { fromFileLike: answers.created === undefined ? { id: "f1", name: "b.tif" } : answers.created } };
    }
    throw new Error("Not asked for in this test");
  });
  const refetchQueries = jest.fn(async (_options: unknown) => {
    steps.push("refetch");
  });
  return { mutate, refetchQueries };
};

const fileOf = (status = 200, size = 10) => ({
  size,
  upload: jest.fn(async () => {
    steps.push("put");
    return { status, body: "", headers: {} };
  }),
});

const variablesOf = (client: ReturnType<typeof clientWith>, document: unknown) =>
  client.mutate.mock.calls.find(([options]) => options.mutation === document)?.[0].variables;

describe("uploadFileToMikro", () => {
  beforeEach(() => {
    steps.length = 0;
  });

  it("asks for a grant, sends the bytes, finishes the store and makes a file of it, in that order", async () => {
    const client = clientWith();
    const created = await uploadFileToMikro(
      { file: fileOf() as never, name: "b.tif", contentType: "image/tiff", folder: "folder-1" },
      client as never,
      datalayer,
    );

    expect(steps).toEqual(["request", "put", "finish", "create", "refetch"]);
    expect(created).toEqual({ id: "f1", name: "b.tif" });
    expect(variablesOf(client, RequestBigfileUploadDocument)).toEqual({
      input: { originalFileName: "b.tif", fileSize: 10, contentType: "image/tiff" },
    });
    expect(variablesOf(client, FinishBigfileUploadDocument)).toEqual({ input: { storeId: "store-1" } });
    expect(variablesOf(client, FromFileLikeDocument)).toEqual({ file: "store-1", name: "b.tif", folder: "folder-1" });
  });

  it("makes no file when the bytes did not arrive", async () => {
    const client = clientWith();
    await expect(uploadFileToMikro({ file: fileOf(500) as never, name: "b.tif" }, client as never, datalayer)).rejects.toThrow("500");
    expect(steps).toEqual(["request", "put"]);
  });

  it("asks for no grant for a file one upload cannot carry", async () => {
    const client = clientWith();
    const file = fileOf(200, 6 * 1024 ** 3);
    await expect(uploadFileToMikro({ file: file as never, name: "b.tif" }, client as never, datalayer)).rejects.toThrow("the limit here");
    expect(steps).toEqual([]);
  });

  it("says so when mikro gives no grant", async () => {
    const client = clientWith({ grant: null });
    await expect(uploadFileToMikro({ file: fileOf() as never, name: "b.tif" }, client as never, datalayer)).rejects.toThrow("no upload grant");
    expect(steps).toEqual(["request"]);
  });

  it("says so when mikro makes no file", async () => {
    const client = clientWith({ created: null });
    await expect(uploadFileToMikro({ file: fileOf() as never, name: "b.tif" }, client as never, datalayer)).rejects.toThrow("made no file");
  });
});
