/**
 * The smart mailboxes as names only — no GraphQL — so navigation and search
 * can list them without loading the kuvert client. `mailboxes.ts` adds what
 * each one queries.
 */
export const MAILBOX_META = [
  { key: "inbox", label: "Inbox", keywords: ["mail", "email", "inbox", "all"] },
  { key: "unread", label: "Unread", keywords: ["mail", "email", "new"] },
  { key: "flagged", label: "Flagged", keywords: ["mail", "email", "important", "starred"] },
  { key: "sent", label: "Sent", keywords: ["mail", "email", "outgoing"] },
] as const;

export type MailboxKey = (typeof MAILBOX_META)[number]["key"];
