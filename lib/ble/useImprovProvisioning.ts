import { useCallback, useState } from 'react';
import {
    ARKITEKT_MANIFEST_UUID,
    ARKITEKT_SERVICE_UUID,
    ARKITEKT_TOKEN_UUID,
    buildArkitektTokenPayload,
    buildImprovWifiPayload,
    IMPROV_RPC_COMMAND_UUID,
    IMPROV_SERVICE_UUID,
    IMPROV_STATUS_UUID,
    ImprovStatus,
    parseImprovStatus,
    parseManifest,
} from './improvProtocol';
import { useBLEDevice } from './useBleDevice';

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
}

export interface UseImprovProvisioningResult {
  isProvisioning: boolean;
  status: string | null;
  error: string | null;
  manifest: DeviceManifest | null;
  provision: (config: ProvisioningConfig) => Promise<void>;
  getManifest: () => Promise<DeviceManifest | null>;
  reset: () => void;
}

/**
 * Hook for Improv Wi-Fi provisioning with Arkitekt integration
 * 
 * This hook combines:
 * 1. Standard Improv Wi-Fi provisioning (SSID + Password)
 * 2. Custom Arkitekt token transfer via side-channel BLE characteristic
 * 3. Device manifest retrieval
 */
export function useImprovProvisioning(deviceId?: string): UseImprovProvisioningResult {
  const bleDevice = useBLEDevice();
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manifest, setManifest] = useState<DeviceManifest | null>(null);

  const reset = useCallback(() => {
    setIsProvisioning(false);
    setStatus(null);
    setError(null);
    setManifest(null);
  }, []);

  /**
   * Get device manifest from custom characteristic
   */
  const getManifest = useCallback(async (): Promise<DeviceManifest | null> => {
    try {
      setError(null);
      setStatus('Reading device manifest...');

      // First check if we're connected
      if (!bleDevice.isConnected && deviceId) {
        await bleDevice.connect(deviceId);
        await bleDevice.discoverServices();
      }

      // Check if device has Arkitekt service
      const hasArkitektService = bleDevice.services.some(
        (s) => s.uuid.toLowerCase() === ARKITEKT_SERVICE_UUID.toLowerCase()
      );

      if (!hasArkitektService) {
        setError('Device does not support Arkitekt service');
        return null;
      }

      // Read manifest characteristic
      const manifestData = await bleDevice.readCharacteristic(
        ARKITEKT_SERVICE_UUID,
        ARKITEKT_MANIFEST_UUID
      );

      const parsedManifest = parseManifest(manifestData);
      setManifest(parsedManifest);
      setStatus('Manifest retrieved successfully');
      
      return parsedManifest;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get manifest';
      setError(errorMsg);
      return null;
    }
  }, [bleDevice, deviceId]);

  /**
   * Full provisioning flow:
   * 1. Connect to device
   * 2. Discover services
   * 3. Get device manifest (optional, for token creation)
   * 4. Send Arkitekt token via custom characteristic
   * 5. Send Wi-Fi credentials via Improv protocol
   */
  const provision = useCallback(async (config: ProvisioningConfig) => {
    setIsProvisioning(true);
    setError(null);
    setStatus('Starting provisioning...');

    try {
      // Step 1: Connect to device
      if (!bleDevice.isConnected && deviceId) {
        setStatus('Connecting to device...');
        await bleDevice.connect(deviceId);
      }

      // Step 2: Discover services
      setStatus('Discovering services...');
      await bleDevice.discoverServices();

      // Verify Improv service exists
      const hasImprovService = bleDevice.services.some(
        (s) => s.uuid.toLowerCase() === IMPROV_SERVICE_UUID.toLowerCase()
      );

      if (!hasImprovService) {
        throw new Error('Device does not support Improv Wi-Fi');
      }

      // Step 3: Send Arkitekt token (if provided and service available)
      if (config.arkitektToken) {
        const hasArkitektService = bleDevice.services.some(
          (s) => s.uuid.toLowerCase() === ARKITEKT_SERVICE_UUID.toLowerCase()
        );

        if (hasArkitektService) {
          setStatus('Sending Arkitekt token...');
          const tokenPayload = buildArkitektTokenPayload(config.arkitektToken);
          
          await bleDevice.writeCharacteristic(
            ARKITEKT_SERVICE_UUID,
            ARKITEKT_TOKEN_UUID,
            tokenPayload
          );
          
          setStatus('Arkitekt token sent successfully');
        } else {
          console.warn('Device does not support Arkitekt service, skipping token');
        }
      }

      // Step 4: Check Improv status
      setStatus('Checking device status...');
      const statusData = await bleDevice.readCharacteristic(
        IMPROV_SERVICE_UUID,
        IMPROV_STATUS_UUID
      );
      
      const improvStatus = parseImprovStatus(statusData);
      if (improvStatus !== ImprovStatus.READY && improvStatus !== ImprovStatus.PROVISIONED) {
        throw new Error(`Device not ready for provisioning (status: ${improvStatus})`);
      }

      // Step 5: Send Wi-Fi credentials
      setStatus('Sending Wi-Fi credentials...');
      const wifiPayload = buildImprovWifiPayload(config.ssid, config.password);
      
      await bleDevice.writeCharacteristic(
        IMPROV_SERVICE_UUID,
        IMPROV_RPC_COMMAND_UUID,
        wifiPayload
      );

      setStatus('Provisioning complete! Device is connecting to Wi-Fi...');
      setIsProvisioning(false);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Provisioning failed';
      setError(errorMsg);
      setStatus(null);
      setIsProvisioning(false);
      throw err;
    }
  }, [bleDevice, deviceId]);

  return {
    isProvisioning,
    status,
    error,
    manifest,
    provision,
    getManifest,
    reset,
  };
}
