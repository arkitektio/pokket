import { contractAuthFlow } from "@/lib/authflow/contract";
import {
  AuthSessionDocument,
  CancelAuthDocument,
  CompleteAuthDocument,
  ListBankAccountsDocument,
  ListBankConnectionsDocument,
} from "./api/graphql";

/** bank's side of the external-login contract. */
export const BANK_AUTH_FLOW = contractAuthFlow({
  service: "bank",
  title: "Bank login",
  home: "/bank",
  documents: { complete: CompleteAuthDocument, read: AuthSessionDocument, cancel: CancelAuthDocument },
  refetchOnDone: [ListBankConnectionsDocument, ListBankAccountsDocument],
});
