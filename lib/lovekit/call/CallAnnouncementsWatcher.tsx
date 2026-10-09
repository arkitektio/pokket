import { useListCallsQuery, useWatchCallsSubscription } from "@/lib/lovekit/api/graphql";
import { useEffect, useMemo } from "react";

import { callAnnouncementStore, useCallAnnouncements } from "./announcements";
import { useCallState } from "./store";

/**
 * Hears of the calls the organization starts and keeps the announcements
 * honest — orkestrator's `CallAnnouncementsWatcher`: lovekit's `calls`
 * subscription delivers a call the moment someone else starts it (never the
 * member's own), and while any is announced the server is re-asked now and
 * then, so a call that has ended stops being offered. The same subscription
 * carries a call's new topics to every open app. Renders nothing; mounted
 * with the call runtime (`CallHost`), which clears the store when the
 * organization's session ends.
 */
export const CallAnnouncementsWatcher = () => {
  const joined = useCallState((state) => state.call?.id);
  const announced = useCallAnnouncements((state) => state.calls);
  const ids = useMemo(() => announced.map((call) => call.id), [announced]);

  useWatchCallsSubscription({
    onData: ({ data, client }) => {
      // A new topic needs nothing for the pages: the answer lands in the
      // cache. The announcement holds its own copy of the row.
      const changed = data.data?.calls.update;
      if (changed) callAnnouncementStore.getState().sync([changed.id], [changed]);
      const call = data.data?.calls.create;
      if (!call) return;
      callAnnouncementStore.getState().announce(call);
      // The Calls page lists it without waiting for its next poll. Filtered
      // rather than named: naming a query nobody has mounted is a warning.
      void client.refetchQueries({ include: "active", onQueryUpdated: (query) => query.queryName === "ListCalls" });
    },
  });

  const { data, variables } = useListCallsQuery({
    variables: { filter: { live: true, ids }, pagination: { limit: Math.max(ids.length, 1) } },
    skip: ids.length === 0,
    pollInterval: 30_000,
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    if (!data) return;
    callAnnouncementStore.getState().sync(variables?.filter?.ids ?? [], data.calls);
  }, [data, variables]);

  // Joining is the answer: the call is not offered again after leaving it.
  useEffect(() => {
    if (joined) callAnnouncementStore.getState().dismiss(joined);
  }, [joined]);

  return null;
};
