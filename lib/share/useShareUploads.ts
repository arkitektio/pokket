import * as React from "react";
import type { UploadOptions } from "@/lib/datalayer/upload";
import type { SharedFile } from "./files";

export type UploadState =
  | { status: "waiting" }
  | { status: "sending"; fraction: number }
  | { status: "done" }
  | { status: "failed"; message: string };

const WAITING: UploadState = { status: "waiting" };

type Send = (file: SharedFile, upload: Omit<UploadOptions, "contentType">) => Promise<unknown>;

/**
 * Sends the files one at a time, so a phone on a poor connection is not splitting
 * it between them. A file that fails stays listed with its error, and the rest
 * still go; `start` again retries what has not gone. Leaving the screen stops it.
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
    for (const file of files) {
      if (signal.aborted) break;
      if (stateOf(file).status === "done") continue;
      update(file, { status: "sending", fraction: 0 });
      try {
        await send(file, { signal, onProgress: (fraction) => update(file, { status: "sending", fraction }) });
        update(file, { status: "done" });
      } catch (cause) {
        if (signal.aborted) break;
        update(file, { status: "failed", message: cause instanceof Error ? cause.message : String(cause) });
      }
    }
    controller.current = null;
    setRunning(false);
  };

  const allDone = files.length > 0 && files.every((file) => states[file.uri]?.status === "done");
  const anyFailed = files.some((file) => states[file.uri]?.status === "failed");

  return { stateOf, start, running, allDone, anyFailed };
};
