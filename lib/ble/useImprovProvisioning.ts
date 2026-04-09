import { useCallback, useEffect, useRef, useState } from "react";
import { Device } from "react-native-ble-plx";
import {
    ARKITEKT_SERVICE_UUID,
    BASE_URL_UUID,
    buildBaseURLPayload,
    buildFaktsTokenPayload,
    buildWifiAnonymousIdentityPayload,
    buildWifiIdentityPayload,
    buildWifiPasswordPayload,
    buildWifiPemCertificatePayload,
    buildWifiSSIDPayload,
    FAKTS_TOKEN_UUID,
    MANIFEST_UUID,
    parseManifest,
    parseStatus,
    STATUS_UUID,
    WIFI_ANONYMOUS_IDENTITY_UUID,
    WIFI_IDENTITY_UUID,
    WIFI_PASSWORD_UUID,
    WIFI_PEM_CERTIFICATE_UUID,
    WIFI_SSID_UUID,
} from "./improvProtocol";
import { bleManager } from "./manager";
import {
    ManifestValidationError,
    validateProvisioningConfig,
    type ValidatedDeviceManifest,
} from "./validation";

export type { ValidatedDeviceManifest as DeviceManifest };

export interface ProvisioningConfig {
  ssid: string;
  password: string;
  identity?: string;
  anonymousIdentity?: string;
  pemCertificate?: string;
  arkitektToken?: string;
  displayName?: string;
  baseUrl?: string;
}

export interface UseImprovProvisioningResult {
  isProvisioning: boolean;
  status: string | null;
  error: string | null;
  manifest: ValidatedDeviceManifest | null;
  provision: (deviceId: string, config: ProvisioningConfig) => Promise<void>;
  getManifest: (deviceId: string) => Promise<ValidatedDeviceManifest | null>;
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
  const [manifest, setManifest] = useState<ValidatedDeviceManifest | null>(
    null,
  );
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
  const ensureConnected = useCallback(
    async (deviceId: string): Promise<Device> => {
      if (!deviceId) {
        throw new Error("No device ID provided");
      }

      // If already connected, return existing device
      const existingDevice = deviceRef.current.get(deviceId);
      if (existingDevice?.isConnected) {
        console.log("[BLE] Already connected to device:", deviceId);
        return existingDevice;
      }

      // Connect to device
      console.log("[BLE] Connecting to device:", deviceId);
      const device = await bleManager.connectToDevice(deviceId);
      console.log(
        "[BLE] Connected. Discovering services and characteristics...",
      );
      await device.discoverAllServicesAndCharacteristics();
      console.log("[BLE] Services and characteristics discovered");
      deviceRef.current.set(deviceId, device);
      return device;
    },
    [],
  );

  /**
   * Read a characteristic value
   */
  const readCharacteristic = useCallback(
    async (
      deviceId: string,
      serviceUUID: string,
      characteristicUUID: string,
    ): Promise<string | null> => {
      const device = await ensureConnected(deviceId);
      const characteristic = await device.readCharacteristicForService(
        serviceUUID,
        characteristicUUID,
      );
      return characteristic.value;
    },
    [ensureConnected],
  );

  /**
   * Write to a characteristic
   */
  const writeCharacteristic = useCallback(
    async (
      deviceId: string,
      serviceUUID: string,
      characteristicUUID: string,
      value: string,
    ): Promise<void> => {
      console.log(
        `[BLE] Write characteristic ${characteristicUUID} (payload length: ${value.length})`,
      );
      const device = await ensureConnected(deviceId);
      await device.writeCharacteristicWithResponseForService(
        serviceUUID,
        characteristicUUID,
        value,
      );
    },
    [ensureConnected],
  );

  /**
   * Get device status from STATUS characteristic
   */
  const getStatus = useCallback(
    async (deviceId: string): Promise<string | null> => {
      try {
        console.log("Getting device status for deviceId:", deviceId);

        const statusData = await readCharacteristic(
          deviceId,
          ARKITEKT_SERVICE_UUID,
          STATUS_UUID,
        );

        return parseStatus(statusData);
      } catch (err) {
        console.error("Failed to get status:", err);
        return null;
      }
    },
    [readCharacteristic],
  );

  /**
   * Get device manifest from MANIFEST characteristic.
   * Validates the manifest against DeviceManifestSchema.
   * Returns null and sets error if the manifest is missing or invalid.
   */
  const getManifest = useCallback(
    async (deviceId: string): Promise<ValidatedDeviceManifest | null> => {
      try {
        setError(null);
        setStatus("Reading device manifest...");
        console.log("Getting device manifest for deviceId:", deviceId);

        // Read manifest from MANIFEST_UUID (returns JSON)
        const manifestData = await readCharacteristic(
          deviceId,
          ARKITEKT_SERVICE_UUID,
          MANIFEST_UUID,
        );

        console.log("Raw manifest data:", manifestData);

        // parseManifest now validates via Zod – throws ManifestValidationError on schema mismatch
        const parsedManifest = parseManifest(manifestData);

        if (!parsedManifest) {
          setError("Device returned an empty manifest");
          setManifest(null);
          return null;
        }

        setManifest(parsedManifest);
        setStatus("Manifest received");
        return parsedManifest;
      } catch (err) {
        const errorMsg =
          err instanceof ManifestValidationError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to get manifest";
        console.error("Manifest validation failed:", errorMsg);
        setError(errorMsg);
        setManifest(null);
        return null;
      }
    },
    [readCharacteristic],
  );

  /**
   * Full provisioning flow matching Arduino implementation:
   * 1. Connect to device
   * 2. Discover services
   * 3. Write WiFi SSID to WIFI_SSID_UUID
   * 4. Write WiFi Password to WIFI_PASSWORD_UUID
   * 5. Write Base URL to BASE_URL_UUID (optional)
   * 6. Write Fakts Token to FAKTS_TOKEN_UUID (triggers config save)
   */
  const provision = useCallback(
    async (deviceId: string, config: ProvisioningConfig) => {
      setIsProvisioning(true);
      setError(null);
      setStatus("Validating provisioning config...");

      // Validate provisioning config before sending anything over BLE
      validateProvisioningConfig(config);

      setStatus("Starting provisioning...");

      console.log("[Provision] Starting provisioning for device:", deviceId);
      console.log("[Provision] Config:", {
        ssid: config.ssid,
        hasPassword: !!config.password,
        identity: config.identity ?? "(none)",
        anonymousIdentity: config.anonymousIdentity ?? "(none)",
        hasPemCertificate: !!config.pemCertificate,
        pemCertificateLength: config.pemCertificate?.length ?? 0,
        baseUrl: config.baseUrl ?? "(none)",
        hasArkitektToken: !!config.arkitektToken,
      });

      try {
        // Ensure connected (connection happens in ensureConnected)
        setStatus("Connecting to device...");
        console.log("[Provision] Step 1: Connecting to device...");
        await ensureConnected(deviceId);
        console.log("[Provision] Step 1: Connected successfully");

        setStatus("Discovering services...");
        console.log(
          "[Provision] Step 2: Services already discovered in ensureConnected",
        );

        // Step 3: Write WiFi SSID
        setStatus("Sending WiFi SSID...");
        console.log("[Provision] Step 3: Writing WiFi SSID:", config.ssid);
        const ssidPayload = buildWifiSSIDPayload(config.ssid);
        await writeCharacteristic(
          deviceId,
          ARKITEKT_SERVICE_UUID,
          WIFI_SSID_UUID,
          ssidPayload,
        );
        console.log("[Provision] Step 3: WiFi SSID written successfully");

        // Step 4: Write WiFi Password
        setStatus("Sending WiFi password...");
        console.log(
          "[Provision] Step 4: Writing WiFi password (length:",
          config.password.length,
          ")",
        );
        const passwordPayload = buildWifiPasswordPayload(config.password);
        await writeCharacteristic(
          deviceId,
          ARKITEKT_SERVICE_UUID,
          WIFI_PASSWORD_UUID,
          passwordPayload,
        );
        console.log("[Provision] Step 4: WiFi password written successfully");

        // Step 4.5: Write WiFi Identity (if provided)
        if (config.identity) {
          setStatus("Sending WiFi identity...");
          console.log(
            "[Provision] Step 4.5: Writing WiFi identity:",
            config.identity,
          );
          const identityPayload = buildWifiIdentityPayload(config.identity);
          await writeCharacteristic(
            deviceId,
            ARKITEKT_SERVICE_UUID,
            WIFI_IDENTITY_UUID,
            identityPayload,
          );
          console.log(
            "[Provision] Step 4.5: WiFi identity written successfully",
          );
        } else {
          console.log(
            "[Provision] Step 4.5: No WiFi identity provided, skipping",
          );
        }

        // Step 4.6: Write WiFi Anonymous Identity (if provided)
        if (config.anonymousIdentity) {
          setStatus("Sending WiFi anonymous identity...");
          console.log(
            "[Provision] Step 4.6: Writing WiFi anonymous identity:",
            config.anonymousIdentity,
          );
          const anonymousIdentityPayload = buildWifiAnonymousIdentityPayload(
            config.anonymousIdentity,
          );
          await writeCharacteristic(
            deviceId,
            ARKITEKT_SERVICE_UUID,
            WIFI_ANONYMOUS_IDENTITY_UUID,
            anonymousIdentityPayload,
          );
          console.log(
            "[Provision] Step 4.6: WiFi anonymous identity written successfully",
          );
        } else {
          console.log(
            "[Provision] Step 4.6: No anonymous identity provided, skipping",
          );
        }

        // Step 4.7: Write PEM Certificate in chunks (if provided)
        // BLE limits a single characteristic write to 512 bytes.
        // The ESP32 accumulates successive writes; sending "CLEAR" resets the buffer.
        if (config.pemCertificate) {
          const pemPayload = buildWifiPemCertificatePayload(
            config.pemCertificate,
          );
          const pemByteLength = config.pemCertificate.length;
          const pemPayloadLength = pemPayload.length;
          const PEM_CHUNK_SIZE = 500;
          const totalChunks = Math.ceil(pemPayloadLength / PEM_CHUNK_SIZE);

          console.log(
            `[Provision] Step 4.7: Writing PEM certificate in chunks (raw: ${pemByteLength} chars, base64: ${pemPayloadLength} chars, chunks: ${totalChunks}, chunkSize: ${PEM_CHUNK_SIZE})`,
          );
          try {
            // Send CLEAR first to reset the ESP32 PEM buffer
            setStatus("Clearing PEM buffer...");
            console.log(
              "[Provision] Step 4.7: Sending CLEAR to reset PEM buffer",
            );
            await writeCharacteristic(
              deviceId,
              ARKITEKT_SERVICE_UUID,
              WIFI_PEM_CERTIFICATE_UUID,
              btoa("CLEAR"),
            );
            console.log("[Provision] Step 4.7: PEM buffer cleared");

            // Send PEM in chunks
            for (let i = 0; i < pemPayloadLength; i += PEM_CHUNK_SIZE) {
              const chunkIndex = Math.floor(i / PEM_CHUNK_SIZE) + 1;
              const chunk = pemPayload.substring(i, i + PEM_CHUNK_SIZE);
              setStatus(
                `Sending PEM certificate chunk ${chunkIndex}/${totalChunks}...`,
              );
              console.log(
                `[Provision] Step 4.7: Sending PEM chunk ${chunkIndex}/${totalChunks} (${chunk.length} chars, offset ${i})`,
              );
              await writeCharacteristic(
                deviceId,
                ARKITEKT_SERVICE_UUID,
                WIFI_PEM_CERTIFICATE_UUID,
                chunk,
              );
              console.log(
                `[Provision] Step 4.7: PEM chunk ${chunkIndex}/${totalChunks} sent successfully`,
              );
            }
            console.log(
              "[Provision] Step 4.7: All PEM certificate chunks written successfully",
            );
          } catch (pemErr) {
            const pemErrMsg =
              pemErr instanceof Error ? pemErr.message : String(pemErr);
            console.error(
              `[Provision] Step 4.7: Failed to write PEM certificate (${pemByteLength} raw chars / ${pemPayloadLength} base64 chars). Error: ${pemErrMsg}`,
            );
            throw new Error(
              `PEM certificate send failed (${pemByteLength} chars): ${pemErrMsg}`,
            );
          }
        } else {
          console.log(
            "[Provision] Step 4.7: No PEM certificate provided, skipping",
          );
        }

        // Step 5: Write Base URL (if provided)
        if (config.baseUrl) {
          setStatus("Sending base URL...");
          console.log("[Provision] Step 5: Writing base URL:", config.baseUrl);
          const baseUrlPayload = buildBaseURLPayload(config.baseUrl);
          await writeCharacteristic(
            deviceId,
            ARKITEKT_SERVICE_UUID,
            BASE_URL_UUID,
            baseUrlPayload,
          );
          console.log("[Provision] Step 5: Base URL written successfully");
        } else {
          console.log("[Provision] Step 5: No base URL provided, skipping");
        }

        // Step 6: Write Fakts Token (this triggers config save on Arduino)
        if (config.arkitektToken) {
          setStatus("Sending fakts token...");
          console.log(
            "[Provision] Step 6: Writing fakts token (length:",
            config.arkitektToken.length,
            ")",
          );
          const tokenPayload = buildFaktsTokenPayload(config.arkitektToken);
          await writeCharacteristic(
            deviceId,
            ARKITEKT_SERVICE_UUID,
            FAKTS_TOKEN_UUID,
            tokenPayload,
          );
          setStatus("Fakts token sent - configuration saved on device");
          console.log(
            "[Provision] Step 6: Fakts token written - configuration saved on device",
          );
        } else {
          console.log("[Provision] Step 6: No fakts token provided, skipping");
        }

        console.log(
          "[Provision] All steps complete. Device should now connect to Wi-Fi and Arkitekt.",
        );
        setStatus(
          "Provisioning complete! Device is connecting to Wi-Fi and Arkitekt...",
        );
        setIsProvisioning(false);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Provisioning failed";
        console.error("[Provision] Provisioning failed:", errorMsg, err);
        setError(errorMsg);
        setStatus(null);
        setIsProvisioning(false);
        throw err;
      }
    },
    [ensureConnected, writeCharacteristic],
  );

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
