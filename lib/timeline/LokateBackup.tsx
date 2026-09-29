import type { ApolloClient } from "@apollo/client";
import { App } from "@/lib/app/App";
import * as React from "react";
import { AppState } from "react-native";
import { useTimelineSettings } from "./settings";
import { apolloLokate, backupNow, setBackupApi } from "./sync";

/**
 * Runs the timeline backup while the organization it goes to is the one
 * connected: once on connect, and whenever the app comes back. Renders
 * nothing, and does nothing unless the backup is switched on in Settings.
 */
function Runner({ client }: { client: ApolloClient<unknown> }) {
  React.useEffect(() => {
    setBackupApi(apolloLokate(client));
    void backupNow();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void backupNow();
    });
    return () => {
      subscription.remove();
      setBackupApi(null);
    };
  }, [client]);
  return null;
}

export function LokateBackup() {
  const profileId = App.useActiveProfileId();
  const connected = App.useIsConnected();
  const service = App.usePotentialService("lokate");
  const { settings, loaded } = useTimelineSettings();
  if (!loaded || !connected || !profileId || settings.backupProfileId !== profileId || !service) return null;
  return <Runner key={profileId} client={service.client as ApolloClient<unknown>} />;
}
