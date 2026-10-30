import * as React from "react";
import type { UploadOptions } from "@/lib/datalayer/upload";
import type { SharedFile } from "./files";
import { startUploadService, stopUploadService, updateUploadService } from "./uploadService";

export type UploadState =
  | { status: "waiting" }
  | { status: "sending"; fraction: number }
  | { status: "done" }
  | { status: "failed"; message: string };

const WAITING: UploadState = { status: "waiting" };

/** What is left to say once it is over, for someone who has gone to another app. */
const summaryOf = (total: number, failed: number): string => {
  if (failed > 0) return `${failed} of ${total} ${total === 1 ? "file" : "files"} did not upload. Open Orkestrator to try again.`;
  return total === 1 ? "File uploaded." : `${total} files uploaded.`;
};

type Send = (file: SharedFile, upload: Omit<UploadOptions, "contentType">) => Promise<unknown>;

/**
 * Sends the files one at a time, so a phone on a poor connection is not splitting
 * it between them. A file that fails stays listed with its error, and the rest
 * still go; `start` again retries what has not gone. Leaving the screen stops it,
 * and so does closing the app. Going to another app does not, on Android by the
 * upload service, and on iOS by the system's own background session.
 */
export const useShareUploads = (files: SharedFile[], send: Send) => {
  const [states, setStates] = React.useState<Record<string, UploadState>>({});
  const [running, setRunning] = React.useState(false);
  const controller = React.useRef<AbortController | null>(null);

  React.useEffect(() => () => controller.current?.abort(), []);

  const stateOf = (file: SharedFile): UploadState => states[file.uri] ?? WAITING;

  const start = async () => {
    if (controller.current) return;
    const { signal } = (controller.current = new AbortController());
    const update = (file: SharedFile, state: UploadState) => setStates((current) => ({ ...current, [file.uri]: state }));
    setRunning(true);
    await startUploadService();
    let failed = 0;
    for (const [index, file] of files.entries()) {
      if (signal.aborted) break;
      if (stateOf(file).status === "done") continue;
      const label = files.length > 1 ? `${index + 1} of ${files.length}: ${file.name}` : file.name;
      update(file, { status: "sending", fraction: 0 });
      updateUploadService(label, 0);
      try {
        await send(file, {
          signal,
          onProgress: (fraction) => {
            update(file, { status: "sending", fraction });
            updateUploadService(label, fraction);
          },
        });
        update(file, { status: "done" });
      } catch (cause) {
        if (signal.aborted) break;
        failed += 1;
        update(file, { status: "failed", message: cause instanceof Error ? cause.message : String(cause) });
      }
    }
    stopUploadService(signal.aborted ? null : summaryOf(files.length, failed));
    controller.current = null;
    setRunning(false);
  };

  const allDone = files.length > 0 && files.every((file) => states[file.uri]?.status === "done");
  const anyFailed = files.some((file) => states[file.uri]?.status === "failed");

  return { stateOf, start, running, allDone, anyFailed };
};
