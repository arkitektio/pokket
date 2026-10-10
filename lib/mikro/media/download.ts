import type { ApolloClient } from "@apollo/client";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { presignUrl } from "@/lib/datalayer/presign";
import type { DatalayerEndpoint } from "@/lib/datalayer/useDatalayer";
import { GetFileAccessDocument, GetFileAccessQuery, GetFileAccessQueryVariables } from "../api/graphql";
import { grantExpiresAt, signingWindow } from "./window";

/** A name that is safe as a file name on the phone, keeping its extension. */
export const localFileName = (name: string | null | undefined, id: string): string =>
  (name ?? "").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").replace(/^\.+/, "").trim().slice(0, 120) || `file-${id}`;

/**
 * Download a mikro file to the phone's cache and hand it to the share sheet
 * (save to Files, open in another app). The file's own grant is asked for
 * each time: it is for this one object and short-lived.
 */
export const downloadAndShareFile = async (
  id: string,
  client: ApolloClient<any>,
  datalayer: DatalayerEndpoint,
): Promise<void> => {
  const { data } = await client.query<GetFileAccessQuery, GetFileAccessQueryVariables>({
    query: GetFileAccessDocument,
    variables: { id },
    fetchPolicy: "network-only",
  });
  const grant = data.file.store?.accessGrant;
  if (!grant) throw new Error("This file has no stored bytes to download.");

  const now = Date.now();
  const url = presignUrl(
    {
      url: `${datalayer.own}/${grant.bucket}/${grant.key}`,
      credentials: grant,
      ...signingWindow(now, grantExpiresAt(grant.expiresIn, now)),
    },
    datalayer.reached,
  );

  const folder = new Directory(Paths.cache, "mikro");
  if (!folder.exists) folder.create({ intermediates: true });
  const target = new File(folder, localFileName(data.file.name, id));
  if (target.exists) target.delete();
  const saved = await File.downloadFileAsync(url, target);

  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is not available on this device.");
  await Sharing.shareAsync(saved.uri);
};
