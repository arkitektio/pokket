import type { File } from "expo-file-system";
import { presignUrl, type S3Credentials } from "./presign";
import type { DatalayerEndpoint } from "./useDatalayer";

/** What a service's upload grant has to say, whichever service issued it. */
export type UploadGrant = S3Credentials & {
  bucket: string;
  key: string;
  expiresIn: number;
  maxBytes?: number | null;
};

export type UploadOptions = {
  contentType?: string | null;
  /** How far along it is, from 0 to 1. */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
};

/** The most S3 takes in one PUT; more needs a multipart upload, which this is not. */
export const SINGLE_PUT_LIMIT_BYTES = 5 * 1024 ** 3;

/** A week, the longest SigV4 allows. */
const MAX_SIGNED_SECONDS = 7 * 24 * 3600;

const GIB = 1024 ** 3;
const inGib = (bytes: number) => `${(bytes / GIB).toFixed(1)} GiB`;

/** Why a file of this size cannot go up under this grant, or null when it can. */
export const uploadRefusal = (size: number, maxBytes?: number | null): string | null => {
  if (size > SINGLE_PUT_LIMIT_BYTES) return `This file is ${inGib(size)}: the limit here is ${inGib(SINGLE_PUT_LIMIT_BYTES)}.`;
  if (maxBytes && size > maxBytes) return `This file is larger than the ${inGib(maxBytes)} the server accepts.`;
  return null;
};

/**
 * Puts a file on the phone into the datalayer, under a grant a service issued
 * for it. The bytes are streamed from disk by the native side, so a large file
 * never passes through JS. The url is signed for the store's own host and sent
 * where the store is reached from here, the mesh's forward included.
 */
export const uploadToGrant = async (
  file: Pick<File, "size" | "upload">,
  grant: UploadGrant,
  datalayer: DatalayerEndpoint,
  { contentType, onProgress, signal }: UploadOptions = {},
): Promise<void> => {
  const refusal = uploadRefusal(file.size, grant.maxBytes);
  if (refusal) throw new Error(refusal);

  const url = presignUrl(
    {
      url: `${datalayer.own}/${grant.bucket}/${grant.key}`,
      credentials: grant,
      at: new Date(),
      expiresSeconds: Math.max(60, Math.min(grant.expiresIn, MAX_SIGNED_SECONDS)),
      method: "PUT",
    },
    datalayer.reached,
  );

  const { status, body } = await file.upload(url, {
    httpMethod: "PUT",
    headers: contentType ? { "Content-Type": contentType } : undefined,
    onProgress: onProgress && (({ bytesSent, totalBytes }) => onProgress(totalBytes > 0 ? bytesSent / totalBytes : 0)),
    signal,
  });
  if (status < 200 || status >= 300) throw new Error(`The datalayer refused the file (${status}): ${body.slice(0, 200)}`);
};
