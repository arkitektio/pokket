import { useCallback, useEffect, useState } from 'react';
import { Device } from 'react-native-ble-plx';
import { bleManager, checkBluetoothState, requestBluetoothPermissions } from './manager';

export interface UseBLEScannerResult {
  devices: Device[];
  isScanning: boolean;
  error: string | null;
  startScan: (serviceUUIDs?: string[]) => Promise<void>;
  stopScan: () => void;
  clearDevices: () => void;
}

/**
 * Hook for scanning BLE devices
 * @param serviceUUIDs - Optional array of service UUIDs to filter devices
 */
export function useBLEScanner(serviceUUIDs?: string[]): UseBLEScannerResult {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearDevices = useCallback(() => {
    setDevices([]);
  }, []);

  const stopScan = useCallback(() => {
    bleManager.stopDeviceScan();
    setIsScanning(false);
  }, []);

  const startScan = useCallback(async (filterServiceUUIDs?: string[]) => {
    setError(null);
    
    try {
      // Request permissions
      const hasPermission = await requestBluetoothPermissions();
      if (!hasPermission) {
        setError('Bluetooth permissions not granted');
        return;
      }

      // Check Bluetooth state
      const state = await checkBluetoothState();
      if (state !== 'PoweredOn') {
        setError('Bluetooth is not enabled');
        return;
      }

      // Clear existing devices
      setDevices([]);
      setIsScanning(true);

      const uuids = filterServiceUUIDs || serviceUUIDs || null;

      bleManager.startDeviceScan(uuids, null, (scanError, scannedDevice) => {
        if (scanError) {
          setError(scanError.message);
          setIsScanning(false);
          return;
        }

        if (scannedDevice) {
          setDevices((prevDevices) => {
            // Check if device already exists
            const existingIndex = prevDevices.findIndex(
              (d) => d.id === scannedDevice.id
            );

            if (existingIndex >= 0) {
              // Update existing device
              const updated = [...prevDevices];
              updated[existingIndex] = scannedDevice;
              return updated;
            } else {
              // Add new device
              return [...prevDevices, scannedDevice];
            }
          });
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsScanning(false);
    }
  }, [serviceUUIDs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isScanning) {
        bleManager.stopDeviceScan();
      }
    };
  }, [isScanning]);

  return {
    devices,
    isScanning,
    error,
    startScan,
    stopScan,
    clearDevices,
  };
}
