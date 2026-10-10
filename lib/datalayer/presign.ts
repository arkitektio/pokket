import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";

/**
 * SigV4 presigned GET urls for datalayer objects, as orkestrator's
 * `core/data/zarr/runner/s3-request.ts` makes them. A presigned url carries
 * its signature in the query, so an `<Image>` or a download can fetch it with
 * no headers of its own.
 *
 * Synchronous on purpose: Hermes has no `crypto.subtle`.
 */
export type S3Credentials = {
  accessKey: string;
  secretKey: string;
  /** Empty when the datalayer hands out static credentials. */
  sessionToken?: string | null;
  region?: string | null;
};

export type PresignInput = {
  /** The object as the store knows it: its own scheme, host and path. */
  url: string;
  credentials: S3Credentials;
  /** When the signature starts being valid. */
  at: Date;
  expiresSeconds: number;
};

/** What MinIO and the datalayer answer to when a grant names no region. */
const DEFAULT_REGION = "us-east-1";

const encodeRfc3986 = (value: string): string =>
  encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/** Each path segment encoded once, as S3 wants (other services encode twice). */
const canonicalPath = (pathname: string): string =>
  pathname
    .split("/")
    .map((segment) => {
      try {
        return encodeRfc3986(decodeURIComponent(segment));
      } catch {
        return encodeRfc3986(segment);
      }
    })
    .join("/");

const amzTimestamp = (at: Date): string => at.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** `scheme://host[:port]` and the path of an absolute url, without `URL` (incomplete on Hermes). */
export const splitUrl = (url: string): { origin: string; host: string; path: string } => {
  const match = /^([a-z][a-z0-9+.-]*:\/\/)([^/?#]+)([^?#]*)/i.exec(url);
  if (!match) throw new Error(`Not an absolute url: ${url}`);
  return { origin: match[1] + match[2], host: match[2], path: match[3] || "/" };
};

const signingKey = (secretKey: string, day: string, region: string): Uint8Array =>
  ["s3", "aws4_request"].reduce(
    (key, part) => hmac(sha256, key, utf8ToBytes(part)),
    hmac(sha256, hmac(sha256, utf8ToBytes(`AWS4${secretKey}`), utf8ToBytes(day)), utf8ToBytes(region)),
  );

/** The object's path and signed query: append it to whichever origin reaches the store. */
export const presignPathAndQuery = ({ url, credentials, at, expiresSeconds }: PresignInput): string => {
  const { host, path } = splitUrl(url);
  const region = credentials.region || DEFAULT_REGION;
  const timestamp = amzTimestamp(at);
  const day = timestamp.slice(0, 8);
  const scope = `${day}/${region}/s3/aws4_request`;
  const wirePath = canonicalPath(path);

  const params: [string, string][] = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${credentials.accessKey}/${scope}`],
    ["X-Amz-Date", timestamp],
    ["X-Amz-Expires", String(expiresSeconds)],
    ["X-Amz-SignedHeaders", "host"],
  ];
  // Left out when empty: MinIO refuses a presigned url with an empty token.
  if (credentials.sessionToken) params.push(["X-Amz-Security-Token", credentials.sessionToken]);

  const query = params
    .map(([key, value]) => [encodeRfc3986(key), encodeRfc3986(value)] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const request = ["GET", wirePath, query, `host:${host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
  const toSign = ["AWS4-HMAC-SHA256", timestamp, scope, bytesToHex(sha256(utf8ToBytes(request)))].join("\n");
  const signature = bytesToHex(hmac(sha256, signingKey(credentials.secretKey, day, region), utf8ToBytes(toSign)));

  return `${wirePath}?${query}&X-Amz-Signature=${signature}`;
};

/**
 * A presigned url for `url`. The signature covers the Host header, so it is
 * made for the store's own host; `reachedAt` is the origin to actually fetch
 * from when that differs: the mesh's loopback forward, which replays the
 * request with the store's Host.
 */
export const presignUrl = (input: PresignInput, reachedAt?: string): string =>
  (reachedAt ? splitUrl(reachedAt).origin : splitUrl(input.url).origin) + presignPathAndQuery(input);
