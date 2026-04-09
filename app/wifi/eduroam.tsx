import { ThemedText } from '@/components/ThemedText';
import { useAlertDialog } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWifiProfiles } from '@/hooks/useWifiProfiles';
import { EduroamInstance } from '@/lib/eduroam/types';
import { extractPemCertificate, useEduroam } from '@/lib/eduroam/useEduroam';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

export default function EduroamWifiScreen() {
    const [university, setUniversity] = useState<EduroamInstance | null>(null);
    const [identity, setIdentity] = useState('');
    const [anonymousIdentity, setAnonymousIdentity] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [eduroamSearch, setEduroamSearch] = useState('');
    const [pemCertificate, setPemCertificate] = useState('');
    
    const { saveProfile } = useWifiProfiles();
    const { initialize, search, searchResults, fetchEapConfig, loading } = useEduroam();
    const router = useRouter();
    const params = useLocalSearchParams();
    const alert = useAlertDialog();

    useEffect(() => {
        initialize();
    }, [initialize]);

    useEffect(() => {
        if (params.universityId) {
            setUniversity({
                id: params.universityId as string,
                name: params.universityName as string,
                country: params.universityCountry as string,
                geo: [],
                profiles: []
            });
            if (params.pemCertificate) setPemCertificate(params.pemCertificate as string);
        }
        if (params.identity) setIdentity(params.identity as string);
        if (params.anonymousIdentity) setAnonymousIdentity(params.anonymousIdentity as string);
        if (params.password) setPassword(params.password as string);
    }, [params.universityId, params.universityName, params.universityCountry, params.identity, params.anonymousIdentity, params.password, params.pemCertificate]);

    // Fetch EAP config to get PEM certificate when university is selected
    useEffect(() => {
        if (university && university.profiles.length > 0 && !pemCertificate) {
            fetchEapConfig(university.profiles[0]).then((eapConfig) => {
                if (eapConfig) {
                    const pem = extractPemCertificate(eapConfig);
                    if (pem) setPemCertificate(pem);
                }
            }).catch((err) => {
                console.warn('Failed to fetch EAP config for PEM certificate:', err);
            });
        }
    }, [university, fetchEapConfig, pemCertificate]);

    useEffect(() => {
        if (eduroamSearch.length > 2) {
            search(eduroamSearch);
        }
    }, [eduroamSearch, search]);

    const handleSave = async () => {
        if (!university || !identity || !password) {
            alert.show('Missing Fields', 'Please fill in all required fields (university, identity, and password).');
            return;
        }

        await saveProfile({
            type: 'eduroam',
            ssid: 'eduroam',
            password,
            identity,
            anonymousIdentity,
            universityId: university.id,
            universityName: university.name,
            universityCountry: university.country,
            pemCertificate,
        });

        router.back();
    };

    return (
        <View className="flex-1 bg-gray-50 p-4">
            <Stack.Screen options={{ title: params.universityId ? 'Edit Eduroam Profile' : 'Add Eduroam Profile' }} />
            <ScrollView className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>University / Organization</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {university ? (
                            <View className="flex-row items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <View className="flex-1">
                                    <Text className="font-semibold text-blue-900">{university.name}</Text>
                                    <Text className="text-xs text-blue-700">{university.country}</Text>
                                </View>
                                <Pressable onPress={() => setUniversity(null)} className="p-2">
                                    <Text className="text-blue-600 font-bold">Change</Text>
                                </Pressable>
                            </View>
                        ) : (
                            <View>
                                <TextInput
                                    value={eduroamSearch}
                                    onChangeText={setEduroamSearch}
                                    placeholder="Search for your university..."
                                    className="border border-gray-300 rounded-lg px-4 py-3 bg-white mb-2"
                                />
                                {loading && (
                                    <View className="py-4">
                                        <ActivityIndicator size="small" color="#0000ff" />
                                    </View>
                                )}
                                {!loading && searchResults.length > 0 && (
                                    <View className="border border-gray-200 rounded-lg bg-white max-h-48 overflow-hidden">
                                        <ScrollView nestedScrollEnabled>
                                            {searchResults.map((inst) => (
                                                <Pressable
                                                    key={inst.id}
                                                    onPress={() => {
                                                        setUniversity(inst);
                                                        setEduroamSearch('');
                                                    }}
                                                    className="p-3 border-b border-gray-100 active:bg-gray-50"
                                                >
                                                    <Text className="font-medium">{inst.name}</Text>
                                                    <Text className="text-xs text-gray-500">{inst.country}</Text>
                                                </Pressable>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>
                        )}
                    </CardContent>
                </Card>

                {university && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Credentials</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <View>
                                <ThemedText className="mb-2 font-medium">Identity (Username)</ThemedText>
                                <TextInput
                                    value={identity}
                                    onChangeText={setIdentity}
                                    placeholder="user@university.edu"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
                                />
                            </View>
                            
                            <View>
                                <ThemedText className="mb-2 font-medium">Anonymous Identity (Optional)</ThemedText>
                                <TextInput
                                    value={anonymousIdentity}
                                    onChangeText={setAnonymousIdentity}
                                    placeholder="anonymous@university.edu"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
                                />
                                <ThemedText className="text-xs text-gray-500 mt-1">
                                    Leave blank to use the default anonymous identity
                                </ThemedText>
                            </View>

                            <View>
                                <ThemedText className="mb-2 font-medium">Password</ThemedText>
                                <View className="relative">
                                    <TextInput
                                        value={password}
                                        onChangeText={setPassword}
                                        placeholder="Password"
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
                )}
            </ScrollView>
        </View>
    );
}
