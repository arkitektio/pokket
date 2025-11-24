/**
 * Arkitekt ESP32 Provisioning Protocol
 * Custom BLE service for provisioning ESP32 devices with WiFi and Arkitekt credentials
 */

// Arkitekt Provisioning Service UUID (matches Arduino code)
export const ARKITEKT_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';

// Characteristic UUIDs (matches Arduino code)
export const WIFI_SSID_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
export const WIFI_PASSWORD_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a9';
export const BASE_URL_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26aa';
export const FAKTS_TOKEN_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26ab';
export const STATUS_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26ac';
export const MANIFEST_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26ad';

// Legacy aliases for backward compatibility
export const REDEEM_TOKEN_UUID = FAKTS_TOKEN_UUID;
export const ARKITEKT_TOKEN_UUID = FAKTS_TOKEN_UUID;
export const ARKITEKT_MANIFEST_UUID = MANIFEST_UUID;

// Command Types
export enum ImprovCommand {
  WIFI_SETTINGS = 0x01,
  IDENTIFY = 0x02,
  GET_CURRENT_STATE = 0x02,
  GET_DEVICE_INFO = 0x03,
  GET_WIFI_NETWORKS = 0x04,
}

// Status
export enum ImprovStatus {
  READY = 0x02,
  PROVISIONING = 0x03,
  PROVISIONED = 0x04,
}

// Error States
export enum ImprovError {
  NO_ERROR = 0x00,
  INVALID_RPC = 0x01,
  UNKNOWN_RPC = 0x02,
  UNABLE_TO_CONNECT = 0x03,
  NOT_AUTHORIZED = 0x04,
  UNKNOWN = 0xff,
}

/**
 * Build WiFi SSID payload - simple string encoding
 */
export function buildWifiSSIDPayload(ssid: string): string {
  return btoa(ssid);
}

/**
 * Build WiFi Password payload - simple string encoding
 */
export function buildWifiPasswordPayload(password: string): string {
  return btoa(password);
}

/**
 * Build Base URL payload - simple string encoding
 */
export function buildBaseURLPayload(baseUrl: string): string {
  return btoa(baseUrl);
}

/**
 * Build Fakts Token payload - simple string encoding
 */
export function buildFaktsTokenPayload(token: string): string {
  return btoa(token);
}

/**
 * Build Redeem Token payload (alias for backward compatibility)
 */
export function buildRedeemTokenPayload(token: string): string {
  return buildFaktsTokenPayload(token);
}

/**
 * Build Arkitekt token payload (alias for backward compatibility)
 */
export function buildArkitektTokenPayload(token: string): string {
  return buildFaktsTokenPayload(token);
}

/**
 * Build Improv Wi-Fi provisioning payload (legacy support)
 */
export function buildImprovWifiPayload(ssid: string, password: string): string {
  const encoder = new TextEncoder();
  
  // Encode SSID and password
  const ssidBytes = encoder.encode(ssid);
  const passwordBytes = encoder.encode(password);
  
  // Build packet: [Command, SSID_Length, SSID, Password_Length, Password]
  const packet = new Uint8Array(
    1 + 1 + ssidBytes.length + 1 + passwordBytes.length
  );
  
  let offset = 0;
  
  // Command
  packet[offset++] = ImprovCommand.WIFI_SETTINGS;
  
  // SSID Length
  packet[offset++] = ssidBytes.length;
  
  // SSID
  packet.set(ssidBytes, offset);
  offset += ssidBytes.length;
  
  // Password Length
  packet[offset++] = passwordBytes.length;
  
  // Password
  packet.set(passwordBytes, offset);
  
  // Convert to base64
  return btoa(String.fromCharCode(...packet));
}

/**
 * Build Arkitekt manifest request payload
 * This can be used to request the device manifest
 */
export function buildManifestRequestPayload(): string {
  // Empty payload or a specific command byte
  const packet = new Uint8Array([0x01]); // Request manifest
  return btoa(String.fromCharCode(...packet));
}

/**
 * Decode base64 response from device
 */
export function decodeResponse(base64Value: string | null): string | null {
  if (!base64Value) return null;
  
  try {
    return atob(base64Value);
  } catch (err) {
    console.error('Failed to decode response:', err);
    return null;
  }
}

/**
 * Read status from device
 */
export function parseStatus(base64Value: string | null): string | null {
  return decodeResponse(base64Value);
}

/**
 * Parse Improv status
 */
export function parseImprovStatus(base64Value: string | null): ImprovStatus | null {
  if (!base64Value) return null;
  
  try {
    const decoded = atob(base64Value);
    const statusCode = decoded.charCodeAt(0);
    return statusCode as ImprovStatus;
  } catch (err) {
    console.error('Failed to parse status:', err);
    return null;
  }
}

/**
 * Parse Improv error
 */
export function parseImprovError(base64Value: string | null): ImprovError | null {
  if (!base64Value) return null;
  
  try {
    const decoded = atob(base64Value);
    const errorCode = decoded.charCodeAt(0);
    return errorCode as ImprovError;
  } catch (err) {
    console.error('Failed to parse error:', err);
    return null;
  }
}

/**
 * Parse device manifest from response
 * The manifest is returned as JSON string from MANIFEST_UUID
 */
export function parseManifest(base64Value: string | null): any | null {
  const decoded = decodeResponse(base64Value);
  if (!decoded) return null;
  
  try {
    return JSON.parse(decoded);
  } catch (err) {
    console.error('Failed to parse manifest JSON:', err);
    return null;
  }
}
