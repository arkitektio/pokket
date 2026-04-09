import { useAlertDialog } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useWifiProfiles } from '@/hooks/useWifiProfiles';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

export default function StandardWifiScreen() {
    const [ssid, setSsid] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { saveProfile } = useWifiProfiles();
    const router = useRouter();
    const params = useLocalSearchParams();
    const alert = useAlertDialog();

    useEffect(() => {
        if (params.ssid) {
            setSsid(params.ssid as string);
        }
        if (params.password) {
            setPassword(params.password as string);
        }
    }, [params.ssid, params.password]);

    const handleSave = async () => {
        if (!ssid) {
            alert.show('Missing Field', 'SSID is required. Please enter the network name.');
            return;
        }

        await saveProfile({
            type: 'standard',
            ssid,
            password,
        });

        router.back();
    };

    return (
        <View className="flex-1 bg-background">
            <Stack.Screen options={{ title: params.ssid ? 'Edit Standard Wi-Fi' : 'Add Standard Wi-Fi' }} />
            <ScrollView className="flex-1" contentContainerClassName="p-5 gap-5">
                <View>
                    <Text className="text-lg font-semibold text-foreground mb-1">Wi-Fi Details</Text>
                    <Text className="text-sm text-muted-foreground">Enter your network credentials</Text>
                </View>

                <View className="gap-4">
                    <View>
                        <Text className="text-sm font-medium text-foreground mb-2">Network Name (SSID)</Text>
                        <TextInput
                            value={ssid}
                            onChangeText={setSsid}
                            placeholder="Enter Wi-Fi SSID"
                            placeholderTextColor="hsl(165, 8%, 35%)"
                            autoCapitalize="none"
                            autoCorrect={false}
                            className="border border-border rounded-xl px-4 py-3 bg-card text-card-foreground"
                        />
                    </View>

                    <View>
                        <Text className="text-sm font-medium text-foreground mb-2">Password</Text>
                        <View className="relative">
                            <TextInput
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Enter Wi-Fi password"
                                placeholderTextColor="hsl(165, 8%, 35%)"
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                className="border border-border rounded-xl px-4 py-3 bg-card text-card-foreground pr-16"
                            />
                            <Button
                                variant="ghost"
                                onPress={() => setShowPassword(!showPassword)}
                                className="absolute right-1 top-1"
                            >
                                <Text className="text-xs text-muted-foreground">{showPassword ? 'Hide' : 'Show'}</Text>
                            </Button>
                        </View>
                    </View>

                    <Button onPress={handleSave} className="mt-2">
                        <Text className="text-primary-foreground font-medium">Save Configuration</Text>
                    </Button>
                </View>
            </ScrollView>
        </View>
    );
}
