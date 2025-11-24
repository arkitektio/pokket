// BLE Manager
export { bleManager, checkBluetoothState, enableBluetooth, requestBluetoothPermissions } from './manager';

// Hooks
export { useBLEScanner } from './useBleScanner';
export type { UseBLEScannerResult } from './useBleScanner';

export { useBLEDevice } from './useBleDevice';
export type { DeviceService, UseBLEDeviceResult } from './useBleDevice';

export { useImprovProvisioning } from './useImprovProvisioning';
export type { DeviceManifest, ProvisioningConfig, UseImprovProvisioningResult } from './useImprovProvisioning';

// Improv Protocol
export {
    ARKITEKT_MANIFEST_UUID, ARKITEKT_SERVICE_UUID,
    ARKITEKT_TOKEN_UUID, IMPROV_CAPABILITIES_UUID, IMPROV_ERROR_UUID,
    IMPROV_RPC_COMMAND_UUID,
    IMPROV_RPC_RESULT_UUID, IMPROV_SERVICE_UUID,
    IMPROV_STATUS_UUID, ImprovCommand, ImprovError, ImprovStatus, buildArkitektTokenPayload, buildImprovWifiPayload, buildManifestRequestPayload,
    decodeResponse, parseImprovError, parseImprovStatus, parseManifest
} from './improvProtocol';

