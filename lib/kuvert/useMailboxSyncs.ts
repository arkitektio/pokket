import { useMailboxSyncsSubscription } from "./api/graphql";
import { MAIL_VIEWS, useKuvertClient } from "./mailOps";

/**
 * One `mailboxSyncs` subscription for all mail screens: when a sync brought
 * anything in (or took it away), refetch whatever mail view is mounted.
 */
export const useMailboxSyncs = () => {
  const client = useKuvertClient();
  useMailboxSyncsSubscription({
    onData: ({ data }) => {
      const event = data.data?.mailboxSyncs;
      if (!event || event.created + event.updated + event.deleted === 0) return;
      void client.refetchQueries({ include: MAIL_VIEWS });
    },
  });
};
