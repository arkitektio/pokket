import type { ApolloClient } from "@apollo/client";
import { App } from "@/lib/app/App";
import * as React from "react";
import { AppState } from "react-native";
import { runStoredBackup } from "./backgroundBackup";
import { useTimelineSettings } from "./settings";
import { apolloLokate, backupNow, setBackupApi } from "./sync";

/**
 * Runs the timeline backup while the organization it goes to is the one
 * connected: once on connect, whenever the app comes back, and at the set
 * interval while it is open. Renders nothing, and does nothing unless the
 * backup is switched on in Settings.
 */
function Runner({ client, intervalMin }: { client: ApolloClient<unknown>; intervalMin: number }) {
  // The automatic backup, while the app is open (in the background,
  // backgroundBackup.ts takes over).
  React.useEffect(() => {
    if (intervalMin <= 0) return;
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void backupNow();
    }, intervalMin * 60 * 1000);
    return () => clearInterval(timer);
  }, [intervalMin]);

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

/**
 * A backup to an organization other than the active one, while pokket is
 * open: from its stored login, and through its mesh when lokate needs it
 * (runStoredBackup, as in the background). Only with an interval set; it
 * runs then, and whenever the app comes back.
 */
function StoredRunner({ intervalMin }: { intervalMin: number }) {
  React.useEffect(() => {
    const run = () =>
      void runStoredBackup({ whileOpen: true })
        .then((result) => console.log("[timeline] backup to another organization:", result))
        .catch((error) => console.warn("[timeline] backup to another organization failed:", error));
    run();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") run();
    }, intervalMin * 60 * 1000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") run();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [intervalMin]);
  return null;
}

export function LokateBackup() {
  const profileId = App.useActiveProfileId();
  const connected = App.useIsConnected();
  const service = App.usePotentialService("lokate");
  const { settings, loaded } = useTimelineSettings();
  if (!loaded || !settings.backupProfileId) return null;
  if (settings.backupProfileId !== profileId) {
    return settings.backupIntervalMin > 0 ? (
      <StoredRunner key={settings.backupProfileId} intervalMin={settings.backupIntervalMin} />
    ) : null;
  }
  if (!connected || !service) return null;
  return (
    <Runner key={profileId} client={service.client as ApolloClient<unknown>} intervalMin={settings.backupIntervalMin} />
  );
}
