import type { ApolloClient } from "@apollo/client";
import { toast } from "sonner-native";
import {
  DeleteMessagesDocument,
  GetThreadDocument,
  ListThreadsDocument,
  MailboxTreeDocument,
  MarkMessagesReadDocument,
  SetMessageFlagsDocument,
  ThreadMessageIdsDocument,
  ThreadMessageIdsQuery,
} from "./api/graphql";
import { useService } from "../arkitekt/hooks";

/**
 * What one does to mail — a port of orkestrator's `kuvert/mailOps.ts`. The
 * list's swipe actions and the thread screen's header both go through these,
 * so they behave the same.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = ApolloClient<any>;

/** What mail lists and counts show; refetched (when mounted) after a change to mail. */
export const MAIL_VIEWS = [ListThreadsDocument, GetThreadDocument, MailboxTreeDocument];

export const useKuvertClient = (): Client => useService("kuvert").client as Client;

const run = async <T>(label: string, work: () => Promise<T>) => {
  try {
    return await work();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    toast.error(`${label}: ${message}`);
    throw e;
  }
};

export const markRead = (client: Client, messages: string[], read: boolean) =>
  run(read ? "Could not mark read" : "Could not mark unread", () =>
    client.mutate({
      mutation: MarkMessagesReadDocument,
      variables: { input: { messages, read } },
      refetchQueries: MAIL_VIEWS,
    }),
  );

export const setFlagged = (client: Client, messages: string[], flagged: boolean) =>
  run(flagged ? "Could not flag" : "Could not unflag", () =>
    client.mutate({
      mutation: SetMessageFlagsDocument,
      variables: {
        input: { messages, add: flagged ? ["\\Flagged"] : [], remove: flagged ? [] : ["\\Flagged"] },
      },
      refetchQueries: MAIL_VIEWS,
    }),
  );

/** Into each mailbox's Trash (mail already in Trash is expunged by the server). */
export const trash = (client: Client, messages: string[]) =>
  run("Could not move to Trash", () =>
    client.mutate({
      mutation: DeleteMessagesDocument,
      variables: { input: { messages, permanent: false } },
      refetchQueries: MAIL_VIEWS,
    }),
  );

/** Every message of a conversation: conversation actions act on those. */
export const threadMessages = async (client: Client, thread: string) => {
  const { data } = await client.query<ThreadMessageIdsQuery>({
    query: ThreadMessageIdsDocument,
    variables: { id: thread },
    fetchPolicy: "network-only",
  });
  return data.thread.messages;
};

export const trashThread = async (client: Client, thread: string) => {
  const messages = await threadMessages(client, thread);
  await trash(client, messages.map((m) => m.id));
};

export const markThreadRead = async (client: Client, thread: string, read: boolean) => {
  const messages = await threadMessages(client, thread);
  const ids = messages.filter((m) => m.isRead !== read).map((m) => m.id);
  if (ids.length) await markRead(client, ids, read);
};
