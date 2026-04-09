import { useAlertDialog } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { WifiProfile, useWifiProfiles } from '@/hooks/useWifiProfiles';
import { App } from '@/lib/app/App';
import { ARKITEKT_SERVICE_UUID, useBLEScanner, useImprovProvisioning } from '@/lib/ble';
import { ManifestValidationError, WifiProfileValidationError, validateWifiProfile } from '@/lib/ble/validation';
import { CreateClientDocument, CreateClientMutation, CreateClientMutationVariables } from '@/lib/lok/api/graphql';
import { useMutation } from '@/lib/lok/funcs';
import { Link } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Device } from 'react-native-ble-plx';
import { IconSymbol } from './ui/IconSymbol';

enum ProvisioningStep {
    SCANNING = 'scanning',
    DEVICE_SELECTED = 'device_selected',
    CREDENTIALS = 'credentials',
    PROVISIONING = 'provisioning',
    COMPLETE = 'complete',
}

const STEPS = [
    { key: ProvisioningStep.SCANNING, label: 'Scan' },
    { key: ProvisioningStep.DEVICE_SELECTED, label: 'Device' },
    { key: ProvisioningStep.CREDENTIALS, label: 'Configure' },
    { key: ProvisioningStep.COMPLETE, label: 'Done' },
];

function getStepIndex(step: ProvisioningStep): number {
    if (step === ProvisioningStep.PROVISIONING) return 2; // provisioning maps to configure
    return STEPS.findIndex((s) => s.key === step);
}

function StepIndicator({ currentStep }: { currentStep: ProvisioningStep }) {
    const activeIndex = getStepIndex(currentStep);
    return (
        <View className="flex-row items-center justify-between mb-6 px-2">
            {STEPS.map((item, index) => {
                const isActive = index === activeIndex;
                const isCompleted = index < activeIndex;
                return (
                    <React.Fragment key={item.key}>
                        {index > 0 && (
                            <View className={`flex-1 h-px mx-1 ${isCompleted ? 'bg-blue-500' : 'bg-zinc-700'}`} />
                        )}
                        <View className="items-center">
                            <View
                                className={`w-7 h-7 rounded-full items-center justify-center ${
                                    isActive ? 'bg-blue-500' : isCompleted ? 'bg-blue-500/30' : 'bg-zinc-800'
                                } ${isActive ? 'border-2 border-blue-400' : isCompleted ? 'border border-blue-500/50' : 'border border-zinc-700'}`}
                            >
                                {isCompleted ? (
                                    <IconSymbol name="checkmark" size={12} color="#60A5FA" />
                                ) : (
                                    <View className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-zinc-600'}`} />
                                )}
                            </View>
                            <Text className={`text-[10px] mt-1 ${
                                isActive ? 'text-blue-400 font-semibold' : isCompleted ? 'text-blue-400/60' : 'text-zinc-500'
                            }`}>
                                {item.label}
                            </Text>
                        </View>
                    </React.Fragment>
                );
            })}
        </View>
    );
}

function PulsingDot({ color = 'bg-blue-500' }: { color?: string }) {
    return (
        <View className="items-center justify-center w-5 h-5">
            <View className={`w-2.5 h-2.5 rounded-full ${color}`} />
        </View>
    );
}

/**
 * BLE Device Provisioning Component
 * 
 * Complete flow for provisioning ESP32 devices with:
 * - Wi-Fi credentials
 * - Arkitekt base URL and redeem token
 */
export function BleProvisioning() {
    const [step, setStep] = useState<ProvisioningStep>(ProvisioningStep.SCANNING);
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const [manifestLoading, setManifestLoading] = useState(false);
    
    // Wifi Config State
    const [selectedProfile, setSelectedProfile] = useState<WifiProfile | null>(null);

    // Get token from Arkitekt connection
    const token = App.useToken();

    // Scan for devices with Arkitekt service
    const scanner = useBLEScanner([ARKITEKT_SERVICE_UUID]);

    // Provisioning hook
    const provisioning = useImprovProvisioning();
    
    // Wifi Profiles hook
    const { profiles, loading: profilesLoading } = useWifiProfiles();

    // Custom alert dialog
    const alert = useAlertDialog();

    // GraphQL mutation to create client and get fakts-token
    const [createClient] = useMutation<CreateClientMutation, CreateClientMutationVariables>(CreateClientDocument);


    const handleStartScan = useCallback(() => {
        scanner.clearDevices();
        scanner.startScan();
        setStep(ProvisioningStep.SCANNING);

        // Auto-stop after 15 seconds
        setTimeout(() => {
            scanner.stopScan();
        }, 15000);
    }, [scanner]);

    const handleReset = useCallback(() => {
        setStep(ProvisioningStep.SCANNING);
        setSelectedDevice(null);
        setSelectedProfile(null);
        setManifestLoading(false);
        scanner.clearDevices();
        provisioning.reset();
    }, [scanner, provisioning]);

    const handleDeviceSelect = useCallback(async (device: Device) => {
        scanner.stopScan();
        setSelectedDevice(device);
        setStep(ProvisioningStep.DEVICE_SELECTED);
        setManifestLoading(true);

        // Fetch and validate device manifest upfront
        try {
            const manifest = await provisioning.getManifest(device.id);
            if (!manifest) {
                alert.show(
                    'Invalid Device',
                    'The device did not return a valid manifest. It may not be compatible with this app.',
                    [{ label: 'Back to Scan', onPress: handleReset }],
                );
            }
        } catch (err) {
            const message = err instanceof ManifestValidationError
                ? `Device manifest validation failed:\n${err.issues.map(i => `• ${i.path.join('.')}: ${i.message}`).join('\n')}`
                : err instanceof Error ? err.message : 'Unknown error';
            alert.show(
                'Incompatible Device',
                message,
                [{ label: 'Back to Scan', onPress: handleReset }],
            );
        } finally {
            setManifestLoading(false);
        }
    }, [scanner, provisioning, handleReset]);

    const handleContinueToCredentials = useCallback(() => {
        if (!selectedDevice) return;
        if (manifestLoading) return;
        if (!provisioning.manifest) {
            alert.show(
                'Invalid Device',
                'Cannot continue — the device manifest is missing or invalid. Please select a compatible device.',
            );
            return;
        }
        setStep(ProvisioningStep.CREDENTIALS);
    }, [selectedDevice, manifestLoading, provisioning.manifest]);

    const handleProvision = useCallback(async () => {
        if (!selectedDevice) {
            alert.show('Error', 'No device selected.');
            return;
        }

        if (!selectedProfile) {
            alert.show('Error', 'Please select a Wi-Fi profile.');
            return;
        }

        if (!token) {
            alert.show('Error', 'Not connected to Arkitekt. Please connect first.');
            return;
        }

        // Validate WiFi profile before provisioning
        try {
            validateWifiProfile(selectedProfile);
        } catch (err) {
            if (err instanceof WifiProfileValidationError) {
                const details = err.issues.map(i => `• ${i.path.join('.')}: ${i.message}`).join('\n');
                alert.show(
                    'Invalid Wi-Fi Profile',
                    `The selected profile has validation errors:\n${details}\n\nPlease update the profile and try again.`,
                );
            } else {
                alert.show('Error', err instanceof Error ? err.message : 'Wi-Fi profile validation failed');
            }
            return;
        }

        setStep(ProvisioningStep.PROVISIONING);

        // Get base URL from fakts or use custom one
        const provisionBaseUrl = 'https://go.arkitekt.live';

        try {
            // Step 0: If Eduroam, fetch EAP config to get anonymous identity if not set
            let finalAnonymousIdentity = selectedProfile.anonymousIdentity;
            
            // Use the manifest already fetched and validated in step 2
            const manifest = provisioning.manifest;
            if (!manifest) {
                throw new Error('Device returned an invalid or empty manifest. Cannot proceed with provisioning.');
            }

            const { data } = await createClient({
                variables: {
                    input: {
                        manifest: {
                            identifier: manifest?.identifier || `esp32-${selectedDevice?.id.substring(0, 8)}`,
                            version: manifest?.version || '1.0.0',
                            scopes: manifest?.scopes || ['read', 'write'],
                            nodeId: selectedDevice.id,
                            requirements: manifest?.requirements.map((r) => ({ ...r })) || [],
                        }
                    }
                }
            });

            if (!data?.createDevelopmentalClient?.token) {
                throw new Error('Failed to create client token');
            }

            const faktsToken = data.createDevelopmentalClient.token;
            console.log('Obtained fakts-token:', faktsToken);

            // Step 2: Provision device with WiFi and fakts-token
            try {
            await provisioning.provision(selectedDevice.id, {
                ssid: selectedProfile.ssid,
                password: selectedProfile.password || '',
                arkitektToken: faktsToken,
                baseUrl: provisionBaseUrl,
                identity: selectedProfile.identity,
                anonymousIdentity: finalAnonymousIdentity,
                pemCertificate: selectedProfile.pemCertificate,
            });
            } catch (err) {
                console.error('Provisioning error:', err);
                throw err;
            }

            setStep(ProvisioningStep.COMPLETE);

            alert.show(
                'Success!',
                'Device provisioned successfully. It should now connect to your Wi-Fi network and register with Arkitekt.',
                [
                    { label: 'Provision Another', onPress: handleReset },
                    { label: 'Done', variant: 'cancel' },
                ],
            );
        } catch (err) {
            setStep(ProvisioningStep.CREDENTIALS);
            alert.show(
                'Provisioning Failed',
                err instanceof Error ? err.message : 'Unknown error occurred',
                [{ label: 'Try Again' }],
            );
        }
    }, [selectedDevice, selectedProfile, token, provisioning, createClient, handleReset]);

    const renderScanningStep = () => (
        <View className="flex-1">
            <Text className="text-lg font-semibold text-white mb-1">Find Your Device</Text>
            <Text className="text-sm text-zinc-400 mb-5">Scan for nearby devices with Improv support</Text>

            <Button
                onPress={handleStartScan}
                disabled={scanner.isScanning || provisioning.isProvisioning}
                className="mb-5"
            >
                <Text className="text-white font-medium">
                    {scanner.isScanning ? 'Scanning...' : 'Start Scan'}
                </Text>
            </Button>

            {scanner.isScanning && (
                <View className="flex-row items-center mb-4 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                    <ActivityIndicator size="small" color="#60A5FA" />
                    <Text className="ml-3 text-blue-400 text-sm">
                        Scanning for nearby devices...
                    </Text>
                </View>
            )}

            {scanner.error && (
                <View className="mb-4 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                    <Text className="text-red-400 text-sm">{scanner.error}</Text>
                </View>
            )}

            <View className="gap-2">
                {scanner.devices.map((device) => (
                    <Pressable
                        key={device.id}
                        onPress={() => handleDeviceSelect(device)}
                        className="flex-row items-center p-4 bg-zinc-800/80 rounded-xl border border-zinc-700/50 active:bg-zinc-700"
                    >
                        <View className="w-10 h-10 rounded-full bg-blue-500/15 items-center justify-center mr-3">
                            <IconSymbol name="wifi" size={18} color="#60A5FA" />
                        </View>
                        <View className="flex-1">
                            <Text className="font-semibold text-white text-sm">
                                {device.name || 'Unknown Device'}
                            </Text>
                            <Text className="text-xs text-zinc-500 font-mono mt-0.5">
                                {device.id.substring(0, 20)}...
                            </Text>
                        </View>
                        <View className="flex-row items-center">
                            <PulsingDot color="bg-green-500" />
                        </View>
                    </Pressable>
                ))}
            </View>

            {scanner.devices.length === 0 && !scanner.isScanning && (
                <View className="py-12 items-center">
                    <View className="w-16 h-16 rounded-full bg-zinc-800 items-center justify-center mb-4">
                        <IconSymbol name="wifi" size={28} color="#52525B" />
                    </View>
                    <Text className="text-zinc-500 text-center text-sm">
                        No devices found.{'\n'}Make sure your device is in pairing mode.
                    </Text>
                </View>
            )}
        </View>
    );

    const renderDeviceSelectedStep = () => (
        <View className="flex-1">
            <Text className="text-lg font-semibold text-white mb-1">Device Details</Text>
            <Text className="text-sm text-zinc-400 mb-5">
                {selectedDevice?.name || 'Unknown Device'}
            </Text>

            <View className="p-4 bg-zinc-800/80 rounded-xl border border-zinc-700/50 mb-4">
                <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-zinc-400 text-sm">Device ID</Text>
                    <Text className="text-zinc-300 font-mono text-xs">
                        {selectedDevice?.id.substring(0, 16)}...
                    </Text>
                </View>
                <View className="flex-row justify-between items-center">
                    <Text className="text-zinc-400 text-sm">Signal</Text>
                    <Text className="text-zinc-300 text-sm font-medium">
                        {selectedDevice?.rssi} dBm
                    </Text>
                </View>
            </View>

            {manifestLoading && (
                <View className="p-5 bg-blue-500/10 rounded-xl border border-blue-500/20 mb-4 items-center">
                    <ActivityIndicator size="small" color="#60A5FA" />
                    <Text className="text-blue-400 text-sm mt-3">Reading device manifest...</Text>
                </View>
            )}

            {provisioning.manifest && !manifestLoading && (
                <View className="p-4 bg-zinc-800/80 rounded-xl border border-zinc-700/50 mb-4">
                    <View className="flex-row items-center mb-3">
                        <View className="w-8 h-8 rounded-lg bg-blue-500/15 items-center justify-center mr-3">
                            <IconSymbol name="doc.text" size={16} color="#60A5FA" />
                        </View>
                        <Text className="font-semibold text-white text-sm">Manifest</Text>
                    </View>
                    <View className="gap-2">
                        <View className="flex-row justify-between">
                            <Text className="text-zinc-500 text-xs">Identifier</Text>
                            <Text className="text-zinc-300 text-xs font-mono">{provisioning.manifest.identifier}</Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text className="text-zinc-500 text-xs">Version</Text>
                            <Text className="text-zinc-300 text-xs">{provisioning.manifest.version}</Text>
                        </View>
                        {provisioning.manifest.scopes && (
                            <View className="flex-row justify-between">
                                <Text className="text-zinc-500 text-xs">Scopes</Text>
                                <Text className="text-zinc-300 text-xs">{provisioning.manifest.scopes.join(', ')}</Text>
                            </View>
                        )}
                        {provisioning.manifest.requirements?.length > 0 && (
                            <View className="mt-1 pt-2 border-t border-zinc-700/50">
                                <Text className="text-zinc-500 text-xs mb-1">Requirements</Text>
                                {provisioning.manifest.requirements.map((req, index) => (
                                    <Text key={index} className="text-zinc-400 text-xs ml-2">
                                        {req.key}: {req.service}
                                    </Text>
                                ))}
                            </View>
                        )}
                    </View>
                </View>
            )}

            <View className="flex-row gap-3 mt-auto">
                <Button
                    variant="outline"
                    onPress={handleReset}
                    className="flex-1 border-zinc-700"
                    disabled={provisioning.isProvisioning}
                >
                    <Text className="text-zinc-300">Back</Text>
                </Button>
                <Button
                    onPress={handleContinueToCredentials}
                    className="flex-1"
                    disabled={provisioning.isProvisioning || manifestLoading || !provisioning.manifest}
                >
                    {manifestLoading ? (
                        <View className="flex-row items-center gap-2">
                            <ActivityIndicator size="small" color="#fff" />
                            <Text className="text-white font-medium">Loading...</Text>
                        </View>
                    ) : (
                        <Text className="text-white font-medium">Continue</Text>
                    )}
                </Button>
            </View>
        </View>
    );

    const renderCredentialsStep = () => (
        <View className="flex-1">
            <Text className="text-lg font-semibold text-white mb-1">Wi-Fi Configuration</Text>
            <Text className="text-sm text-zinc-400 mb-5">Select a saved Wi-Fi profile</Text>

            <View className="gap-2 mb-4">
                {profiles.map((profile, index) => (
                    <Pressable
                        key={index}
                        onPress={() => setSelectedProfile(profile)}
                        className={`p-4 rounded-xl border ${
                            selectedProfile === profile
                                ? 'border-blue-500/50 bg-blue-500/10'
                                : 'border-zinc-700/50 bg-zinc-800/80'
                        } active:bg-zinc-700`}
                    >
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center">
                                <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                                    selectedProfile === profile ? 'bg-blue-500/20' : 'bg-zinc-700/50'
                                }`}>
                                    <IconSymbol
                                        name={profile.type === 'eduroam' ? 'building.2.fill' : 'wifi'}
                                        size={18}
                                        color={selectedProfile === profile ? '#60A5FA' : '#71717A'}
                                    />
                                </View>
                                <View>
                                    <Text className={`font-medium text-sm ${
                                        selectedProfile === profile ? 'text-blue-400' : 'text-zinc-200'
                                    }`}>
                                        {profile.ssid}
                                    </Text>
                                    <Text className="text-xs text-zinc-500 mt-0.5">
                                        {profile.type === 'eduroam' ? 'Eduroam' : 'Standard Wi-Fi'}
                                    </Text>
                                </View>
                            </View>
                            {selectedProfile === profile && (
                                <IconSymbol name="checkmark.circle.fill" size={20} color="#60A5FA" />
                            )}
                        </View>
                    </Pressable>
                ))}
            </View>

            <Link href="/wifi" asChild>
                <Button variant="outline" className="border-zinc-700 mb-4">
                    <Text className="text-zinc-300">+ Add New Profile</Text>
                </Button>
            </Link>

            {token && (
                <View className="p-3 bg-green-500/10 rounded-xl border border-green-500/20 mb-3">
                    <Text className="text-green-400 text-xs">
                        ✓ Arkitekt token will be sent to device
                    </Text>
                </View>
            )}

            {!token && (
                <View className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20 mb-3">
                    <Text className="text-yellow-400 text-xs">
                        ⚠ Not connected to Arkitekt. Device will not be registered.
                    </Text>
                </View>
            )}

            <View className="flex-row gap-3 mt-auto">
                <Button
                    variant="outline"
                    onPress={() => setStep(ProvisioningStep.DEVICE_SELECTED)}
                    className="flex-1 border-zinc-700"
                >
                    <Text className="text-zinc-300">Back</Text>
                </Button>
                <Button
                    onPress={handleProvision}
                    disabled={!selectedProfile || provisioning.isProvisioning}
                    className="flex-1"
                >
                    <Text className="text-white font-medium">
                        {provisioning.isProvisioning ? 'Provisioning...' : 'Provision Device'}
                    </Text>
                </Button>
            </View>
        </View>
    );

    const renderProvisioningStep = () => (
        <View className="flex-1 items-center justify-center py-12">
            <View className="w-20 h-20 rounded-full bg-blue-500/15 items-center justify-center mb-6">
                <ActivityIndicator size="large" color="#60A5FA" />
            </View>
            <Text className="text-white font-semibold text-lg mb-2">Provisioning Device</Text>
            <Text className="text-zinc-400 text-sm text-center mb-6">
                {provisioning.status || 'Connecting to device...'}
            </Text>

            {provisioning.error && (
                <View className="w-full p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                    <Text className="text-red-400 text-sm">{provisioning.error}</Text>
                </View>
            )}
        </View>
    );

    const renderCompleteStep = () => (
        <View className="flex-1 items-center justify-center py-12">
            <View className="w-20 h-20 rounded-full bg-green-500/15 items-center justify-center mb-6">
                <IconSymbol name="checkmark" size={36} color="#4ADE80" />
            </View>
            <Text className="text-white font-semibold text-lg mb-2">All Done!</Text>
            <Text className="text-zinc-400 text-sm text-center mb-8 px-4">
                The device has been provisioned and should now be connecting to your Wi-Fi network.
                {token && ' It will register with Arkitekt automatically.'}
            </Text>

            <Button onPress={handleReset} className="w-full">
                <Text className="text-white font-medium">Provision Another Device</Text>
            </Button>
        </View>
    );

    if (profilesLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-zinc-950">
                <View className="w-16 h-16 rounded-full bg-zinc-800 items-center justify-center mb-4">
                    <ActivityIndicator size="large" color="#60A5FA" />
                </View>
                <Text className="text-zinc-400 text-sm">Loading profiles...</Text>
            </View>
        );
    }

    if (profiles.length === 0) {
        return (
            <View className="flex-1 bg-zinc-950 p-6 items-center justify-center">
                <View className="w-16 h-16 rounded-full bg-zinc-800 items-center justify-center mb-4">
                    <IconSymbol name="wifi" size={28} color="#52525B" />
                </View>
                <Text className="text-white font-semibold text-lg mb-2 text-center">No Wi-Fi Profiles</Text>
                <Text className="text-zinc-400 text-sm text-center mb-6">
                    Configure at least one Wi-Fi profile before provisioning devices.
                </Text>
                <Link href="/wifi" asChild>
                    <Button className="w-full max-w-xs">
                        <Text className="text-white font-medium">Configure Wi-Fi</Text>
                    </Button>
                </Link>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-zinc-950">
            <ScrollView className="flex-1" contentContainerClassName="p-5 pb-10">
                <StepIndicator currentStep={step} />

                {step === ProvisioningStep.SCANNING && renderScanningStep()}
                {step === ProvisioningStep.DEVICE_SELECTED && renderDeviceSelectedStep()}
                {step === ProvisioningStep.CREDENTIALS && renderCredentialsStep()}
                {step === ProvisioningStep.PROVISIONING && renderProvisioningStep()}
                {step === ProvisioningStep.COMPLETE && renderCompleteStep()}
            </ScrollView>
        </View>
    );
}
