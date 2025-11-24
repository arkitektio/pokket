import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { App } from '@/lib/app/App';
import { ARKITEKT_SERVICE_UUID, useBLEScanner, useImprovProvisioning } from '@/lib/ble';
import { CreateClientDocument } from '@/lib/lok/api/graphql';
import { useMutation } from '@/lib/lok/funcs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { Device } from 'react-native-ble-plx';

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
    const [wifiSSID, setWifiSSID] = useState('');
    const [wifiPassword, setWifiPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [saveConfig, setSaveConfig] = useState(true);
    const [savedConfigs, setSavedConfigs] = useState<{ ssid: string, password: string }[]>([]);
    const [showSavedConfigs, setShowSavedConfigs] = useState(false);

    // Get token from Arkitekt connection
    const token = App.useToken();
    const fakts = App.useFakts();

    // Scan for devices with Arkitekt service
    const scanner = useBLEScanner([ARKITEKT_SERVICE_UUID]);

    // Provisioning hook
    const provisioning = useImprovProvisioning();

    // GraphQL mutation to create client and get fakts-token
    const [createClient] = useMutation(CreateClientDocument);

    // Load saved WiFi configurations on mount
    useEffect(() => {
        loadSavedConfigs();
    }, []);

    const loadSavedConfigs = async () => {
        try {
            const stored = await AsyncStorage.getItem('wifi_configs');
            if (stored) {
                setSavedConfigs(JSON.parse(stored));
            }
        } catch (err) {
            console.error('Failed to load WiFi configs:', err);
        }
    };

    const saveWifiConfig = useCallback(async (ssid: string, password: string) => {
        try {
            // Check if config already exists
            const exists = savedConfigs.some(c => c.ssid === ssid);
            if (exists) {
                // Update existing
                const updated = savedConfigs.map(c =>
                    c.ssid === ssid ? { ssid, password } : c
                );
                setSavedConfigs(updated);
                await AsyncStorage.setItem('wifi_configs', JSON.stringify(updated));
            } else {
                // Add new
                const updated = [...savedConfigs, { ssid, password }];
                setSavedConfigs(updated);
                await AsyncStorage.setItem('wifi_configs', JSON.stringify(updated));
            }
        } catch (err) {
            console.error('Failed to save WiFi config:', err);
        }
    }, [savedConfigs]);

    const deleteSavedConfig = useCallback(async (ssid: string) => {
        try {
            const updated = savedConfigs.filter(c => c.ssid !== ssid);
            setSavedConfigs(updated);
            await AsyncStorage.setItem('wifi_configs', JSON.stringify(updated));
        } catch (err) {
            console.error('Failed to delete WiFi config:', err);
        }
    }, [savedConfigs]);

    const loadSavedConfig = useCallback((config: { ssid: string, password: string }) => {
        setWifiSSID(config.ssid);
        setWifiPassword(config.password);
        setShowSavedConfigs(false);
    }, []);

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
        setWifiSSID('');
        setWifiPassword('');
        setDisplayName('');
        setBaseUrl('');
        scanner.clearDevices();
        provisioning.reset();
    }, [scanner, provisioning]);

    const handleProvision = useCallback(async () => {
        if (!selectedDevice || !wifiSSID) {
            Alert.alert('Error', 'Please enter Wi-Fi credentials');
            return;
        }

        if (!token) {
            Alert.alert('Error', 'Not connected to Arkitekt. Please connect first.');
            return;
        }

        setStep(ProvisioningStep.PROVISIONING);

        // Save WiFi config if checkbox is checked
        if (saveConfig && wifiSSID && wifiPassword) {
            await saveWifiConfig(wifiSSID, wifiPassword);
        }

        // Get base URL from fakts or use custom one
        const provisionBaseUrl = 'https://go.arkitekt.live';

        try {
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
            await provisioning.provision(selectedDevice.id, {
                ssid: wifiSSID,
                password: wifiPassword,
                arkitektToken: faktsToken,
                displayName: deviceName,
                baseUrl: provisionBaseUrl,
            });

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
    }, [selectedDevice, wifiSSID, wifiPassword, displayName, baseUrl, fakts, token, provisioning, createClient, handleReset, saveConfig, saveWifiConfig]);

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
                    <Text>
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
                    </View>
                )}

                <View className="flex-row space-x-2">
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
                        <Text>Continue</Text>
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
                    Enter your Wi-Fi network details
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
                            className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
                        />
                        <ThemedText className="text-xs text-gray-500 mt-1">
                            Give your device a friendly name (optional)
                        </ThemedText>
                    </View>

                    {/* SSID Input */}
                    <View>
                        <View className="flex-row justify-between items-center mb-2">
                            <ThemedText className="font-medium">Network Name (SSID)</ThemedText>
                            {savedConfigs.length > 0 && (
                                <Button
                                    variant="ghost"
                                    onPress={() => setShowSavedConfigs(!showSavedConfigs)}
                                    className="py-1"
                                >
                                    <Text className="text-xs text-blue-600">
                                        {showSavedConfigs ? 'Hide' : `Saved (${savedConfigs.length})`}
                                    </Text>
                                </Button>
                            )}
                        </View>

                        {showSavedConfigs && savedConfigs.length > 0 && (
                            <View className="mb-2 border border-gray-200 rounded-lg bg-gray-50">
                                {savedConfigs.map((config, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => loadSavedConfig(config)}
                                        className="flex-row justify-between items-center p-3 border-b border-gray-200"
                                    >
                                        <View className="flex-1">
                                            <ThemedText className="font-medium">{config.ssid}</ThemedText>
                                            <ThemedText className="text-xs text-gray-500">••••••••</ThemedText>
                                        </View>
                                        <View className="flex-row space-x-2">
                                            <Button
                                                variant="ghost"
                                                onPress={(e) => {
                                                    e?.stopPropagation();
                                                    loadSavedConfig(config);
                                                }}
                                                className="py-1 px-2"
                                            >
                                                <Text className="text-xs text-blue-600">Use</Text>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                onPress={(e) => {
                                                    e?.stopPropagation();
                                                    Alert.alert(
                                                        'Delete Configuration',
                                                        `Remove saved WiFi config for ${config.ssid}?`,
                                                        [
                                                            { text: 'Cancel', style: 'cancel' },
                                                            {
                                                                text: 'Delete',
                                                                style: 'destructive',
                                                                onPress: () => deleteSavedConfig(config.ssid)
                                                            }
                                                        ]
                                                    );
                                                }}
                                                className="py-1 px-2"
                                            >
                                                <Text className="text-xs text-red-600">Delete</Text>
                                            </Button>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <TextInput
                            value={wifiSSID}
                            onChangeText={setWifiSSID}
                            placeholder="Enter Wi-Fi SSID"
                            autoCapitalize="none"
                            autoCorrect={false}
                            className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
                        />
                    </View>

                    {/* Password Input */}
                    <View>
                        <ThemedText className="mb-2 font-medium">Password</ThemedText>
                        <View className="relative">
                            <TextInput
                                value={wifiPassword}
                                onChangeText={setWifiPassword}
                                placeholder="Enter Wi-Fi password"
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
                            />
                            <Button
                                variant="ghost"
                                onPress={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1"
                            >
                                <Text className="text-xs">{showPassword ? 'Hide' : 'Show'}</Text>
                            </Button>
                        </View>
                    </View>

                    {/* Token Info */}
                    {token && (
                        <View className="p-3 bg-green-50 rounded-lg">
                            <ThemedText className="text-green-700 text-xs">
                                ✓ Arkitekt token will be sent to device
                            </ThemedText>
                        </View>
                    )}

                    {!token && (
                        <View className="p-3 bg-yellow-50 rounded-lg">
                            <ThemedText className="text-yellow-700 text-xs">
                                ⚠ Not connected to Arkitekt. Device will not be registered.
                            </ThemedText>
                        </View>
                    )}

                    {/* Save Configuration Checkbox */}
                    {wifiSSID && wifiPassword && (
                        <TouchableOpacity
                            onPress={() => setSaveConfig(!saveConfig)}
                            className="flex-row items-center p-3 bg-gray-50 rounded-lg"
                        >
                            <View className={`w-5 h-5 border-2 rounded mr-3 items-center justify-center ${saveConfig ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                                }`}>
                                {saveConfig && (
                                    <ThemedText className="text-white text-xs">✓</ThemedText>
                                )}
                            </View>
                            <ThemedText className="text-sm flex-1">
                                Save this WiFi configuration for future use
                            </ThemedText>
                        </TouchableOpacity>
                    )}

                    {/* Action Buttons */}
                    <View className="flex-row space-x-2 mt-4">
                        <Button
                            variant="outline"
                            onPress={() => setStep(ProvisioningStep.DEVICE_SELECTED)}
                            className="flex-1"
                        >
                            <Text>Back</Text>
                        </Button>
                        <Button
                            onPress={handleProvision}
                            disabled={!wifiSSID || provisioning.isProvisioning}
                            className="flex-1"
                        >
                            <Text>{provisioning.isProvisioning ? 'Provisioning...' : 'Provision Device'}</Text>
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

    return (
        <ThemedView className="flex-1">
            <ScrollView className="flex-1 p-4">
                {/* Header */}
                <View className="mb-6">
                    <ThemedText className="text-2xl font-bold mb-2">
                        Device Provisioning
                    </ThemedText>
                    <ThemedText className="text-gray-600">
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
        </ThemedView>
    );
}
