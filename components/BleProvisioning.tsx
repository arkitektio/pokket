import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { App } from '@/lib/app/App';
import { IMPROV_SERVICE_UUID, useBLEScanner, useImprovProvisioning } from '@/lib/ble';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, TextInput, View } from 'react-native';
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
 * - Wi-Fi credentials via Improv protocol
 * - Arkitekt token via custom BLE characteristic
 */
export function BleProvisioning() {
    const [step, setStep] = useState<ProvisioningStep>(ProvisioningStep.SCANNING);
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const [wifiSSID, setWifiSSID] = useState('');
    const [wifiPassword, setWifiPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Get token from Arkitekt connection
    const token = App.useToken();

    // Scan for devices with Improv service
    const scanner = useBLEScanner([IMPROV_SERVICE_UUID]);

    // Provisioning hook
    const provisioning = useImprovProvisioning(selectedDevice?.id);

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
            await provisioning.getManifest();
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

        try {
            await provisioning.provision({
                ssid: wifiSSID,
                password: wifiPassword,
                arkitektToken: token,
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
    }, [selectedDevice, wifiSSID, wifiPassword, token, provisioning, handleReset]);

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
                    disabled={scanner.isScanning}
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
                    >
                        <Text>Back</Text>
                    </Button>
                    <Button
                        onPress={handleContinueToCredentials}
                        className="flex-1"
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
                    {/* SSID Input */}
                    <View>
                        <ThemedText className="mb-2 font-medium">Network Name (SSID)</ThemedText>
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
                            disabled={!wifiSSID}
                            className="flex-1"
                        >
                            <Text>Provision Device</Text>
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
