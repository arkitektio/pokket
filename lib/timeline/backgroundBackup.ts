import type { ApolloClient } from "@apollo/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { AppState, Platform } from "react-native";
import {
  loadStoredProfileBook,
  markProfileStale,
  updateProfileSession,
  writeStoredProfileBook,
} from "@/lib/arkitekt/fakts/profileStorageSchema";
import type { TokenResponse } from "@/lib/arkitekt/fakts/tokenSchema";
import { normalizeToken, refreshAccessToken, shouldRefreshToken } from "@/lib/arkitekt/runtime/auth";
import type { FaktsStorage } from "@/lib/arkitekt/types";
import { manifest } from "@/lib/constants";
import { lokateServiceDefinition } from "@/lib/lokate/service";
import { openMeshRoute, type MeshRoute } from "@/lib/mesh/headless";
import { planHeadlessBackup } from "./backupPlan";
import { loadTimelineSettings } from "./settings";
import { apolloLokate, backupWith } from "./sync";

/**
 * The timeline backup in the background: every `backupIntervalMin` minutes,
 * as often as the OS allows (at least 15 minutes apart; on iOS often much
 * less, in windows the system picks).
 *
 * Defined at import time, from the top of the root layout, because the OS may
 * start the app headless for it — no screen, provider or login in memory. So
 * it works from what is stored: the login in the profile book, the lokate
 * address the app last connected to. It refreshes the token itself when it
 * has to, writing the new one at once (refresh tokens rotate on use); the
 * app adopts it from there (keepNewerTokens, lib/arkitekt/provider.tsx).
 *
 * When lokate is reachable only through the organization's mesh, it brings
 * the mesh node up itself (lib/mesh/headless.ts) and lets it go afterwards.
 * It stands aside while pokket is open (the app backs up then) and when the
 * login needs signing in again.
 *
 * The same run, from stored logins, also serves a backup to an organization
 * other than the active one while pokket is open (`runStoredBackup` with
 * `whileOpen`, from LokateBackup.tsx).
 */
export const BACKUP_TASK = "pokket-timeline-backup";

/** Quiet: the values are tokens. */
const storage: FaktsStorage = {
  get: (key) => AsyncStorage.getItem(key),
  set: (key, value) => AsyncStorage.setItem(key, value),
  remove: (key) => AsyncStorage.removeItem(key),
};

const isRejectedRefresh = (error: unknown) =>
  error instanceof Error && /Failed to refresh token: 4\d\d/.test(error.message);

let refreshing: Promise<TokenResponse> | null = null;

/** The login's token, refreshed (and stored at once) when it is about to run out. */
const freshToken = (profileId: string): Promise<TokenResponse> => {
  refreshing ??= (async () => {
    const book = await loadStoredProfileBook(storage);
    const session = book?.profiles[profileId]?.session;
    if (!book || !session) throw new Error("The backup's organization is gone.");
    const token = normalizeToken(session.token);
    if (!shouldRefreshToken(token)) return token;
    if (!token.refresh_token) throw new Error("The login cannot be refreshed.");
    try {
      const { token: next, fakts } = await refreshAccessToken(session.endpoint.token_endpoint, token);
      // Read again: the book may have changed while the request ran.
      const latest = (await loadStoredProfileBook(storage)) ?? book;
      const current = latest.profiles[profileId]?.session ?? session;
      await writeStoredProfileBook(
        updateProfileSession(latest, profileId, { ...current, token: next, fakts: fakts ?? current.fakts }),
        storage,
      );
      return next;
    } catch (error) {
      if (isRejectedRefresh(error)) {
        const latest = (await loadStoredProfileBook(storage)) ?? book;
        await writeStoredProfileBook(markProfileStale(latest, profileId, "The login was turned down."), storage);
      }
      throw error;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
};

/** The mesh route of the run in progress, for the OS ending it early. */
let openRoute: MeshRoute | null = null;

/**
 * One backup from stored logins. Resolves with what it did, for the log.
 * `whileOpen`: see planHeadlessBackup.
 */
export const runStoredBackup = async ({ whileOpen = false }: { whileOpen?: boolean } = {}): Promise<string> => {
  const settings = await loadTimelineSettings();
  const plan = planHeadlessBackup(settings, await loadStoredProfileBook(storage), AppState.currentState, { whileOpen });
  if (plan.kind === "skip") return `skipped: ${plan.reason}`;

  let alias = plan.alias;
  let route: MeshRoute | null = null;
  if (plan.mesh) {
    route = await openMeshRoute(plan.mesh, plan.alias);
    if (!route) return "skipped: the organization's mesh did not come up";
    openRoute = route;
    alias = route.alias;
  }

  const service = lokateServiceDefinition.builder({
    manifest,
    alias,
    fakts: plan.session.fakts,
    getToken: () => freshToken(plan.profileId),
  });
  const client = service.client as ApolloClient<unknown>;
  try {
    await backupWith(apolloLokate(client));
    return plan.mesh ? "backed up through the mesh" : "backed up";
  } finally {
    client.stop();
    if (route) {
      if (openRoute === route) openRoute = null;
      await route.release();
    }
  }
};

const run: TaskManager.TaskManagerTaskExecutor = async () => {
  try {
    console.log("[timeline] background backup:", await runStoredBackup());
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.warn("[timeline] background backup failed:", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
};

if (Platform.OS !== "web") {
  TaskManager.defineTask(BACKUP_TASK, run);
  // iOS may end background work early; leave no mesh node running behind it.
  if (Platform.OS === "ios") {
    try {
      BackgroundTask.addExpirationListener(() => {
        const route = openRoute;
        openRoute = null;
        void route?.release();
      });
    } catch (error) {
      console.warn("[timeline] no expiration listener:", error);
    }
  }
}

/** The interval the task is registered with, so a launch does not reset its schedule. */
const SCHEDULE_KEY = "pokket:timeline:backup:schedule:v1";

/**
 * Registers the background task for the backup's interval, or removes it.
 * Called on launch and whenever the backup settings change.
 */
export const reconcileBackupSchedule = async () => {
  if (Platform.OS === "web") return;
  const settings = await loadTimelineSettings();
  const wanted = settings.backupProfileId !== null && settings.backupIntervalMin > 0 ? settings.backupIntervalMin : 0;
  const registered = await TaskManager.isTaskRegisteredAsync(BACKUP_TASK);
  const scheduled = Number(await AsyncStorage.getItem(SCHEDULE_KEY)) || 0;
  if (registered && scheduled === wanted) return;

  if (registered) await BackgroundTask.unregisterTaskAsync(BACKUP_TASK);
  if (wanted > 0) {
    if ((await BackgroundTask.getStatusAsync()) === BackgroundTask.BackgroundTaskStatus.Restricted) {
      console.warn("[timeline] background tasks are restricted on this device");
      await AsyncStorage.removeItem(SCHEDULE_KEY);
      return;
    }
    await BackgroundTask.registerTaskAsync(BACKUP_TASK, { minimumInterval: Math.max(15, wanted) });
    await AsyncStorage.setItem(SCHEDULE_KEY, String(wanted));
  } else {
    await AsyncStorage.removeItem(SCHEDULE_KEY);
  }
};
