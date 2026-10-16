import { contractAuthFlow } from "@/lib/authflow/contract";
import { AuthSessionDocument, CancelAuthDocument, CompleteAuthDocument, MailboxTreeDocument } from "./api/graphql";

/** kuvert's side of the external-login contract. */
export const KUVERT_AUTH_FLOW = contractAuthFlow({
  service: "kuvert",
  title: "Mailbox sign-in",
  home: "/mail",
  documents: { complete: CompleteAuthDocument, read: AuthSessionDocument, cancel: CancelAuthDocument },
  refetchOnDone: [MailboxTreeDocument],
});
