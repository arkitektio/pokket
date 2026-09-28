import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useSyncExternalStore } from "react";
import { disabled, emptyPushRecord, parsePushRecord, PUSH_STORAGE_KEY, PushRecord } from "./state";

/**
 * Push, as a setting — the record (`state.ts`) plus what the Settings page
 * shows while something happens. Nothing here ever prompts on its own: the
 * system permission is asked for only when the user switches push on.
 */

export type PushStatus =
  | { kind: "off" }
  | { kind: "working"; step: string }
  | { kind: "on"; registeredAt?: number }
  /** On, but the system permission was withdrawn since. */
  | { kind: "denied" }
  | { kind: "unavailable"; reason: string }
  | { kind: "error"; message: string };

type Snapshot = { record: PushRecord; loaded: boolean; status: PushStatus };

let snapshot: Snapshot = { record: emptyPushRecord(), loaded: false, status: { kind: "off" } };
const listeners = new Set<() => void>();
const publish = (next: Partial<Snapshot>) => {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((l) => l());
};

const loaded = AsyncStorage.getItem(PUSH_STORAGE_KEY)
  .then((raw) => {
    const record = parsePushRecord(raw);
    publish({ record, loaded: true, status: record.enabled ? { kind: "on" } : { kind: "off" } });
  })
  .catch(() => publish({ loaded: true }));

export const loadPush = () => loaded.then(() => snapshot.record);

export const savePush = async (record: PushRecord) => {
  publish({ record });
  await AsyncStorage.setItem(PUSH_STORAGE_KEY, JSON.stringify(record)).catch(() => undefined);
};

export const setPushStatus = (status: PushStatus) => publish({ status });

export const usePush = (): Snapshot =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => snapshot,
  );

const projectId = (): string | undefined =>
  Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

/** Why this device cannot have push at all, if it cannot. */
export const pushUnavailableReason = (): string | null => {
  if (!Device.isDevice) return "Push needs a physical device.";
  if (!projectId()) return "This build has no EAS project id.";
  return null;
};

/**
 * The device's Expo push token. With `prompt`, asks for the system
 * permission when it is not granted yet; without, a missing permission is
 * `"denied"` — the background never interrupts anyone.
 */
export const getPushToken = async ({ prompt }: { prompt: boolean }): Promise<string | "denied"> => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted" && prompt) {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return "denied";
  return (await Notifications.getExpoPushTokenAsync({ projectId: projectId() })).data;
};

/**
 * Off: stop registering, and give the device's token up so what lok may
 * still send to it no longer arrives. (lok has no way to forget a channel.)
 */
export const disablePush = async () => {
  setPushStatus({ kind: "working", step: "Turning off" });
  try {
    await Notifications.unregisterForNotificationsAsync();
  } catch (error) {
    console.warn("[push] unregister failed:", error);
  }
  await savePush(disabled(snapshot.record));
  setPushStatus({ kind: "off" });
};

/** On: ask for the permission (this once), then the registration runs. */
export const enablePush = async (): Promise<boolean> => {
  const reason = pushUnavailableReason();
  if (reason) {
    setPushStatus({ kind: "unavailable", reason });
    return false;
  }
  setPushStatus({ kind: "working", step: "Asking for permission" });
  try {
    const token = await getPushToken({ prompt: true });
    if (token === "denied") {
      setPushStatus({ kind: "denied" });
      return false;
    }
    // Registrations are forgotten, so the live organization is told at once.
    await savePush({ ...snapshot.record, enabled: true, token, registrations: {} });
    return true;
  } catch (error) {
    setPushStatus({ kind: "error", message: error instanceof Error ? error.message : String(error) });
    return false;
  }
};

/** Forget that `profileId` was told, so it is told again now. */
export const reregisterPush = async (profileId: string) => {
  const { [profileId]: _forgotten, ...registrations } = snapshot.record.registrations;
  await savePush({ ...snapshot.record, registrations });
};
