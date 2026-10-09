import { App, Guard } from "@/lib/app/App";
import * as React from "react";

import { callAnnouncementStore } from "./announcements";
import { CallConnection } from "./CallConnection";
import { CallToasts } from "./CallToasts";
import { CallInvitesWatcher } from "./invites";
import { callStore } from "./store";

/**
 * Everything about calls that runs wherever the member is in the app — what
 * orkestrator registers as lovekit's `background` builtins. Keyed by profile
 * below, so its unmount is the end of an organization's session: the call
 * is left and nothing of it carries into the next organization.
 */
const CallRuntime = () => {
  React.useEffect(
    () => () => {
      callStore.getState().leave();
      callAnnouncementStore.getState().clear();
    },
    [],
  );
  return (
    <>
      <CallConnection />
      <CallInvitesWatcher />
      <CallToasts />
    </>
  );
};

/**
 * Calls for the live organization, when it has lovekit and a media server.
 * Renders nothing; mounted once at the root (app/_layout.tsx).
 */
export function CallHost() {
  const profileId = App.useActiveProfileId();
  const connected = App.useIsConnected();
  if (!profileId || !connected) return null;
  return (
    <Guard.Lovekit>
      <Guard.Livekit>
        <CallRuntime key={profileId} />
      </Guard.Livekit>
    </Guard.Lovekit>
  );
}
