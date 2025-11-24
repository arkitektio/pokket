import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, State } from 'react-native-ble-plx';

/**
 * Singleton BLE Manager instance
 * Handles Bluetooth Low Energy operations across the app
 */
class BLEManagerSingleton {
  private static instance: BleManager | null = null;

  static getInstance(): BleManager {
    if (!BLEManagerSingleton.instance) {
      BLEManagerSingleton.instance = new BleManager();
    }
    return BLEManagerSingleton.instance;
  }

  static destroy() {
    if (BLEManagerSingleton.instance) {
      BLEManagerSingleton.instance.destroy();
      BLEManagerSingleton.instance = null;
    }
  }
}

export const bleManager = BLEManagerSingleton.getInstance();

/**
 * Request Bluetooth permissions based on platform
 */
export async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    
    if (Platform.Version >= 31) {
      // Android 12+
      const permissions = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);

      return (
        permissions['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
        permissions['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED
      );
    } else {
      // Android 11 and below
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  }
  
  // iOS permissions are handled by Info.plist
  return true;
}

/**
 * Check if Bluetooth is enabled
 */
export async function checkBluetoothState(): Promise<State> {
  return await bleManager.state();
}

/**
 * Enable Bluetooth (Android only)
 */
export async function enableBluetooth(): Promise<void> {
  const state = await bleManager.state();
  if (state !== State.PoweredOn) {
    if (Platform.OS === 'android') {
      await bleManager.enable();
    } else {
      throw new Error('Please enable Bluetooth in Settings');
    }
  }
}
