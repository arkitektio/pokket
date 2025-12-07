import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWifiProfiles } from '@/hooks/useWifiProfiles';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';

export default function StandardWifiScreen() {
    const [ssid, setSsid] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { saveProfile } = useWifiProfiles();
    const router = useRouter();
    const params = useLocalSearchParams();

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
            Alert.alert('Error', 'SSID is required');
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
        <View className="flex-1 bg-gray-50 p-4">
            <Stack.Screen options={{ title: params.ssid ? 'Edit Standard Wi-Fi' : 'Add Standard Wi-Fi' }} />
            <ScrollView className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Wi-Fi Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <View>
                            <ThemedText className="mb-2 font-medium">Network Name (SSID)</ThemedText>
                            <TextInput
                                value={ssid}
                                onChangeText={setSsid}
                                placeholder="Enter Wi-Fi SSID"
                                autoCapitalize="none"
                                autoCorrect={false}
                                className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
                            />
                        </View>

                        <View>
                            <ThemedText className="mb-2 font-medium">Password</ThemedText>
                            <View className="relative">
                                <TextInput
                                    value={password}
                                    onChangeText={setPassword}
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

                        <Button onPress={handleSave} className="mt-4">
                            <Text>Save Configuration</Text>
                        </Button>
                    </CardContent>
                </Card>
            </ScrollView>
        </View>
    );
}
