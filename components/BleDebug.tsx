import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Text } from '@/components/ui/text';
import { useBLEDevice, useBLEScanner } from '@/lib/ble';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
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
        <View className="gap-4">
            <View className="bg-card border border-border rounded-2xl p-5">
                <Text className="text-lg font-semibold text-foreground mb-1">Scan for Devices</Text>
                <Text className="text-sm text-muted-foreground mb-4">
                    Shows all nearby Bluetooth devices
                </Text>

                <Button
                    onPress={handleStartScan}
                    disabled={scanner.isScanning}
                    className="mb-4"
                >
                    <Text className="text-primary-foreground font-medium">
                        {scanner.isScanning ? 'Scanning...' : 'Start Scan'}
                    </Text>
                </Button>

                {scanner.isScanning && (
                    <View className="flex-row items-center mb-4 p-3 bg-primary/10 rounded-xl">
                        <ActivityIndicator size="small" color="hsl(165, 50%, 55%)" />
                        <Text className="ml-3 text-primary text-sm">
                            Scanning for BLE devices...
                        </Text>
                    </View>
                )}

                {scanner.error && (
                    <View className="mb-4 p-3 bg-destructive/10 rounded-xl">
                        <Text className="text-destructive text-sm">{scanner.error}</Text>
                    </View>
                )}
            </View>

            {/* Device List */}
            {(scanner.devices.length > 0 || scanner.isScanning) && (
                <View className="bg-card border border-border rounded-2xl p-5">
                    <Text className="font-semibold text-foreground mb-3">
                        Found {scanner.devices.length} device(s)
                    </Text>

                    <View className="gap-2">
                        {scanner.devices.map((device) => (
                            <Pressable
                                key={device.id}
                                onPress={() => handleDeviceSelect(device)}
                                className="p-3 border border-border rounded-xl bg-muted active:bg-accent"
                            >
                                <View className="flex-row justify-between items-start">
                                    <View className="flex-1">
                                        <Text className="font-semibold text-card-foreground text-sm">
                                            {device.name || 'Unnamed Device'}
                                        </Text>
                                        <Text className="text-xs text-muted-foreground mt-1">
                                            {device.id}
                                        </Text>
                                        {device.localName && device.localName !== device.name && (
                                            <Text className="text-xs text-muted-foreground">
                                                Local: {device.localName}
                                            </Text>
                                        )}
                                    </View>
                                    <View className="items-end">
                                        <Text className="text-xs font-medium text-foreground">
                                            {device.rssi} dBm
                                        </Text>
                                        {device.serviceUUIDs && device.serviceUUIDs.length > 0 && (
                                            <Text className="text-xs text-primary mt-1">
                                                {device.serviceUUIDs.length} service(s)
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </Pressable>
                        ))}
                    </View>

                    {scanner.devices.length === 0 && scanner.isScanning && (
                        <View className="py-6 items-center">
                            <Text className="text-muted-foreground text-sm text-center">
                                Searching for devices...
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {scanner.devices.length === 0 && !scanner.isScanning && (
                <View className="py-8 items-center">
                    <View className="p-4 rounded-2xl bg-muted mb-4">
                        <IconSymbol name="antenna.radiowaves.left.and.right" size={32} color="hsl(165, 10%, 65%)" />
                    </View>
                    <Text className="text-muted-foreground text-sm text-center">
                        No devices found. Tap scan to search.
                    </Text>
                </View>
            )}
        </View>
    );

    const renderDeviceDetails = () => {
        if (!selectedDevice) return null;

        return (
            <View className="gap-4">
                {/* Device Info */}
                <View className="bg-card border border-border rounded-2xl p-5">
                    <Text className="text-lg font-semibold text-foreground mb-1">Device Information</Text>
                    <Text className="text-sm text-muted-foreground mb-4">
                        {selectedDevice.name || 'Unnamed Device'}
                    </Text>

                    <View className="gap-3">
                        <View className="flex-row justify-between items-center">
                            <Text className="text-muted-foreground text-sm">Connection</Text>
                            <View className={`px-2.5 py-1 rounded-full ${bleDevice.isConnected ? 'bg-primary/15' : 'bg-destructive/15'}`}>
                                <Text className={`text-xs font-medium ${bleDevice.isConnected ? 'text-primary' : 'text-destructive'}`}>
                                    {bleDevice.isConnected ? 'Connected' : 'Disconnected'}
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row justify-between items-center">
                            <Text className="text-muted-foreground text-sm">Device ID</Text>
                            <Text className="font-mono text-xs text-card-foreground flex-shrink">
                                {selectedDevice.id.substring(0, 20)}...
                            </Text>
                        </View>

                        <View className="flex-row justify-between items-center">
                            <Text className="text-muted-foreground text-sm">RSSI</Text>
                            <Text className="font-semibold text-sm text-foreground">
                                {selectedDevice.rssi} dBm
                            </Text>
                        </View>

                        {selectedDevice.manufacturerData && (
                            <View className="flex-row justify-between items-center">
                                <Text className="text-muted-foreground text-sm">Manufacturer</Text>
                                <Text className="font-mono text-xs text-card-foreground">
                                    {selectedDevice.manufacturerData}
                                </Text>
                            </View>
                        )}

                        {selectedDevice.serviceUUIDs && selectedDevice.serviceUUIDs.length > 0 && (
                            <View>
                                <Text className="text-muted-foreground text-sm mb-2">Advertised Services</Text>
                                {selectedDevice.serviceUUIDs.map(uuid => (
                                    <Text key={uuid} className="font-mono text-xs text-card-foreground ml-2 mb-1">
                                        • {uuid}
                                    </Text>
                                ))}
                            </View>
                        )}
                    </View>

                    <View className="flex-row gap-3 mt-5">
                        <Button
                            variant="outline"
                            onPress={handleDisconnect}
                            className="flex-1"
                        >
                            <Text className="text-foreground">Disconnect</Text>
                        </Button>
                        {bleDevice.isConnected && bleDevice.services.length === 0 && (
                            <Button
                                onPress={() => bleDevice.discoverServices()}
                                className="flex-1"
                            >
                                <Text className="text-primary-foreground font-medium">Discover</Text>
                            </Button>
                        )}
                    </View>

                    {bleDevice.error && (
                        <View className="mt-3 p-3 bg-destructive/10 rounded-xl">
                            <Text className="text-destructive text-sm">{bleDevice.error}</Text>
                        </View>
                    )}
                </View>

                {/* Services & Characteristics */}
                {bleDevice.services.length > 0 && (
                    <View className="bg-card border border-border rounded-2xl p-5">
                        <Text className="text-lg font-semibold text-foreground mb-1">Services & Characteristics</Text>
                        <Text className="text-sm text-muted-foreground mb-4">
                            {bleDevice.services.length} service(s) discovered
                        </Text>

                        <View className="gap-3">
                            {bleDevice.services.map((service) => (
                                <View key={service.uuid} className="border border-border rounded-xl overflow-hidden">
                                    {/* Service Header */}
                                    <Pressable
                                        onPress={() => toggleService(service.uuid)}
                                        className="p-3 bg-muted flex-row justify-between items-center active:bg-accent"
                                    >
                                        <View className="flex-1">
                                            <Text className="font-semibold text-sm text-card-foreground">Service</Text>
                                            <Text className="font-mono text-xs text-muted-foreground mt-1">
                                                {service.uuid}
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center">
                                            <Text className="text-xs text-muted-foreground mr-2">
                                                {service.characteristics.length} char(s)
                                            </Text>
                                            <IconSymbol
                                                name={expandedServices.has(service.uuid) ? "chevron.right" : "chevron.right"}
                                                size={14}
                                                color="hsl(165, 10%, 65%)"
                                                style={{ transform: [{ rotate: expandedServices.has(service.uuid) ? '90deg' : '0deg' }] }}
                                            />
                                        </View>
                                    </Pressable>

                                    {/* Characteristics (expandable) */}
                                    {expandedServices.has(service.uuid) && (
                                        <View className="p-3 gap-2">
                                            {service.characteristics.map((char) => (
                                                <View key={char.uuid} className="p-2.5 bg-muted rounded-lg">
                                                    <Text className="font-mono text-xs text-card-foreground">
                                                        {char.uuid}
                                                    </Text>
                                                    <Text className="text-xs text-muted-foreground mt-1">
                                                        {getCharacteristicProperties(char)}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View className="flex-1 bg-background">
            <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
                {/* Header */}
                <View>
                    <Text className="text-2xl font-bold text-foreground mb-1">
                        BLE Debug
                    </Text>
                    <Text className="text-muted-foreground text-sm">
                        Scan and inspect nearby Bluetooth devices
                    </Text>
                </View>

                {!selectedDevice && renderScanningView()}
                {selectedDevice && renderDeviceDetails()}
            </ScrollView>
        </View>
    );
}
