import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useBLEDevice, useBLEScanner } from '@/lib/ble';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { Device } from 'react-native-ble-plx';

/**
 * BLE Debug Component
 * 
 * Shows all nearby BLE devices and their detailed information:
 * - Device name, ID, RSSI
 * - All services and their UUIDs
 * - All characteristics for each service
 * - Characteristic properties (read, write, notify, etc.)
 */
export function BleDebug() {
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

    // Scan for ALL BLE devices (no filter)
    const scanner = useBLEScanner();

    // Device connection and service discovery
    const bleDevice = useBLEDevice();

    const handleStartScan = useCallback(() => {
        scanner.clearDevices();
        scanner.startScan();

        // Auto-stop after 20 seconds
        setTimeout(() => {
            scanner.stopScan();
        }, 20000);
    }, [scanner]);

    const handleDeviceSelect = useCallback(async (device: Device) => {
        scanner.stopScan();
        setSelectedDevice(device);

        try {
            await bleDevice.connect(device.id);
            await bleDevice.discoverServices();
        } catch (err) {
            console.error('Failed to connect/discover:', err);
        }
    }, [scanner, bleDevice]);

    const handleDisconnect = useCallback(async () => {
        await bleDevice.disconnect();
        setSelectedDevice(null);
        setExpandedServices(new Set());
    }, [bleDevice]);

    const toggleService = useCallback((serviceUuid: string) => {
        setExpandedServices(prev => {
            const next = new Set(prev);
            if (next.has(serviceUuid)) {
                next.delete(serviceUuid);
            } else {
                next.add(serviceUuid);
            }
            return next;
        });
    }, []);

    const getCharacteristicProperties = (char: any) => {
        const props = [];
        if (char.isReadable) props.push('Read');
        if (char.isWritableWithResponse) props.push('Write');
        if (char.isWritableWithoutResponse) props.push('WriteNoResp');
        if (char.isNotifiable) props.push('Notify');
        if (char.isIndicatable) props.push('Indicate');
        return props.join(', ') || 'None';
    };

    const renderScanningView = () => (
        <Card className="mb-4">
            <CardHeader>
                <CardTitle>Scan for All BLE Devices</CardTitle>
                <CardDescription>
                    Debug view - shows all nearby Bluetooth devices
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
                            Scanning for all BLE devices...
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
                    <ThemedText className="font-semibold mb-2">
                        Found {scanner.devices.length} device(s)
                    </ThemedText>

                    {scanner.devices.map((device) => (
                        <TouchableOpacity
                            key={device.id}
                            onPress={() => handleDeviceSelect(device)}
                            className="p-3 border border-gray-300 rounded-lg bg-white"
                        >
                            <View className="flex-row justify-between items-start">
                                <View className="flex-1">
                                    <Text className="font-semibold">
                                        {device.name || 'Unnamed Device'}
                                    </Text>
                                    <Text className="text-xs text-gray-500 mt-1">
                                        ID: {device.id}
                                    </Text>
                                    {device.localName && device.localName !== device.name && (
                                        <Text className="text-xs text-gray-500">
                                            Local: {device.localName}
                                        </Text>
                                    )}
                                </View>
                                <View className="items-end">
                                    <Text className="text-xs font-medium">
                                        {device.rssi} dBm
                                    </Text>
                                    {device.serviceUUIDs && device.serviceUUIDs.length > 0 && (
                                        <Text className="text-xs text-blue-600 mt-1">
                                            {device.serviceUUIDs.length} service(s)
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {scanner.devices.length === 0 && !scanner.isScanning && (
                    <View className="p-6 items-center">
                        <ThemedText className="text-gray-500 text-center">
                            No devices found. Make sure Bluetooth is enabled.
                        </ThemedText>
                    </View>
                )}
            </CardContent>
        </Card>
    );

    const renderDeviceDetails = () => {
        if (!selectedDevice) return null;

        return (
            <>
                {/* Device Info Card */}
                <Card className="mb-4">
                    <CardHeader>
                        <CardTitle>Device Information</CardTitle>
                        <CardDescription>
                            {selectedDevice.name || 'Unnamed Device'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <View className="space-y-2">
                            <View className="flex-row justify-between">
                                <ThemedText className="text-gray-600">Connection:</ThemedText>
                                <ThemedText className={bleDevice.isConnected ? "text-green-600 font-semibold" : "text-red-600"}>
                                    {bleDevice.isConnected ? 'Connected' : 'Disconnected'}
                                </ThemedText>
                            </View>

                            <View className="flex-row justify-between">
                                <ThemedText className="text-gray-600">Device ID:</ThemedText>
                                <ThemedText className="font-mono text-xs flex-1 text-right">
                                    {selectedDevice.id.substring(0, 24)}...
                                </ThemedText>
                            </View>

                            <View className="flex-row justify-between">
                                <ThemedText className="text-gray-600">RSSI:</ThemedText>
                                <ThemedText className="font-semibold">
                                    {selectedDevice.rssi} dBm
                                </ThemedText>
                            </View>

                            {selectedDevice.manufacturerData && (
                                <View className="flex-row justify-between">
                                    <ThemedText className="text-gray-600">Manufacturer Data:</ThemedText>
                                    <ThemedText className="font-mono text-xs">
                                        {selectedDevice.manufacturerData}
                                    </ThemedText>
                                </View>
                            )}

                            {selectedDevice.serviceUUIDs && selectedDevice.serviceUUIDs.length > 0 && (
                                <View>
                                    <ThemedText className="text-gray-600 mb-1">Advertised Services:</ThemedText>
                                    {selectedDevice.serviceUUIDs.map(uuid => (
                                        <ThemedText key={uuid} className="font-mono text-xs ml-2">
                                            • {uuid}
                                        </ThemedText>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View className="flex-row space-x-2 mt-4">
                            <Button
                                variant="outline"
                                onPress={handleDisconnect}
                                className="flex-1"
                            >
                                <Text>Disconnect</Text>
                            </Button>
                            {bleDevice.isConnected && bleDevice.services.length === 0 && (
                                <Button
                                    onPress={() => bleDevice.discoverServices()}
                                    className="flex-1"
                                >
                                    <Text>Discover Services</Text>
                                </Button>
                            )}
                        </View>

                        {bleDevice.error && (
                            <View className="mt-3 p-3 bg-red-50 rounded-lg">
                                <ThemedText className="text-red-700 text-sm">
                                    {bleDevice.error}
                                </ThemedText>
                            </View>
                        )}
                    </CardContent>
                </Card>

                {/* Services & Characteristics */}
                {bleDevice.services.length > 0 && (
                    <Card className="mb-4">
                        <CardHeader>
                            <CardTitle>Services & Characteristics</CardTitle>
                            <CardDescription>
                                {bleDevice.services.length} service(s) discovered
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <View className="space-y-3">
                                {bleDevice.services.map((service) => (
                                    <View key={service.uuid} className="border border-gray-300 rounded-lg overflow-hidden">
                                        {/* Service Header */}
                                        <TouchableOpacity
                                            onPress={() => toggleService(service.uuid)}
                                            className="p-3 bg-gray-50 flex-row justify-between items-center"
                                        >
                                            <View className="flex-1">
                                                <Text className="font-semibold">Service</Text>
                                                <Text className="font-mono text-xs text-gray-600 mt-1">
                                                    {service.uuid}
                                                </Text>
                                            </View>
                                            <View className="flex-row items-center">
                                                <Text className="text-xs text-gray-500 mr-2">
                                                    {service.characteristics.length} char(s)
                                                </Text>
                                                <Text className="text-lg">
                                                    {expandedServices.has(service.uuid) ? '▼' : '▶'}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>

                                        {/* Characteristics (expandable) */}
                                        {expandedServices.has(service.uuid) && (
                                            <View className="p-3 bg-white space-y-2">
                                                {service.characteristics.map((char) => (
                                                    <View key={char.uuid} className="p-2 bg-gray-50 rounded">
                                                        <Text className="font-mono text-xs text-gray-800">
                                                            {char.uuid}
                                                        </Text>
                                                        <Text className="text-xs text-gray-600 mt-1">
                                                            Properties: {getCharacteristicProperties(char)}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </View>
                        </CardContent>
                    </Card>
                )}
            </>
        );
    };

    return (
        <ThemedView className="flex-1">
            <ScrollView className="flex-1 p-4">
                {/* Header */}
                <View className="mb-6">
                    <ThemedText className="text-2xl font-bold mb-2">
                        BLE Device Debug
                    </ThemedText>
                    <ThemedText className="text-gray-600">
                        Scan and inspect all nearby Bluetooth devices
                    </ThemedText>
                </View>

                {!selectedDevice && renderScanningView()}
                {selectedDevice && renderDeviceDetails()}
            </ScrollView>
        </ThemedView>
    );
}
