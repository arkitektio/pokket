import { useAlertDialog } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { WifiProfile, useWifiProfiles } from '@/hooks/useWifiProfiles';
import { App } from '@/lib/app/App';
import { useBLEScanner } from '@/lib/ble';
import { runProvisioning, ProvisionError, type ProvisionProgress } from '@/lib/ble/provisioning/flow';
import { connectGatt, type GattConnection } from '@/lib/ble/provisioning/gatt';
import {
    PROVISIONING_SERVICE,
    deploymentOrigin,
    openProvisioningDevice,
    statusText,
    type DeviceInfo,
    type ProvisioningDevice,
} from '@/lib/ble/provisioning/protocol';
import { findStandingMandate } from '@/lib/ble/provisioning/standing';
import { WifiProfileValidationError, validateWifiProfile } from '@/lib/ble/validation';
import { manifest as appManifest } from '@/lib/constants';
import {
    useCreateMandateMutation,
    useIssueChildMandateKeyMutation,
    useRevokeMandateMutation,
    useStandingMandatesLazyQuery,
} from '@/lib/lok/api/graphql';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Link } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from 'react-native';
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
    { key: ProvisioningStep.DEVICE_SELECTED, label: 'Inspect' },
    { key: ProvisioningStep.CREDENTIALS, label: 'Configure' },
    { key: ProvisioningStep.COMPLETE, label: 'Done' },
];

function getStepIndex(step: ProvisioningStep): number {
    if (step === ProvisioningStep.PROVISIONING) return 2; // provisioning maps to configure
    return STEPS.findIndex((s) => s.key === step);
}

function StepIndicator({ currentStep }: { currentStep: ProvisioningStep }) {
    const colors = useThemeColors();
    const activeIndex = getStepIndex(currentStep);
    return (
        <View className="flex-row items-center justify-between mb-6 px-2">
            {STEPS.map((item, index) => {
                const isActive = index === activeIndex;
                const isCompleted = index < activeIndex;
                return (
                    <React.Fragment key={item.key}>
                        {index > 0 && (
                            <View className={`flex-1 h-px mx-1 ${isCompleted ? 'bg-primary' : 'bg-zinc-700'}`} />
                        )}
                        <View className="items-center">
                            <View
                                className={`w-7 h-7 rounded-full items-center justify-center ${
                                    isActive ? 'bg-primary' : isCompleted ? 'bg-primary/30' : 'bg-zinc-800'
                                } ${isActive ? 'border-2 border-primary' : isCompleted ? 'border border-primary/50' : 'border border-zinc-700'}`}
                            >
                                {isCompleted ? (
                                    <IconSymbol name="checkmark" size={12} color={colors.primary} />
                                ) : (
                                    <View className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-zinc-600'}`} />
                                )}
                            </View>
                            <Text className={`text-[10px] mt-1 ${
                                isActive ? 'text-primary font-semibold' : isCompleted ? 'text-primary/60' : 'text-zinc-500'
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

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <View className="flex-row justify-between items-center gap-3">
            <Text className="text-muted-foreground text-xs">{label}</Text>
            <Text className={`text-card-foreground text-xs flex-shrink ${mono ? 'font-mono' : ''}`} numberOfLines={1}>
                {value}
            </Text>
        </View>
    );
}

const PHASE_TEXT: Record<ProvisionProgress['phase'], string> = {
    issuing: 'Issuing a key for the device',
    sending: 'Sending the configuration',
    waiting: 'Waiting for the device',
    done: 'Done',
    failed: 'Failed',
};

/** A device connected over BLE that speaks provisioning v2, with its info. */
type Connected = { gatt: GattConnection; device: ProvisioningDevice; info: DeviceInfo };

/**
 * BLE device provisioning, GATT v2 (lib/ble/provisioning), the flow
 * orkestrator has: find a device in pairing mode, read what it is (its app
 * manifest and device id), issue it a mandate key pinned to that device id
 * under this app's standing mandate for its app, and send it Wi-Fi, this
 * hub's origin and the key in one document; then follow its status until it
 * registers.
 */
export function BleProvisioning() {
    const colors = useThemeColors();
    const [step, setStep] = useState<ProvisioningStep>(ProvisioningStep.SCANNING);
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const [connecting, setConnecting] = useState(false);
    const [connected, setConnected] = useState<Connected | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<WifiProfile | null>(null);
    const [progress, setProgress] = useState<ProvisionProgress | null>(null);
    /** The mandate whose key the device holds once a run committed it: a retry sends no new key. */
    const [heldMandate, setHeldMandate] = useState<string | null>(null);
    /** Whether the device's key may ask lok for a mesh key (the standing mandate's `allowMesh`). */
    const [allowMesh, setAllowMesh] = useState(true);
    const connectedRef = useRef<Connected | null>(null);

    const connection = App.useConnection();
    const baseUrl = connection?.endpoint?.base_url;
    const origin = baseUrl ? deploymentOrigin(baseUrl) : null;
    const hubName = connection?.endpoint?.name || origin || 'the hub';

    const scanner = useBLEScanner([PROVISIONING_SERVICE]);
    const { profiles, loading: profilesLoading } = useWifiProfiles();
    const alert = useAlertDialog();

    const [loadMandates] = useStandingMandatesLazyQuery({ fetchPolicy: 'network-only' });
    const [createMandate] = useCreateMandateMutation();
    const [issueChildMandateKey] = useIssueChildMandateKeyMutation();
    const [revokeMandate] = useRevokeMandateMutation();

    const disconnect = useCallback(async () => {
        const current = connectedRef.current;
        connectedRef.current = null;
        setConnected(null);
        await current?.gatt.disconnect();
    }, []);

    // Leaving the screen lets the device go.
    useEffect(() => () => void connectedRef.current?.gatt.disconnect(), []);

    const handleStartScan = useCallback(() => {
        scanner.clearDevices();
        scanner.startScan();
        setStep(ProvisioningStep.SCANNING);
        // Auto-stop after 15 seconds
        setTimeout(() => scanner.stopScan(), 15000);
    }, [scanner]);

    const handleReset = useCallback(() => {
        void disconnect();
        setStep(ProvisioningStep.SCANNING);
        setSelectedDevice(null);
        setSelectedProfile(null);
        setProgress(null);
        setHeldMandate(null);
        scanner.clearDevices();
    }, [scanner, disconnect]);

    const handleDeviceSelect = useCallback(async (device: Device) => {
        scanner.stopScan();
        await disconnect();
        setSelectedDevice(device);
        setHeldMandate(null);
        setStep(ProvisioningStep.DEVICE_SELECTED);
        setConnecting(true);
        try {
            const gatt = await connectGatt(device.id);
            try {
                const provisioning = openProvisioningDevice(gatt);
                const info = await provisioning.readInfo();
                const next = { gatt, device: provisioning, info };
                connectedRef.current = next;
                setConnected(next);
            } catch (error) {
                await gatt.disconnect();
                throw error;
            }
        } catch (error) {
            alert.show(
                'Incompatible Device',
                error instanceof Error ? error.message : String(error),
                [{ label: 'Back to Scan', onPress: handleReset }],
            );
        } finally {
            setConnecting(false);
        }
    }, [scanner, disconnect, alert, handleReset]);

    const handleProvision = useCallback(async () => {
        if (!connected) {
            alert.show('Error', 'The device is not connected.');
            return;
        }
        if (!selectedProfile) {
            alert.show('Error', 'Please select a Wi-Fi profile.');
            return;
        }
        if (!origin) {
            alert.show('Error', 'Not connected to a hub. Connect first: the device gets its key from it.');
            return;
        }
        try {
            validateWifiProfile(selectedProfile);
        } catch (err) {
            const details = err instanceof WifiProfileValidationError
                ? err.issues.map((i) => `• ${i.path.join('.')}: ${i.message}`).join('\n')
                : err instanceof Error ? err.message : String(err);
            alert.show('Invalid Wi-Fi Profile', details);
            return;
        }

        setStep(ProvisioningStep.PROVISIONING);
        setProgress(null);
        try {
            await runProvisioning({
                device: connected.device,
                info: connected.info,
                wifi: selectedProfile,
                origin,
                existing: heldMandate ? { mandateId: heldMandate } : undefined,
                onDropped: connected.gatt.onDisconnected,
                onProgress: (p) => {
                    setProgress(p);
                    if (p.mandateId) setHeldMandate(p.mandateId);
                },
                issueKey: async ({ manifest }) => {
                    // The standing mandate this app holds for the firmware's app and this mesh
                    // permission, made on first use.
                    const { data: live, error } = await loadMandates();
                    if (error) throw error;
                    let parentId = findStandingMandate(live?.mandates ?? [], appManifest.identifier, manifest.identifier, allowMesh)?.id;
                    if (!parentId) {
                        const { data } = await createMandate({
                            variables: {
                                input: {
                                    agent: appManifest.identifier,
                                    // Its scopes and requirements are the ceiling for every device key under it.
                                    manifest: {
                                        identifier: manifest.identifier,
                                        version: manifest.version,
                                        scopes: manifest.scopes,
                                        requirements: manifest.requirements.map((r) => ({
                                            key: r.key,
                                            service: r.service,
                                            optional: r.optional,
                                            description: r.description ?? null,
                                        })),
                                    },
                                    // As long as this app's sign-in lasts.
                                    expiresInDays: null,
                                    // Every device key under it inherits this: its login brings a mesh key.
                                    allowMesh,
                                },
                            },
                        });
                        parentId = data?.createMandate.id;
                        if (!parentId) throw new Error('lok created no mandate.');
                    }
                    // One key per device, pinned to the id the DEVICE reports (never the Bluetooth peripheral id).
                    const { data } = await issueChildMandateKey({
                        variables: {
                            input: { mandate: parentId, deviceId: manifest.device_id, label: `${manifest.device_id} via Bluetooth (pokket)` },
                        },
                    });
                    if (!data?.issueChildMandateKey) throw new Error('lok issued no key.');
                    return { key: data.issueChildMandateKey.key, mandateId: data.issueChildMandateKey.mandate.id };
                },
                revokeKey: async (id) => {
                    await revokeMandate({ variables: { id } });
                },
            });
            setStep(ProvisioningStep.COMPLETE);
        } catch (error) {
            if (error instanceof ProvisionError && error.mandateId) setHeldMandate(error.mandateId);
            // The progress carries the failure; the step shows it, with a retry.
        }
    }, [connected, selectedProfile, origin, heldMandate, allowMesh, alert, loadMandates, createMandate, issueChildMandateKey, revokeMandate]);

    const renderScanningStep = () => (
        <View className="flex-1">
            <Text className="text-lg font-semibold text-foreground mb-1">Find Your Device</Text>
            <Text className="text-sm text-muted-foreground mb-5">Scan for nearby devices in pairing mode</Text>

            <Button onPress={handleStartScan} disabled={scanner.isScanning} className="mb-5">
                <View className="flex-row items-center gap-2">
                    <IconSymbol name={scanner.isScanning ? 'antenna.radiowaves.left.and.right' : 'magnifyingglass'} size={16} color="#fff" />
                    <Text className="text-white font-medium">{scanner.isScanning ? 'Scanning...' : 'Start Scan'}</Text>
                </View>
            </Button>

            {scanner.isScanning && (
                <View className="flex-row items-center mb-4 p-3 bg-primary/10 rounded-xl border border-primary/20">
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text className="ml-3 text-primary text-sm">Scanning for nearby devices...</Text>
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
                        className="flex-row items-center p-4 bg-card rounded-xl border border-border active:bg-accent"
                    >
                        <View className="w-10 h-10 rounded-full bg-primary/15 items-center justify-center mr-3">
                            <IconSymbol name="wifi" size={18} color={colors.primary} />
                        </View>
                        <View className="flex-1">
                            <Text className="font-semibold text-card-foreground text-sm">{device.name || 'Unknown Device'}</Text>
                            <Text className="text-xs text-muted-foreground mt-0.5">{device.rssi ?? '?'} dBm</Text>
                        </View>
                        <IconSymbol name="chevron.right" size={14} color={colors.mutedForeground} />
                    </Pressable>
                ))}
            </View>

            {scanner.devices.length === 0 && !scanner.isScanning && (
                <View className="py-12 items-center">
                    <View className="w-16 h-16 rounded-full bg-card items-center justify-center mb-4">
                        <IconSymbol name="wifi" size={28} color={colors.mutedForeground} />
                    </View>
                    <Text className="text-muted-foreground text-center text-sm">
                        No devices found.{'\n'}Make sure your device is in pairing mode.
                    </Text>
                </View>
            )}
        </View>
    );

    const renderDeviceSelectedStep = () => {
        const info = connected?.info;
        return (
            <View className="flex-1">
                <Text className="text-lg font-semibold text-foreground mb-1">Device Details</Text>
                <Text className="text-sm text-muted-foreground mb-5">{selectedDevice?.name || 'Unknown Device'}</Text>

                {connecting && (
                    <View className="p-5 bg-primary/10 rounded-xl border border-primary/20 mb-4 items-center">
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text className="text-primary text-sm mt-3">Connecting and reading the device...</Text>
                    </View>
                )}

                {info && !connecting && (
                    <View className="p-4 bg-card rounded-xl border border-border mb-4 gap-2">
                        <Row label="App" value={info.manifest.identifier} mono />
                        <Row label="Version" value={info.manifest.version} />
                        <Row label="Device id" value={info.manifest.device_id} mono />
                        {info.build ? <Row label="Firmware" value={info.build} mono /> : null}
                        <Row label="State" value={info.state ?? '—'} />
                        <Row label="Holds a key" value={info.has_key ? 'yes' : 'no'} />
                        <Row label="Has Wi-Fi" value={info.has_wifi ? 'yes' : 'no'} />
                        {info.manifest.requirements.length > 0 && (
                            <Row label="Needs" value={info.manifest.requirements.map((r) => r.key).join(', ')} />
                        )}
                    </View>
                )}

                <View className="flex-row gap-3 mt-auto">
                    <Button variant="outline" onPress={handleReset} className="flex-1 border-border">
                        <View className="flex-row items-center gap-2">
                            <IconSymbol name="chevron.left" size={14} color={colors.mutedForeground} />
                            <Text className="text-muted-foreground">Back</Text>
                        </View>
                    </Button>
                    <Button onPress={() => setStep(ProvisioningStep.CREDENTIALS)} disabled={!info || connecting} className="flex-1">
                        <View className="flex-row items-center gap-2">
                            <Text className="text-primary-foreground font-medium">Continue</Text>
                            <IconSymbol name="arrow.right" size={14} color={colors.primaryForeground} />
                        </View>
                    </Button>
                </View>
            </View>
        );
    };

    const renderCredentialsStep = () => (
        <View className="flex-1">
            <Text className="text-lg font-semibold text-foreground mb-1">Wi-Fi Configuration</Text>
            <Text className="text-sm text-muted-foreground mb-5">Select a saved Wi-Fi profile</Text>

            <View className="gap-2 mb-4">
                {profiles.map((profile, index) => {
                    const selected = selectedProfile === profile;
                    return (
                        <Pressable
                            key={index}
                            onPress={() => setSelectedProfile(profile)}
                            className={`p-4 rounded-xl border ${selected ? 'border-primary/50 bg-primary/10' : 'border-border bg-card'} active:bg-accent`}
                        >
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${selected ? 'bg-primary/20' : 'bg-muted'}`}>
                                        <IconSymbol
                                            name={profile.type === 'eduroam' ? 'building.2.fill' : 'wifi'}
                                            size={18}
                                            color={selected ? colors.primary : colors.mutedForeground}
                                        />
                                    </View>
                                    <View>
                                        <Text className={`font-medium text-sm ${selected ? 'text-primary' : 'text-card-foreground'}`}>{profile.ssid}</Text>
                                        <Text className="text-xs text-muted-foreground mt-0.5">
                                            {profile.type === 'eduroam' ? 'Eduroam' : 'Standard Wi-Fi'}
                                        </Text>
                                    </View>
                                </View>
                                {selected && <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />}
                            </View>
                        </Pressable>
                    );
                })}
            </View>

            <Link href="/wifi" asChild>
                <Button variant="outline" className="border-border mb-4">
                    <View className="flex-row items-center gap-2">
                        <IconSymbol name="plus" size={14} color={colors.mutedForeground} />
                        <Text className="text-muted-foreground">Add New Profile</Text>
                    </View>
                </Button>
            </Link>

            <View className="flex-row items-center justify-between p-4 bg-card rounded-xl border border-border mb-3">
                <View className="flex-1 pr-3">
                    <Text className="text-card-foreground text-sm font-medium">Join the mesh</Text>
                    <Text className="text-xs text-muted-foreground mt-0.5">
                        {heldMandate
                            ? 'Decided when the device got its key.'
                            : "The device's sign-in brings a mesh key, so it reaches the hub's mesh-only services."}
                    </Text>
                </View>
                <Switch value={allowMesh} onValueChange={setAllowMesh} disabled={!!heldMandate} />
            </View>

            {origin ? (
                <View className="p-3 bg-green-500/10 rounded-xl border border-green-500/20 mb-3">
                    <Text className="text-green-400 text-xs">
                        {heldMandate
                            ? `✓ The device keeps the key it got, and signs in to ${hubName}`
                            : `✓ The device gets a key of its own, and signs in to ${hubName}`}
                    </Text>
                </View>
            ) : (
                <View className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20 mb-3">
                    <Text className="text-yellow-400 text-xs">⚠ Not connected to a hub. Connect first: the device gets its key from it.</Text>
                </View>
            )}

            <View className="flex-row gap-3 mt-auto">
                <Button variant="outline" onPress={() => setStep(ProvisioningStep.DEVICE_SELECTED)} className="flex-1 border-border">
                    <View className="flex-row items-center gap-2">
                        <IconSymbol name="chevron.left" size={14} color={colors.mutedForeground} />
                        <Text className="text-muted-foreground">Back</Text>
                    </View>
                </Button>
                <Button onPress={handleProvision} disabled={!selectedProfile || !origin || !connected} className="flex-1">
                    <View className="flex-row items-center gap-2">
                        <IconSymbol name="bolt.fill" size={14} color={colors.primaryForeground} />
                        <Text className="text-primary-foreground font-medium">Provision</Text>
                    </View>
                </Button>
            </View>
        </View>
    );

    const renderProvisioningStep = () => {
        const failed = progress?.phase === 'failed';
        return (
            <View className="flex-1">
                <Text className="text-lg font-semibold text-foreground mb-1">{failed ? 'Provisioning failed' : 'Provisioning'}</Text>
                <Text className="text-sm text-muted-foreground mb-5">{selectedDevice?.name || 'Device'}</Text>

                <View className={`p-5 rounded-xl border mb-4 ${failed ? 'bg-red-500/10 border-red-500/20' : 'bg-primary/10 border-primary/20'}`}>
                    <View className="flex-row items-center mb-2">
                        {failed ? (
                            <IconSymbol name="xmark.circle.fill" size={18} color="#f87171" />
                        ) : (
                            <ActivityIndicator size="small" color={colors.primary} />
                        )}
                        <Text className={`ml-3 text-sm font-medium ${failed ? 'text-red-400' : 'text-primary'}`}>
                            {progress ? PHASE_TEXT[progress.phase] : 'Starting'}
                            {progress?.phase === 'sending' && progress.sent !== undefined ? ` (${Math.round(progress.sent * 100)}%)` : ''}
                        </Text>
                    </View>
                    {progress?.status && (
                        <Text className="text-xs text-muted-foreground">Device: {statusText(progress.status)}</Text>
                    )}
                    {progress?.status?.detail && (
                        <Text className="text-xs text-muted-foreground mt-1">{progress.status.detail}</Text>
                    )}
                    {failed && progress?.error && <Text className="text-xs text-red-300 mt-2">{progress.error}</Text>}
                </View>

                {failed && (
                    <View className="flex-row gap-3 mt-auto">
                        <Button variant="outline" onPress={handleReset} className="flex-1 border-border">
                            <Text className="text-muted-foreground">Start over</Text>
                        </Button>
                        <Button onPress={() => setStep(ProvisioningStep.CREDENTIALS)} disabled={!connected} className="flex-1">
                            <Text className="text-primary-foreground font-medium">Try again</Text>
                        </Button>
                    </View>
                )}
            </View>
        );
    };

    const renderCompleteStep = () => (
        <View className="flex-1 items-center">
            <View className="w-20 h-20 rounded-full bg-green-500/15 items-center justify-center mb-5 mt-4">
                <IconSymbol name="checkmark" size={36} color="#4ade80" />
            </View>
            <Text className="text-xl font-semibold text-foreground mb-2">Device Registered</Text>
            <Text className="text-muted-foreground text-center text-sm mb-6 px-4">
                {selectedDevice?.name || 'The device'} is on the Wi-Fi and signed in to {hubName}.
            </Text>
            <Button onPress={handleReset} className="w-full">
                <View className="flex-row items-center gap-2">
                    <IconSymbol name="arrow.clockwise" size={14} color={colors.primaryForeground} />
                    <Text className="text-primary-foreground font-medium">Provision Another Device</Text>
                </View>
            </Button>
        </View>
    );

    if (profilesLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <View className="w-16 h-16 rounded-full bg-card items-center justify-center mb-4">
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
                <Text className="text-muted-foreground text-sm">Loading profiles...</Text>
            </View>
        );
    }

    if (profiles.length === 0) {
        return (
            <View className="flex-1 bg-background p-6 items-center justify-center">
                <View className="w-16 h-16 rounded-full bg-card items-center justify-center mb-4">
                    <IconSymbol name="wifi" size={28} color={colors.mutedForeground} />
                </View>
                <Text className="text-foreground font-semibold text-lg mb-2 text-center">No Wi-Fi Profiles</Text>
                <Text className="text-muted-foreground text-sm text-center mb-6">
                    Configure at least one Wi-Fi profile before provisioning devices.
                </Text>
                <Link href="/wifi" asChild>
                    <Button className="w-full max-w-xs">
                        <View className="flex-row items-center gap-2">
                            <IconSymbol name="wifi" size={14} color={colors.primaryForeground} />
                            <Text className="text-primary-foreground font-medium">Configure Wi-Fi</Text>
                        </View>
                    </Button>
                </Link>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background">
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
