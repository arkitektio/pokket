import type { ApolloClient } from "@apollo/client";
import type { File } from "expo-file-system";
import { uploadRefusal, uploadToGrant, type UploadOptions } from "@/lib/datalayer/upload";
import type { DatalayerEndpoint } from "@/lib/datalayer/useDatalayer";
import {
  FinishBigfileUploadDocument,
  FinishBigfileUploadMutation,
  FinishBigfileUploadMutationVariables,
  FromFileLikeDocument,
  FromFileLikeMutation,
  FromFileLikeMutationVariables,
  ListFileFragment,
  RequestBigfileUploadDocument,
  RequestBigfileUploadMutation,
  RequestBigfileUploadMutationVariables,
} from "../api/graphql";

export type NewFile = {
  file: Pick<File, "size" | "upload">;
  name: string;
  contentType?: string | null;
  /** Left out, the server puts it in the organization's default folder. */
  folder?: string;
};

/**
 * Makes a mikro file of one on the phone, as orkestrator does: a grant from
 * mikro, the bytes to the datalayer, the store marked as finished, and a file
 * made of that store. Then whatever list is on show picks it up.
 */
export const uploadFileToMikro = async (
  { file, name, contentType, folder }: NewFile,
  client: ApolloClient<any>,
  datalayer: DatalayerEndpoint,
  options?: Omit<UploadOptions, "contentType">,
): Promise<ListFileFragment> => {
  // Asked again with the grant's own limit; this saves asking for a grant at all.
  const refusal = uploadRefusal(file.size);
  if (refusal) throw new Error(refusal);

  const { data: requested } = await client.mutate<RequestBigfileUploadMutation, RequestBigfileUploadMutationVariables>({
    mutation: RequestBigfileUploadDocument,
    variables: { input: { originalFileName: name, fileSize: file.size, contentType } },
  });
  const grant = requested?.requestBigfileUpload;
  if (!grant) throw new Error("mikro gave no upload grant.");

  await uploadToGrant(file, grant, datalayer, { ...options, contentType });

  await client.mutate<FinishBigfileUploadMutation, FinishBigfileUploadMutationVariables>({
    mutation: FinishBigfileUploadDocument,
    variables: { input: { storeId: grant.store } },
  });

  const { data: created } = await client.mutate<FromFileLikeMutation, FromFileLikeMutationVariables>({
    mutation: FromFileLikeDocument,
    variables: { file: grant.store, name, folder },
  });
  if (!created?.fromFileLike) throw new Error("mikro made no file of the upload.");

  await client.refetchQueries({ include: "active" });
  return created.fromFileLike;
};
