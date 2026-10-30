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
    ProvisioningConfigSchema,
    ProvisioningConfigValidationError, validateManifest,
    validateProvisioningConfig,
    validateWifiProfile, WifiProfileSchema,
    WifiProfileValidationError
} from "./validation";
export type {
    ValidatedDeviceManifest,
    ValidatedProvisioningConfig,
    ValidatedWifiProfile
} from "./validation";

// Arkitekt Provisioning Protocol
export {
    ARKITEKT_MANIFEST_UUID,
    ARKITEKT_SERVICE_UUID,
    ARKITEKT_TOKEN_UUID,
    BASE_URL_UUID, buildArkitektTokenPayload,
    buildBaseURLPayload,
    buildImprovWifiPayload,
    buildManifestRequestPayload,
    buildRedeemTokenPayload,
    buildWifiPasswordPayload,
    buildWifiSSIDPayload,
    decodeResponse,
    ImprovCommand,
    ImprovError,
    ImprovStatus, parseImprovError,
    parseImprovStatus,
    parseStatus, REDEEM_TOKEN_UUID,
    STATUS_UUID,
    WIFI_PASSWORD_UUID,
    WIFI_SSID_UUID
} from "./improvProtocol";

