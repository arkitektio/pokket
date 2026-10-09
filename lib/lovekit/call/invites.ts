import {
  type CallInviteFragment,
  type MyCallInvitesQuery,
  MyCallInvitesDocument,
  useDismissCallInviteMutation,
  useMyCallInvitesQuery,
  WatchCallInvitesDocument,
  type WatchCallInvitesSubscription,
  type WatchCallInvitesSubscriptionVariables,
} from "@/lib/lovekit/api/graphql";
import { useEffect } from "react";

import { applyInviteEvent } from "./inviteEvents";

/**
 * The invitations ringing on this device — orkestrator's `invites.tsx`:
 * lovekit's answer to "who asked me into a call", shared by the toasts and
 * the Calls page through the Apollo cache. `CallInvitesWatcher` keeps it live.
 */
export const useCallInvites = () => {
  const { data } = useMyCallInvitesQuery({ fetchPolicy: "cache-first" });
  return data?.myCallInvites ?? [];
};

/** Puts an invitation away, on every device of the invitee. */
export const useDismissInvite = () => {
  const [dismiss] = useDismissCallInviteMutation({
    update: (cache, result) => {
      const id = result.data?.dismissCallInvite;
      if (!id) return;
      cache.updateQuery<MyCallInvitesQuery>({ query: MyCallInvitesDocument }, (previous) =>
        previous ? { myCallInvites: previous.myCallInvites.filter((invite) => invite.id !== id) } : previous,
      );
    },
  });
  // An invitation that is already gone (answered on another device) is not
  // worth an error: either way it is no longer ringing.
  return (invite: Pick<CallInviteFragment, "id">) =>
    dismiss({ variables: { input: { id: invite.id } } }).catch(() => undefined);
};

/**
 * Keeps the invitations current: asks once, subscribes for the ones that
 * arrive and go away while the app is open, and re-asks now and then so an
 * invitation to a call that has since ended stops ringing. Renders nothing;
 * mounted with the call runtime (`CallHost`).
 */
export const CallInvitesWatcher = () => {
  const { subscribeToMore } = useMyCallInvitesQuery({
    fetchPolicy: "cache-and-network",
    pollInterval: 30_000,
  });

  useEffect(
    () =>
      subscribeToMore<WatchCallInvitesSubscription, WatchCallInvitesSubscriptionVariables>({
        document: WatchCallInvitesDocument,
        updateQuery: (previous, { subscriptionData }) => {
          const current = previous?.myCallInvites ?? [];
          const next = applyInviteEvent(current, subscriptionData.data?.callInvites);
          return next === current ? previous : { myCallInvites: [...next] };
        },
      }),
    [subscribeToMore],
  );

  return null;
};
