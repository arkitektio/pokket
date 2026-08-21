// BLE Manager
export {
    bleManager,
    checkBluetoothState,
    enableBluetooth,
    requestBluetoothPermissions
} from "./manager";

// Hooks
export { useBLEScanner } from "./useBleScanner";
export type { UseBLEScannerResult } from "./useBleScanner";

export { useBLEDevice } from "./useBleDevice";
export type { DeviceService, UseBLEDeviceResult } from "./useBleDevice";

export { useImprovProvisioning } from "./useImprovProvisioning";
export type {
    DeviceManifest,
    ProvisioningConfig,
    UseImprovProvisioningResult
} from "./useImprovProvisioning";

// Validation
export {
    DeviceManifestSchema,
    ManifestValidationError,
    ProvisioningBlobSchema,
    ProvisioningConfigSchema,
    ProvisioningConfigValidationError, validateManifest,
    validateProvisioningConfig,
    validateWifiProfile, WifiProfileSchema,
    WifiProfileValidationError
} from "./validation";
export type {
    ValidatedDeviceManifest,
    ValidatedProvisioningBlob,
    ValidatedProvisioningConfig,
    ValidatedWifiProfile
} from "./validation";

// Arkitekt Provisioning Protocol
export {
    ARKITEKT_MANIFEST_UUID,
    ARKITEKT_SERVICE_UUID,
    ARKITEKT_TOKEN_UUID,
    BASE_URL_UUID,
    buildArkitektTokenPayload,
    buildBaseURLPayload,
    buildImprovWifiPayload,
    buildManifestRequestPayload,
    buildProvisioningPayload,
    buildRedeemTokenPayload,
    buildWifiPasswordPayload,
    buildWifiSSIDPayload,
    decodeResponse,
    FAKTS_TOKEN_UUID,
    ImprovCommand,
    ImprovError,
    ImprovStatus,
    MANIFEST_UUID,
    parseImprovError,
    parseImprovStatus,
    parseManifest,
    parseStatus,
    PROVISIONING_UUID,
    REDEEM_TOKEN_UUID,
    STATUS_UUID,
    WIFI_PASSWORD_UUID,
    WIFI_SSID_UUID
} from "./improvProtocol";
