import type { ApolloClient } from "@apollo/client";
import type * as React from "react";
import { MikroFolderPicker, type MikroShareOptions } from "@/components/share/MikroFolderPicker";
import type { UploadOptions } from "@/lib/datalayer/upload";
import type { DatalayerEndpoint } from "@/lib/datalayer/useDatalayer";
import { uploadFileToMikro } from "@/lib/mikro/media/upload";
import { openSharedFile, type SharedFile } from "./files";

export type ShareContext = {
  client: ApolloClient<any>;
  datalayer: DatalayerEndpoint;
};

/**
 * A place a shared file can go. Each one says which of the organization's
 * services it needs, and how a file gets there; the share screen does the rest.
 * Adding one is adding an entry to `SHARE_DESTINATIONS`.
 */
export type ShareDestination<Options = any> = {
  key: string;
  label: string;
  /** The key of the service in `App`, whose client `send` is given. */
  service: string;
  initialOptions: Options;
  /** What to ask before sending, if anything. Shown only when the service is there. */
  OptionsForm?: React.ComponentType<{ value: Options; onChange: (next: Options) => void }>;
  send: (
    file: SharedFile,
    options: Options,
    context: ShareContext,
    upload: Omit<UploadOptions, "contentType">,
  ) => Promise<unknown>;
};

const mikro: ShareDestination<MikroShareOptions> = {
  key: "mikro",
  label: "Mikro",
  service: "mikro",
  initialOptions: {},
  OptionsForm: MikroFolderPicker,
  send: (shared, { folder }, { client, datalayer }, upload) =>
    uploadFileToMikro(
      { file: openSharedFile(shared), name: shared.name, contentType: shared.mimeType, folder },
      client,
      datalayer,
      upload,
    ),
};

export const SHARE_DESTINATIONS: ShareDestination[] = [mikro];
