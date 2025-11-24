/**
 * Improv Wi-Fi Protocol Constants
 * https://www.improv-wifi.com/serial/
 */

// Improv Wi-Fi Service UUID
export const IMPROV_SERVICE_UUID = '00467768-6228-2272-4663-277478268000';

// Improv Wi-Fi Characteristics
export const IMPROV_STATUS_UUID = '00467768-6228-2272-4663-277478268001';
export const IMPROV_ERROR_UUID = '00467768-6228-2272-4663-277478268002';
export const IMPROV_RPC_COMMAND_UUID = '00467768-6228-2272-4663-277478268003';
export const IMPROV_RPC_RESULT_UUID = '00467768-6228-2272-4663-277478268004';
export const IMPROV_CAPABILITIES_UUID = '00467768-6228-2272-4663-277478268005';

// Custom UUIDs for Arkitekt Token (You can replace these with your own generated UUIDs)
export const ARKITEKT_SERVICE_UUID = '12345678-1234-1234-1234-1234567890AB';
export const ARKITEKT_TOKEN_UUID = '12345678-1234-1234-1234-1234567890AC';
export const ARKITEKT_MANIFEST_UUID = '12345678-1234-1234-1234-1234567890AD';

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
 * Build Improv Wi-Fi provisioning payload
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
 * Build Arkitekt token payload
 */
export function buildArkitektTokenPayload(token: string): string {
  // Simply encode the token as base64
  return btoa(token);
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
 * Assuming the manifest is returned as JSON string
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
