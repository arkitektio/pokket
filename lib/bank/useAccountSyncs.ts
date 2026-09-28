import type { ApolloClient } from "@apollo/client";
import { useService } from "../arkitekt/hooks";
import { ListBankAccountsDocument, ListTransactionsDocument, useAccountSyncsSubscription } from "./api/graphql";

/** What bank screens show; refetched (when mounted) after an account synced. */
export const BANK_VIEWS = [ListTransactionsDocument, ListBankAccountsDocument];

/**
 * One `accountSyncs` subscription for the bank screens: when a sync brought
 * transactions in (or replaced pending ones), refetch whatever is mounted.
 */
export const useAccountSyncs = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = useService("bank").client as ApolloClient<any>;
  useAccountSyncsSubscription({
    onData: ({ data }) => {
      const event = data.data?.accountSyncs;
      if (!event || event.created + event.updated + event.pendingReplaced === 0) return;
      void client.refetchQueries({ include: BANK_VIEWS });
    },
  });
};
