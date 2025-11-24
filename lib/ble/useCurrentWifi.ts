import { useState } from 'react';

export interface WifiInfo {
  ssid: string | null;
  isConnected: boolean;
}

/**
 * Hook to get current WiFi connection status
 * 
 * Note: Due to privacy and security restrictions on iOS and Android,
 * getting the WiFi SSID requires:
 * - iOS: Location permissions + special entitlements (not available in Expo)
 * - Android: Location permissions + ACCESS_FINE_LOCATION
 * 
 * React Native/Expo doesn't provide direct SSID access.
 * User must manually enter their WiFi SSID.
 */
export function useCurrentWifi(): WifiInfo {
  const [wifiInfo] = useState<WifiInfo>({
    ssid: null, // Not available on React Native/Expo due to privacy restrictions
    isConnected: false,
  });

  return wifiInfo;
}
