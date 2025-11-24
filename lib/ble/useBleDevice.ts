import { useCallback, useEffect, useState } from 'react';
import { Characteristic, Device, Service } from 'react-native-ble-plx';
import { bleManager } from './manager';

export interface DeviceService {
  uuid: string;
  characteristics: Characteristic[];
}

export interface UseBLEDeviceResult {
  device: Device | null;
  isConnected: boolean;
  services: DeviceService[];
  error: string | null;
  connect: (deviceId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  discoverServices: () => Promise<void>;
  writeCharacteristic: (
    serviceUUID: string,
    characteristicUUID: string,
    value: string
  ) => Promise<void>;
  readCharacteristic: (
    serviceUUID: string,
    characteristicUUID: string
  ) => Promise<string | null>;
}

/**
 * Hook for managing BLE device connection and services
 */
export function useBLEDevice(): UseBLEDeviceResult {
  const [device, setDevice] = useState<Device | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [services, setServices] = useState<DeviceService[]>([]);
  const [error, setError] = useState<string | null>(null);

  const disconnect = useCallback(async () => {
    if (device) {
      try {
        const connected = await device.isConnected();
        if (connected) {
          await device.cancelConnection();
        }
        setDevice(null);
        setIsConnected(false);
        setServices([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Disconnect failed');
      }
    }
  }, [device]);

  const connect = useCallback(async (deviceId: string) => {
    setError(null);
    
    try {
      // Disconnect from any existing device
      console.log('Connecting to device:', deviceId);
      if (device) {
        await disconnect();
      }

      // Connect to new device
      const connectedDevice = await bleManager.connectToDevice(deviceId);
      console.log('Connected to device:', connectedDevice.id);
      setDevice(connectedDevice);
      setIsConnected(true);

      // Monitor connection state
      connectedDevice.onDisconnected((error, disconnectedDevice) => {
        if (error) {
          setError(`Device disconnected: ${error.message}`);
        }
        setIsConnected(false);
        setDevice(null);
        setServices([]);
      });

    } catch (err) {
    console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnected(false);
      throw err;
    }
  }, [device, disconnect]);

  const discoverServices = useCallback(async () => {
    if (!device) {
      setError('No device connected');
      return;
    }

    try {
      setError(null);
      
      // Discover all services and characteristics
      await device.discoverAllServicesAndCharacteristics();
      
      // Get services
      const discoveredServices = await device.services();
      
      // Get characteristics for each service
      const servicesWithCharacteristics: DeviceService[] = await Promise.all(
        discoveredServices.map(async (service: Service) => {
          const characteristics = await device.characteristicsForService(service.uuid);
          return {
            uuid: service.uuid,
            characteristics,
          };
        })
      );

      setServices(servicesWithCharacteristics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Service discovery failed');
    }
  }, [device]);

  const writeCharacteristic = useCallback(async (
    serviceUUID: string,
    characteristicUUID: string,
    value: string
  ) => {
    if (!device) {
      throw new Error('No device connected');
    }

    try {
      await device.writeCharacteristicWithResponseForService(
        serviceUUID,
        characteristicUUID,
        value
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Write failed';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [device]);

  const readCharacteristic = useCallback(async (
    serviceUUID: string,
    characteristicUUID: string
  ): Promise<string | null> => {
    if (!device) {
      throw new Error('No device connected');
    }

    try {
      const characteristic = await device.readCharacteristicForService(
        serviceUUID,
        characteristicUUID
      );
      return characteristic.value;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Read failed';
      setError(errorMsg);
      return null;
    }
  }, [device]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (device && isConnected) {
        device.cancelConnection().catch(() => {
          // Ignore errors during cleanup
        });
      }
    };
  }, [device, isConnected]);

  return {
    device,
    isConnected,
    services,
    error,
    connect,
    disconnect,
    discoverServices,
    writeCharacteristic,
    readCharacteristic,
  };
}
