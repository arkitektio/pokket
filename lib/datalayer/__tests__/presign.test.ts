import { describe, expect, it } from "@jest/globals";
import { presignUrl, splitUrl } from "../presign";

// The worked example of AWS's "Authenticating Requests: Using Query Parameters".
const example = {
  url: "https://examplebucket.s3.amazonaws.com/test.txt",
  credentials: {
    accessKey: "AKIAIOSFODNN7EXAMPLE",
    secretKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    region: "us-east-1",
  },
  at: new Date("2013-05-24T00:00:00Z"),
  expiresSeconds: 86400,
};

describe("presignUrl", () => {
  it("signs AWS's published example", () => {
    expect(presignUrl(example)).toBe(
      "https://examplebucket.s3.amazonaws.com/test.txt" +
        "?X-Amz-Algorithm=AWS4-HMAC-SHA256" +
        "&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request" +
        "&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host" +
        "&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404",
    );
  });

  it("keeps the signature when the store is reached somewhere else", () => {
    const direct = presignUrl(example);
    const forwarded = presignUrl(example, "http://127.0.0.1:41000");
    expect(forwarded.startsWith("http://127.0.0.1:41000/test.txt?")).toBe(true);
    expect(forwarded.split("?")[1]).toBe(direct.split("?")[1]);
  });

  it("carries a session token only when there is one", () => {
    expect(presignUrl(example)).not.toContain("X-Amz-Security-Token");
    const withToken = presignUrl({ ...example, credentials: { ...example.credentials, sessionToken: "a/b+c" } });
    expect(withToken).toContain("X-Amz-Security-Token=a%2Fb%2Bc");
  });

  it("encodes each path segment once", () => {
    const url = presignUrl({ ...example, url: "http://store:9000/media/a b/ü(1).png" });
    expect(url.startsWith("http://store:9000/media/a%20b/%C3%BC%281%29.png?")).toBe(true);
    const again = presignUrl({ ...example, url: "http://store:9000/media/a%20b/%C3%BC%281%29.png" });
    expect(again).toBe(url);
  });
});

describe("splitUrl", () => {
  it("keeps the port in the host", () => {
    expect(splitUrl("http://store:9000/media/x.png?y=1")).toEqual({
      origin: "http://store:9000",
      host: "store:9000",
      path: "/media/x.png",
    });
  });
  it("refuses a relative url", () => {
    expect(() => splitUrl("/media/x.png")).toThrow();
  });
});
