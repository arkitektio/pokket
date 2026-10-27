import { Platform } from "react-native";
import type { Subscription } from "react-native-ble-plx";
import { bleManager } from "../manager";

/**
 * One GATT connection, as provisioning (`protocol.ts`) uses it: the surface
 * orkestrator-next's `core/bluetooth/gatt.ts` has, on react-native-ble-plx.
 * Values cross as bytes; ble-plx carries them as base64.
 */
export type GattConnection = {
  deviceId: string;
  /** Whether the device offers this characteristic under this service. */
  has: (service: string, characteristic: string) => boolean;
  read: (service: string, characteristic: string) => Promise<Uint8Array>;
  /** With response: in order, one at a time. */
  write: (service: string, characteristic: string, value: Uint8Array) => Promise<void>;
  /** Subscribes to a characteristic; the returned function unsubscribes. */
  notify: (service: string, characteristic: string, onValue: (value: Uint8Array) => void) => Promise<() => void>;
  /** Called once when the device drops the connection (not on `disconnect()`). */
  onDisconnected: (cb: () => void) => () => void;
  disconnect: () => Promise<void>;
  readonly connected: boolean;
  /** The largest write the link takes in one packet (the MTU less 3). */
  readonly maxWrite: number;
};

/** What Android is asked for; iOS negotiates on its own (185 or more). */
const ANDROID_MTU = 247;

export const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

export const fromBase64 = (value: string | null | undefined): Uint8Array => {
  if (!value) return new Uint8Array();
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const key = (service: string, characteristic: string) => `${service.toLowerCase()}/${characteristic.toLowerCase()}`;

export const connectGatt = async (deviceId: string): Promise<GattConnection> => {
  const device = await bleManager.connectToDevice(deviceId, {
    timeout: 15_000,
    ...(Platform.OS === "android" ? { requestMTU: ANDROID_MTU } : {}),
  });
  await device.discoverAllServicesAndCharacteristics();
  const offered = new Set<string>();
  for (const service of await device.services()) {
    for (const characteristic of await service.characteristics()) {
      offered.add(key(service.uuid, characteristic.uuid));
    }
  }

  let connected = true;
  let leaving = false;
  const dropListeners = new Set<() => void>();
  const dropped: Subscription = bleManager.onDeviceDisconnected(deviceId, () => {
    connected = false;
    dropped.remove();
    if (leaving) return;
    for (const listener of dropListeners) listener();
  });

  return {
    deviceId,
    has: (service, characteristic) => offered.has(key(service, characteristic)),
    read: async (service, characteristic) => {
      const value = await bleManager.readCharacteristicForDevice(deviceId, service, characteristic);
      return fromBase64(value.value);
    },
    write: async (service, characteristic, value) => {
      await bleManager.writeCharacteristicWithResponseForDevice(deviceId, service, characteristic, toBase64(value));
    },
    notify: async (service, characteristic, onValue) => {
      const subscription = bleManager.monitorCharacteristicForDevice(deviceId, service, characteristic, (error, value) => {
        if (error || !value) return;
        onValue(fromBase64(value.value));
      });
      return () => subscription.remove();
    },
    onDisconnected: (cb) => {
      dropListeners.add(cb);
      return () => dropListeners.delete(cb);
    },
    disconnect: async () => {
      leaving = true;
      dropListeners.clear();
      if (connected) await bleManager.cancelDeviceConnection(deviceId).catch(() => undefined);
      connected = false;
    },
    get connected() {
      return connected;
    },
    // ble-plx reports the MTU it negotiated (23 until then).
    maxWrite: Math.max(20, (device.mtu ?? 23) - 3),
  };
};
