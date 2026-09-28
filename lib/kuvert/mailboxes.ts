import { FolderRole, ListThreadsQueryVariables } from "./api/graphql";
import { MailboxKey } from "./mailboxMeta";

/**
 * The mailboxes across every account, as orkestrator's `SMART_MAILBOXES`:
 * what each lists, and what it says when there is nothing.
 */
export type SmartMailbox = {
  key: MailboxKey;
  label: string;
  variables: Pick<ListThreadsQueryVariables, "filters" | "inRole">;
  empty: { title: string; description: string };
};

export const SMART_MAILBOXES: SmartMailbox[] = [
  {
    key: "inbox",
    label: "Inbox",
    variables: { filters: { folderRole: FolderRole.Inbox }, inRole: FolderRole.Inbox },
    empty: { title: "Inbox zero", description: "Nothing in any inbox." },
  },
  {
    key: "unread",
    label: "Unread",
    variables: { filters: { unread: true } },
    empty: { title: "All caught up", description: "Nothing unread in any mailbox." },
  },
  {
    key: "flagged",
    label: "Flagged",
    variables: { filters: { flagged: true } },
    empty: { title: "Nothing flagged", description: "Flag mail to find it here again." },
  },
  {
    key: "sent",
    label: "Sent",
    variables: { filters: { folderRole: FolderRole.Sent }, inRole: FolderRole.Sent },
    empty: { title: "Nothing sent", description: "Mail you send shows up here." },
  },
];
