import { File } from "expo-file-system";
import type { ResolvedSharePayload } from "expo-sharing";

/** A file shared to the app, in a copy of its own on this phone. */
export type SharedFile = {
  uri: string;
  name: string;
  /** Null when the sharing app did not say. */
  size: number | null;
  mimeType: string | null;
};

const FILE_TYPES = new Set(["audio", "file", "image", "video"]);

/** Android resolves its copies to `file:/data/...`, with the one slash. */
const normalized = (uri: string) => uri.replace(/^file:\/(?!\/)/, "file:///");

const lastSegment = (uri: string) => {
  const segment = uri.split(/[?#]/)[0].split("/").pop() ?? "";
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

/** What of a share can be uploaded: text and web links cannot. */
export const sharedFiles = (payloads: ResolvedSharePayload[]): SharedFile[] =>
  payloads.flatMap((payload) => {
    if (!payload.contentUri || !payload.contentType || !FILE_TYPES.has(payload.contentType)) return [];
    const uri = normalized(payload.contentUri);
    return [
      {
        uri,
        name: payload.originalName || lastSegment(uri) || "shared-file",
        size: payload.contentSize,
        mimeType: payload.contentMimeType ?? payload.mimeType ?? null,
      },
    ];
  });

/** The copy on disk, ready to upload. Android's copying swallows its errors, so this is where they show. */
export const openSharedFile = (shared: SharedFile): File => {
  const file = new File(shared.uri);
  if (!file.exists || !file.size) throw new Error("This file could not be read from the app that shared it.");
  return file;
};

/** Removes the copies. Only ever our own: the originals are `content://` on Android. */
export const discardSharedFiles = (files: SharedFile[]): void => {
  for (const { uri } of files) {
    if (!uri.startsWith("file:")) continue;
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch {
      // A copy left behind is only a little disk, and the system clears Android's.
    }
  }
};
