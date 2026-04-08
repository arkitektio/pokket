import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WifiProfile, useWifiProfiles } from '@/hooks/useWifiProfiles';
import { App } from '@/lib/app/App';
import { ARKITEKT_SERVICE_UUID, useBLEScanner, useImprovProvisioning } from '@/lib/ble';
import { CreateClientDocument, CreateClientMutation, CreateClientMutationVariables } from '@/lib/lok/api/graphql';
import { useMutation } from '@/lib/lok/funcs';
import { Link } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Device } from 'react-native-ble-plx';
import { IconSymbol } from './ui/IconSymbol';

enum ProvisioningStep {
    SCANNING = 'scanning',
    DEVICE_SELECTED = 'device_selected',
    CREDENTIALS = 'credentials',
    PROVISIONING = 'provisioning',
    COMPLETE = 'complete',
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
    const [displayName, setDisplayName] = useState('');
    
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

    const handleDeviceSelect = useCallback(async (device: Device) => {
        scanner.stopScan();
        setSelectedDevice(device);
        setStep(ProvisioningStep.DEVICE_SELECTED);

        // Try to get device manifest
        try {
            await provisioning.getManifest(device.id);
        } catch (err) {
            console.warn('Could not retrieve manifest:', err);
        }
    }, [scanner, provisioning]);

    const handleContinueToCredentials = useCallback(() => {
        if (!selectedDevice) return;
        setStep(ProvisioningStep.CREDENTIALS);
    }, [selectedDevice]);

    const handleReset = useCallback(() => {
        setStep(ProvisioningStep.SCANNING);
        setSelectedDevice(null);
        setSelectedProfile(null);
        setDisplayName('');
        scanner.clearDevices();
        provisioning.reset();
    }, [scanner, provisioning]);

    const handleProvision = useCallback(async () => {
        if (!selectedDevice) {
            Alert.alert('Error', 'No device selected');
            return;
        }

        if (!selectedProfile) {
            Alert.alert('Error', 'Please select a Wi-Fi profile');
            return;
        }

        if (!token) {
            Alert.alert('Error', 'Not connected to Arkitekt. Please connect first.');
            return;
        }

        setStep(ProvisioningStep.PROVISIONING);

        // Get base URL from fakts or use custom one
        const provisionBaseUrl = 'https://go.arkitekt.live';

        try {
            // Step 0: If Eduroam, fetch EAP config to get anonymous identity if not set
            let finalAnonymousIdentity = selectedProfile.anonymousIdentity;
            
            // Step 1: Create a client with the device manifest to get fakts-token
            const deviceName = displayName || selectedDevice?.name || 'Unnamed Device';
            const manifest = await provisioning.getManifest(selectedDevice.id);

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
                displayName: deviceName,
                baseUrl: provisionBaseUrl,
                identity: selectedProfile.identity,
                anonymousIdentity: finalAnonymousIdentity,
            });
            } catch (err) {
                console.error('Provisioning error:', err);
                throw err;
            }

            setStep(ProvisioningStep.COMPLETE);

            Alert.alert(
                'Success!',
                'Device provisioned successfully. It should now connect to your Wi-Fi network and register with Arkitekt.',
                [
                    {
                        text: 'Provision Another Device',
                        onPress: handleReset,
                    },
                    {
                        text: 'Done',
                        style: 'cancel',
                    },
                ]
            );
        } catch (err) {
            setStep(ProvisioningStep.CREDENTIALS);
            Alert.alert(
                'Provisioning Failed',
                err instanceof Error ? err.message : 'Unknown error occurred',
                [{ text: 'Try Again' }]
            );
        }
    }, [selectedDevice, selectedProfile, displayName, token, provisioning, createClient, handleReset]);

    const renderScanningStep = () => (
        <Card className="mb-4">
            <CardHeader>
                <CardTitle>Scan for Devices</CardTitle>
                <CardDescription>
                    Looking for devices with Improv Wi-Fi support
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button
                    onPress={handleStartScan}
                    disabled={scanner.isScanning || provisioning.isProvisioning}
                    className="mb-4"
                >
                    <Text className='text-white'>
                        {scanner.isScanning ? 'Scanning...' : 'Start Scan'}
                    </Text>
                </Button>

                {scanner.isScanning && (
                    <View className="flex-row items-center mb-4 p-3 bg-blue-50 rounded-lg">
                        <ActivityIndicator size="small" color="#3B82F6" />
                        <ThemedText className="ml-2 text-blue-700">
                            Scanning for nearby devices...
                        </ThemedText>
                    </View>
                )}

                {scanner.error && (
                    <View className="mb-4 p-3 bg-red-50 rounded-lg">
                        <ThemedText className="text-red-700">{scanner.error}</ThemedText>
                    </View>
                )}

                {/* Device List */}
                <View className="space-y-2">
                    {scanner.devices.map((device) => (
                        <Button
                            key={device.id}
                            variant="outline"
                            onPress={() => handleDeviceSelect(device)}
                            className="justify-start"
                        >
                            <View className="flex-row items-center">
                                <View className="w-2 h-2 bg-green-500 rounded-full mr-3" />
                                <View>
                                    <Text className="font-semibold">
                                        {device.name || 'Unknown Device'}
                                    </Text>
                                    <Text className="text-xs text-gray-500">
                                        {device.id.substring(0, 20)}...
                                    </Text>
                                </View>
                            </View>
                        </Button>
                    ))}
                </View>

                {scanner.devices.length === 0 && !scanner.isScanning && (
                    <View className="p-6 items-center">
                        <ThemedText className="text-gray-500 text-center">
                            No devices found. Make sure your device is in pairing mode.
                        </ThemedText>
                    </View>
                )}
            </CardContent>
        </Card>
    );

    const renderDeviceSelectedStep = () => (
        <Card className="mb-4">
            <CardHeader>
                <CardTitle>Device Information</CardTitle>
                <CardDescription>
                    {selectedDevice?.name || 'Unknown Device'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <View className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <View className="flex-row justify-between mb-2">
                        <ThemedText className="text-gray-600">Device ID:</ThemedText>
                        <ThemedText className="font-mono text-xs">
                            {selectedDevice?.id.substring(0, 16)}...
                        </ThemedText>
                    </View>
                    <View className="flex-row justify-between mb-2">
                        <ThemedText className="text-gray-600">RSSI:</ThemedText>
                        <ThemedText className="font-semibold">
                            {selectedDevice?.rssi} dBm
                        </ThemedText>
                    </View>
                </View>

                {provisioning.manifest && (
                    <View className="mb-4 p-4 bg-blue-50 rounded-lg">
                        <ThemedText className="font-bold mb-2">Device Manifest:</ThemedText>
                        <ThemedText className="text-xs">
                            Identifier: {provisioning.manifest.identifier}
                        </ThemedText>
                        <ThemedText className="text-xs">
                            Version: {provisioning.manifest.version}
                        </ThemedText>
                        {provisioning.manifest.scopes && (
                            <ThemedText className="text-xs">
                                Scopes: {provisioning.manifest.scopes.join(', ')}
                            </ThemedText>
                        )}
                        {provisioning.manifest.requirements && provisioning.manifest.requirements.length > 0 && (
                            <View className="mt-2">
                                <ThemedText className="text-xs font-medium mb-1">Requirements:</ThemedText>
                                {provisioning.manifest.requirements.map((req, index) => (
                                    <ThemedText key={index} className="text-xs ml-2">
                                        - {req.key}: {req.service} ({req.description})
                                    </ThemedText>
                                ))}
                            </View>
                        )}
                        {provisioning.manifest.device_id && (
                            <ThemedText className="text-xs mt-2">
                                Device ID: {provisioning.manifest.device_id}
                            </ThemedText>
                        )}
                    </View>
                )}

                <View className="flex-row space-x-2 gap-2">
                    <Button
                        variant="outline"
                        onPress={handleReset}
                        className="flex-1"
                        disabled={provisioning.isProvisioning}
                    >
                        <Text>Back</Text>
                    </Button>
                    <Button
                        onPress={handleContinueToCredentials}
                        className="flex-1"
                        disabled={provisioning.isProvisioning}
                    >
                        <Text className="text-white">Continue</Text>
                    </Button>
                </View>
            </CardContent>
        </Card>
    );

    const renderCredentialsStep = () => (
        <Card className="mb-4">
            <CardHeader>
                <CardTitle>Wi-Fi Credentials</CardTitle>
                <CardDescription>
                    Select a saved Wi-Fi profile to use
                </CardDescription>
            </CardHeader>
            <CardContent>
                <View className="space-y-4">
                    {/* Display Name Input */}
                    <View>
                        <ThemedText className="mb-2 font-medium">Device Name</ThemedText>
                        <TextInput
                            value={displayName}
                            onChangeText={setDisplayName}
                            placeholder={selectedDevice?.name || 'My ESP32 Device'}
                            autoCapitalize="words"
                            autoCorrect={false}
                            className="border border-gray-300 rounded-lg px-4 py-3 bg-white dark:bg-zinc-800 dark:text-white dark:border-zinc-700"
                            placeholderTextColor="#9CA3AF"
                        />
                        <ThemedText className="text-xs text-gray-500 mt-1">
                            Give your device a friendly name (optional)
                        </ThemedText>
                    </View>

                    {/* Profile Selection */}
                    <View>
                        <ThemedText className="mb-2 font-medium">Wi-Fi Profile</ThemedText>
                        <View className="space-y-2">
                            {profiles.map((profile, index) => (
                                <Pressable
                                    key={index}
                                    onPress={() => setSelectedProfile(profile)}
                                    className={`p-4 rounded-lg border ${
                                        selectedProfile === profile
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                                    }`}
                                >
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-row items-center">
                                            <IconSymbol 
                                                name={profile.type === 'eduroam' ? 'building.2.fill' : 'wifi'} 
                                                size={20} 
                                                color={selectedProfile === profile ? '#3B82F6' : '#6B7280'} 
                                            />
                                            <View className="ml-3">
                                                <Text className={`font-medium ${
                                                    selectedProfile === profile ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
                                                }`}>
                                                    {profile.ssid}
                                                </Text>
                                                <Text className="text-xs text-gray-500">
                                                    {profile.type === 'eduroam' ? 'Eduroam' : 'Standard Wi-Fi'}
                                                </Text>
                                            </View>
                                        </View>
                                        {selectedProfile === profile && (
                                            <IconSymbol name="checkmark.circle.fill" size={20} color="#3B82F6" />
                                        )}
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                        
                        <Link href="/wifi" asChild>
                            <Button variant="outline" className="mt-4">
                                <Text>Setup New Profile</Text>
                            </Button>
                        </Link>
                    </View>

                    {/* Token Info */}
                    {token && (
                        <View className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <ThemedText className="text-green-700 dark:text-green-400 text-xs">
                                ✓ Arkitekt token will be sent to device
                            </ThemedText>
                        </View>
                    )}

                    {!token && (
                        <View className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                            <ThemedText className="text-yellow-700 dark:text-yellow-400 text-xs">
                                ⚠ Not connected to Arkitekt. Device will not be registered.
                            </ThemedText>
                        </View>
                    )}

                    {/* Action Buttons */}
                    <View className="flex-row space-x-2 mt-4 gap-2">
                        <Button
                            variant="outline"
                            onPress={() => setStep(ProvisioningStep.DEVICE_SELECTED)}
                            className="flex-1"
                        >
                            <Text>Back</Text>
                        </Button>
                        <Button
                            onPress={handleProvision}
                            disabled={!selectedProfile || provisioning.isProvisioning}
                            className="flex-1"
                        >
                            <Text className="text-white">{provisioning.isProvisioning ? 'Provisioning...' : 'Provision Device'}</Text>
                        </Button>
                    </View>
                </View>
            </CardContent>
        </Card>
    );

    const renderProvisioningStep = () => (
        <Card className="mb-4">
            <CardHeader>
                <CardTitle>Provisioning Device</CardTitle>
                <CardDescription>Please wait...</CardDescription>
            </CardHeader>
            <CardContent>
                <View className="items-center py-8">
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <ThemedText className="mt-4 text-center text-gray-600">
                        {provisioning.status || 'Connecting to device...'}
                    </ThemedText>
                </View>

                {provisioning.error && (
                    <View className="mt-4 p-3 bg-red-50 rounded-lg">
                        <ThemedText className="text-red-700">{provisioning.error}</ThemedText>
                    </View>
                )}
            </CardContent>
        </Card>
    );

    const renderCompleteStep = () => (
        <Card className="mb-4">
            <CardHeader>
                <CardTitle>Provisioning Complete! 🎉</CardTitle>
                <CardDescription>Your device is ready to use</CardDescription>
            </CardHeader>
            <CardContent>
                <View className="items-center py-6">
                    <View className="w-16 h-16 bg-green-500 rounded-full items-center justify-center mb-4">
                        <Text className="text-white text-3xl">✓</Text>
                    </View>
                    <ThemedText className="text-center mb-6 text-gray-600">
                        The device has been provisioned and should now be connecting to your Wi-Fi network.
                        {token && ' It will register with your Arkitekt server automatically.'}
                    </ThemedText>

                    <Button onPress={handleReset} className="w-full">
                        <Text>Provision Another Device</Text>
                    </Button>
                </View>
            </CardContent>
        </Card>
    );

    if (profilesLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-background-300 dark:bg-zinc-900">
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    if (profiles.length === 0) {
        return (
            <View className="flex-1 bg-background-300 dark:bg-zinc-900 p-4 items-center justify-center">
                <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle className="text-center">No Wi-Fi Profiles</CardTitle>
                        <CardDescription className="text-center">
                            You need to configure at least one Wi-Fi profile before you can provision devices.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/wifi" asChild>
                            <Button className="w-full">
                                <Text className="text-white">Configure Wi-Fi</Text>
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background-300 dark:bg-zinc-900">
            <ScrollView className="flex-1 p-4">
                {/* Header */}
                <View className="mb-6">
                    <ThemedText className="text-2xl font-bold mb-2 text-white">
                        Device Provisioning
                    </ThemedText>
                    <ThemedText className="text-gray-200">
                        Set up new ESP32 devices with Wi-Fi and Arkitekt
                    </ThemedText>
                </View>

                {/* Progress Indicator */}
                <View className="flex-row justify-between mb-6 px-4">
                    {[
                        { step: ProvisioningStep.SCANNING, label: 'Scan' },
                        { step: ProvisioningStep.DEVICE_SELECTED, label: 'Select' },
                        { step: ProvisioningStep.CREDENTIALS, label: 'Configure' },
                        { step: ProvisioningStep.COMPLETE, label: 'Done' },
                    ].map((item, index) => (
                        <View key={item.step} className="items-center flex-1">
                            <View
                                className={`w-8 h-8 rounded-full items-center justify-center ${step === item.step ||
                                    (step === ProvisioningStep.PROVISIONING && item.step === ProvisioningStep.CREDENTIALS)
                                    ? 'bg-blue-500'
                                    : 'bg-gray-300'
                                    }`}
                            >
                                <Text className="text-white font-bold">{index + 1}</Text>
                            </View>
                            <ThemedText className="text-xs mt-1">{item.label}</ThemedText>
                        </View>
                    ))}
                </View>

                {/* Step Content */}
                {step === ProvisioningStep.SCANNING && renderScanningStep()}
                {step === ProvisioningStep.DEVICE_SELECTED && renderDeviceSelectedStep()}
                {step === ProvisioningStep.CREDENTIALS && renderCredentialsStep()}
                {step === ProvisioningStep.PROVISIONING && renderProvisioningStep()}
                {step === ProvisioningStep.COMPLETE && renderCompleteStep()}
            </ScrollView>
        </View>
    );
}
