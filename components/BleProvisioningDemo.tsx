import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { IMPROV_SERVICE_UUID, useBLEScanner, useImprovProvisioning } from '@/lib/ble';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { Device } from 'react-native-ble-plx';

/**
 * BLE Device Provisioning Component
 * 
 * This component demonstrates:
 * 1. Scanning for BLE devices with Improv Wi-Fi service
 * 2. Connecting to a device
 * 3. Retrieving device manifest
 * 4. Provisioning with Wi-Fi credentials + Arkitekt token
 */
export function BleProvisioningDemo() {
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const [wifiSSID, setWifiSSID] = useState('');
    const [wifiPassword, setWifiPassword] = useState('');

    // Scan for devices with Improv service
    const scanner = useBLEScanner([IMPROV_SERVICE_UUID]);

    // Provisioning hook
    const provisioning = useImprovProvisioning(selectedDevice?.id);

    const handleScan = () => {
        scanner.clearDevices();
        scanner.startScan();

        // Auto-stop after 10 seconds
        setTimeout(() => {
            scanner.stopScan();
        }, 10000);
    };

    const handleDeviceSelect = async (device: Device) => {
        scanner.stopScan();
        setSelectedDevice(device);

        // Optionally get manifest immediately
        // await provisioning.getManifest();
    };

    const handleProvision = async () => {
        if (!selectedDevice) return;

        // In a real app, you would:
        // 1. Get the device manifest
        // 2. Create a redeem token from your Arkitekt server using the manifest
        // 3. Pass that token here

        // For demo purposes, using placeholder values
        const arkitektToken = 'your-redeem-token-here';

        try {
            await provisioning.provision({
                ssid: wifiSSID,
                password: wifiPassword,
                arkitektToken,
            });
        } catch (err) {
            console.error('Provisioning failed:', err);
        }
    };

    return (
        <ThemedView className="flex-1 p-4">
            <ScrollView>
                {/* Scanner Section */}
                <Card className="mb-4">
                    <CardHeader>
                        <CardTitle>1. Scan for Devices</CardTitle>
                        <CardDescription>
                            Looking for devices with Improv Wi-Fi support
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onPress={handleScan}
                            disabled={scanner.isScanning}
                            className="mb-4"
                        >
                            <Text>
                                {scanner.isScanning ? 'Scanning...' : 'Start Scan'}
                            </Text>
                        </Button>

                        {scanner.isScanning && (
                            <View className="flex-row items-center mb-2">
                                <ActivityIndicator size="small" />
                                <ThemedText className="ml-2">Scanning for devices...</ThemedText>
                            </View>
                        )}

                        {scanner.error && (
                            <ThemedText className="text-red-500 mb-2">{scanner.error}</ThemedText>
                        )}

                        {/* Device List */}
                        {scanner.devices.map((device) => (
                            <Button
                                key={device.id}
                                variant={selectedDevice?.id === device.id ? 'default' : 'outline'}
                                onPress={() => handleDeviceSelect(device)}
                                className="mb-2"
                            >
                                <Text>
                                    {device.name || 'Unknown Device'} ({device.id})
                                </Text>
                            </Button>
                        ))}

                        {scanner.devices.length === 0 && !scanner.isScanning && (
                            <ThemedText className="text-gray-500">No devices found</ThemedText>
                        )}
                    </CardContent>
                </Card>

                {/* Device Info Section */}
                {selectedDevice && (
                    <Card className="mb-4">
                        <CardHeader>
                            <CardTitle>2. Device Information</CardTitle>
                            <CardDescription>
                                Selected: {selectedDevice.name || selectedDevice.id}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                onPress={() => provisioning.getManifest()}
                                disabled={provisioning.isProvisioning}
                                className="mb-2"
                            >
                                <Text>Get Device Manifest</Text>
                            </Button>

                            {provisioning.manifest && (
                                <View className="mt-2 p-2 bg-gray-100 rounded">
                                    <ThemedText className="font-bold">Manifest:</ThemedText>
                                    <ThemedText className="text-xs font-mono">
                                        {JSON.stringify(provisioning.manifest, null, 2)}
                                    </ThemedText>
                                </View>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Provisioning Section */}
                {selectedDevice && (
                    <Card className="mb-4">
                        <CardHeader>
                            <CardTitle>3. Provision Device</CardTitle>
                            <CardDescription>
                                Send Wi-Fi credentials and Arkitekt token
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* In a real app, you'd have TextInput components here */}
                            <ThemedText className="mb-2">SSID: {wifiSSID || '(Enter SSID)'}</ThemedText>
                            <ThemedText className="mb-4">Password: {wifiPassword || '(Enter Password)'}</ThemedText>

                            <Button
                                onPress={handleProvision}
                                disabled={provisioning.isProvisioning || !wifiSSID || !wifiPassword}
                                className="mb-2"
                            >
                                <Text>
                                    {provisioning.isProvisioning ? 'Provisioning...' : 'Start Provisioning'}
                                </Text>
                            </Button>

                            {provisioning.status && (
                                <ThemedText className="text-blue-500 mt-2">
                                    {provisioning.status}
                                </ThemedText>
                            )}

                            {provisioning.error && (
                                <ThemedText className="text-red-500 mt-2">
                                    Error: {provisioning.error}
                                </ThemedText>
                            )}
                        </CardContent>
                    </Card>
                )}
            </ScrollView>
        </ThemedView>
    );
}
