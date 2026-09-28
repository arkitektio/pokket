import { reportError } from "@/lib/debug/errorLog";
import { App } from "@/lib/app/App";
import { useRegisterComChannelMutation } from "@/lib/lok/api/graphql";
import * as Notifications from "expo-notifications";
import * as React from "react";
import { getPushToken, loadPush, savePush, setPushStatus, usePush } from "./push";
import { needsRegistration, withRegistration } from "./state";

/**
 * Keeps the live organization's lok told where to push — and nothing else,
 * silently. Runs only while push is switched on; never prompts; registers
 * only when this organization has not had this token lately. When the
 * system rotates the token, every organization is due again.
 */
function Registration({ profileId }: { profileId: string }) {
  const { record, loaded } = usePush();
  const [register] = useRegisterComChannelMutation();
  const enabled = loaded && record.enabled;

  const sync = React.useCallback(
    async (freshToken?: string) => {
      const current = await loadPush();
      if (!current.enabled) return;
      try {
        const token = freshToken ?? (await getPushToken({ prompt: false }));
        if (token === "denied") {
          setPushStatus({ kind: "denied" });
          return;
        }
        if (!needsRegistration(current, profileId, token)) {
          setPushStatus({ kind: "on", registeredAt: current.registrations[profileId]?.at });
          return;
        }
        setPushStatus({ kind: "working", step: "Registering this device" });
        await register({ variables: { input: { token } } });
        const next = withRegistration(await loadPush(), profileId, token);
        await savePush(next);
        setPushStatus({ kind: "on", registeredAt: next.registrations[profileId].at });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setPushStatus({ kind: "error", message });
        reportError("js", `push registration — ${message}`, error instanceof Error ? error.stack : undefined);
      }
    },
    [profileId, register],
  );

  // On switch-on, on every launch, and whenever this organization's
  // registration is cleared ("Register again" in Settings).
  const registered = !!record.registrations[profileId];
  React.useEffect(() => {
    if (enabled) void sync();
  }, [enabled, registered, sync]);

  // The system may hand out a new token at any time; then it is due everywhere.
  React.useEffect(() => {
    if (!enabled) return;
    const subscription = Notifications.addPushTokenListener(() => {
      void getPushToken({ prompt: false }).then(
        (token) => (token === "denied" ? setPushStatus({ kind: "denied" }) : sync(token)),
        () => undefined,
      );
    });
    return () => subscription.remove();
  }, [enabled, sync]);

  return null;
}

export function PushRegistration() {
  const profileId = App.useActiveProfileId();
  const connected = App.useIsConnected();
  if (!profileId || !connected) return null;
  return <Registration key={profileId} profileId={profileId} />;
}

