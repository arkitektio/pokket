import { usePathname } from "expo-router";
import * as React from "react";
import { toast } from "sonner-native";

import { useCallInvites, useDismissInvite } from "./invites";
import { showCall } from "./openCall";
import { currentTopic } from "./structureInput";
import { structureLabel } from "./structures";
import { useJoinCall } from "./useJoinCall";

/**
 * Shows each of `items` as a toast that stays until it is answered, and
 * takes it down when it leaves the list. A toast swiped away is not shown
 * again; what it was about is still on the Calls page.
 */
const useStandingToasts = <T extends { key: string }>(items: readonly T[], show: (item: T) => void) => {
  const shown = React.useRef(new Set<string>());
  const showRef = React.useRef(show);
  React.useEffect(() => {
    showRef.current = show;
  });

  React.useEffect(() => {
    const keys = new Set(items.map((item) => item.key));
    for (const key of shown.current) {
      if (keys.has(key)) continue;
      shown.current.delete(key);
      toast.dismiss(key);
    }
    for (const item of items) {
      if (shown.current.has(item.key)) continue;
      shown.current.add(item.key);
      showRef.current(item);
    }
  }, [items]);

  // The organization's session ends: nothing of it stays on screen.
  React.useEffect(() => {
    const keys = shown.current;
    return () => keys.forEach((key) => toast.dismiss(key));
  }, []);
};

const about = (call: { about: readonly { identifier: string; object: number }[] }) => {
  const topic = currentTopic(call);
  return topic ? ` about ${structureLabel(topic)}` : "";
};

/**
 * What orkestrator shows in its rail and its Notifications widget, as
 * toasts: on a phone there is no rail, and these have to reach the member
 * on whatever page they are. An invitation offers Join and Dismiss.
 *
 * Joining from here is a tap, so it may ask for the microphone.
 */
export const CallToasts = () => {
  const pathname = usePathname();
  const { join } = useJoinCall();
  const dismissInvite = useDismissInvite();
  const invites = useCallInvites();

  const enter = (call: { id: string; title: string }) => {
    showCall(call.id, pathname);
    void join({ id: call.id, title: call.title });
  };

  const inviteItems = React.useMemo(
    () => invites.map((invite) => ({ key: `call-invite-${invite.id}`, invite })),
    [invites],
  );
  useStandingToasts(inviteItems, ({ key, invite }) =>
    toast(`${invite.inviter.preferredUsername} asks you into a call`, {
      id: key,
      description: `${invite.call.title}${about(invite.call)}`,
      duration: Infinity,
      action: {
        label: "Join",
        onClick: () => {
          enter(invite.call);
          // Answered: it stops ringing, here and on the member's other devices.
          void dismissInvite(invite);
        },
      },
      cancel: { label: "Dismiss", onClick: () => void dismissInvite(invite) },
    }),
  );

  return null;
};
