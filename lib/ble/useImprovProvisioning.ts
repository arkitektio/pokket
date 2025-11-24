import { useCallback, useEffect, useRef, useState } from 'react';
import { Device } from 'react-native-ble-plx';
import {
    ARKITEKT_SERVICE_UUID,
    BASE_URL_UUID,
    buildBaseURLPayload,
    buildFaktsTokenPayload,
    buildWifiPasswordPayload,
    buildWifiSSIDPayload,
    FAKTS_TOKEN_UUID,
    MANIFEST_UUID,
    parseManifest,
    parseStatus,
    STATUS_UUID,
    WIFI_PASSWORD_UUID,
    WIFI_SSID_UUID,
} from './improvProtocol';
import { bleManager } from './manager';

export interface DeviceManifest {
  identifier: string;
  version: string;
  scopes?: string[];
  logo?: string;
  [key: string]: any;
}

export interface ProvisioningConfig {
  ssid: string;
  password: string;
  arkitektToken?: string;
  displayName?: string;
  baseUrl?: string;
}

export interface UseImprovProvisioningResult {
  isProvisioning: boolean;
  status: string | null;
  error: string | null;
  manifest: DeviceManifest | null;
  provision: (deviceId: string, config: ProvisioningConfig) => Promise<void>;
  getManifest: (deviceId: string) => Promise<DeviceManifest | null>;
  getStatus: (deviceId: string) => Promise<string | null>;
  reset: () => void;
}

/**
 * Hook for Arkitekt ESP32 provisioning via BLE
 * 
 * Handles complete provisioning flow:
 * 1. Connect to device when deviceId is provided to methods
 * 2. Read device manifest
 * 3. Write WiFi credentials, base URL, and fakts token
 * 4. Monitor provisioning status
 */
export function useImprovProvisioning(): UseImprovProvisioningResult {
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manifest, setManifest] = useState<DeviceManifest | null>(null);
  const deviceRef = useRef<Map<string, Device>>(new Map());

  // Cleanup on unmount
  useEffect(() => {
    const devices = deviceRef.current;
    return () => {
      devices.forEach((device) => {
        device.cancelConnection().catch(() => {});
      });
      devices.clear();
    };
  }, []);

  const reset = useCallback(() => {
    setIsProvisioning(false);
    setStatus(null);
    setError(null);
    setManifest(null);
    deviceRef.current.forEach((device) => {
      device.cancelConnection().catch(() => {});
    });
    deviceRef.current.clear();
  }, []);

  /**
   * Ensure device is connected
   */
  const ensureConnected = useCallback(async (deviceId: string): Promise<Device> => {
    if (!deviceId) {
      throw new Error('No device ID provided');
    }

    // If already connected, return existing device
    const existingDevice = deviceRef.current.get(deviceId);
    if (existingDevice?.isConnected) {
      return existingDevice;
    }

    // Connect to device
    const device = await bleManager.connectToDevice(deviceId);
    await device.discoverAllServicesAndCharacteristics();
    deviceRef.current.set(deviceId, device);
    return device;
  }, []);

  /**
   * Read a characteristic value
   */
  const readCharacteristic = useCallback(async (
    deviceId: string,
    serviceUUID: string,
    characteristicUUID: string
  ): Promise<string | null> => {
    const device = await ensureConnected(deviceId);
    const characteristic = await device.readCharacteristicForService(
      serviceUUID,
      characteristicUUID
    );
    return characteristic.value;
  }, [ensureConnected]);

  /**
   * Write to a characteristic
   */
  const writeCharacteristic = useCallback(async (
    deviceId: string,
    serviceUUID: string,
    characteristicUUID: string,
    value: string
  ): Promise<void> => {
    const device = await ensureConnected(deviceId);
    await device.writeCharacteristicWithResponseForService(
      serviceUUID,
      characteristicUUID,
      value
    );
  }, [ensureConnected]);

  /**
   * Get device status from STATUS characteristic
   */
  const getStatus = useCallback(async (deviceId: string): Promise<string | null> => {
    try {
      console.log('Getting device status for deviceId:', deviceId);
      
      const statusData = await readCharacteristic(
        deviceId,
        ARKITEKT_SERVICE_UUID,
        STATUS_UUID
      );

      return parseStatus(statusData);
    } catch (err) {
      console.error('Failed to get status:', err);
      return null;
    }
  }, [readCharacteristic]);

  /**
   * Get device manifest from MANIFEST characteristic
   */
  const getManifest = useCallback(async (deviceId: string): Promise<DeviceManifest | null> => {
    try {
      setError(null);
      setStatus('Reading device manifest...');
      console.log('Getting device manifest for deviceId:', deviceId);
      
      // Read manifest from MANIFEST_UUID (returns JSON)
      const manifestData = await readCharacteristic(
        deviceId,
        ARKITEKT_SERVICE_UUID,
        MANIFEST_UUID
      );

      console.log('Raw manifest data:', manifestData);

      const parsedManifest = parseManifest(manifestData);
      
      if (!parsedManifest) {
        // Fallback to basic manifest if parsing fails
        const basicManifest: DeviceManifest = {
          identifier: 'error-unknown-device',
          version: 'ERROR',
        };
        setManifest(basicManifest);
        return basicManifest;
      }
      
      setManifest(parsedManifest);
      setStatus('Manifest received');
      return parsedManifest;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get manifest';
      setError(errorMsg);
      // Return basic manifest as fallback
      const basicManifest: DeviceManifest = {
        identifier: 'FAULTY-DEVICE',
        version:  errorMsg
      };
      setManifest(basicManifest);
      return basicManifest;
    }
  }, [readCharacteristic]);

  /**
   * Full provisioning flow matching Arduino implementation:
   * 1. Connect to device
   * 2. Discover services
   * 3. Write WiFi SSID to WIFI_SSID_UUID
   * 4. Write WiFi Password to WIFI_PASSWORD_UUID
   * 5. Write Base URL to BASE_URL_UUID (optional)
   * 6. Write Fakts Token to FAKTS_TOKEN_UUID (triggers config save)
   */
  const provision = useCallback(async (deviceId: string, config: ProvisioningConfig) => {
    setIsProvisioning(true);
    setError(null);
    setStatus('Starting provisioning...');

    try {
      // Ensure connected (connection happens in ensureConnected)
      setStatus('Connecting to device...');
      await ensureConnected(deviceId);

      setStatus('Discovering services...');
      // Services are already discovered in ensureConnected

      // Step 3: Write WiFi SSID
      setStatus('Sending WiFi SSID...');
      const ssidPayload = buildWifiSSIDPayload(config.ssid);
      await writeCharacteristic(
        deviceId,
        ARKITEKT_SERVICE_UUID,
        WIFI_SSID_UUID,
        ssidPayload
      );

      // Step 4: Write WiFi Password
      setStatus('Sending WiFi password...');
      const passwordPayload = buildWifiPasswordPayload(config.password);
      await writeCharacteristic(
        deviceId,
        ARKITEKT_SERVICE_UUID,
        WIFI_PASSWORD_UUID,
        passwordPayload
      );

      // Step 5: Write Base URL (if provided)
      if (config.baseUrl) {
        setStatus('Sending base URL...');
        const baseUrlPayload = buildBaseURLPayload(config.baseUrl);
        await writeCharacteristic(
          deviceId,
          ARKITEKT_SERVICE_UUID,
          BASE_URL_UUID,
          baseUrlPayload
        );
      }

      // Step 6: Write Fakts Token (this triggers config save on Arduino)
      if (config.arkitektToken) {
        setStatus('Sending fakts token...');
        const tokenPayload = buildFaktsTokenPayload(config.arkitektToken);
        await writeCharacteristic(
          deviceId,
          ARKITEKT_SERVICE_UUID,
          FAKTS_TOKEN_UUID,
          tokenPayload
        );
        setStatus('Fakts token sent - configuration saved on device');
      }

      setStatus('Provisioning complete! Device is connecting to Wi-Fi and Arkitekt...');
      setIsProvisioning(false);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Provisioning failed';
      setError(errorMsg);
      setStatus(null);
      setIsProvisioning(false);
      throw err;
    }
  }, [ensureConnected, writeCharacteristic]);

  return {
    isProvisioning,
    status,
    error,
    manifest,
    provision,
    getManifest,
    getStatus,
    reset,
  };
}
