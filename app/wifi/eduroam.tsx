import { useAlertDialog } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
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
        <View className="flex-1 bg-zinc-950">
            <Stack.Screen options={{ title: params.universityId ? 'Edit Eduroam Profile' : 'Add Eduroam Profile' }} />
            <ScrollView className="flex-1" contentContainerClassName="p-5 gap-5">
                {/* University Section */}
                <View>
                    <Text className="text-lg font-semibold text-white mb-1">University / Organization</Text>
                    <Text className="text-sm text-zinc-400 mb-4">Select your institution</Text>

                    {university ? (
                        <View className="flex-row items-center justify-between p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                            <View className="flex-1">
                                <Text className="font-semibold text-blue-400">{university.name}</Text>
                                <Text className="text-xs text-blue-400/60 mt-0.5">{university.country}</Text>
                            </View>
                            <Pressable onPress={() => setUniversity(null)} className="p-2">
                                <Text className="text-blue-400 font-semibold text-sm">Change</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View>
                            <TextInput
                                value={eduroamSearch}
                                onChangeText={setEduroamSearch}
                                placeholder="Search for your university..."
                                placeholderTextColor="#52525B"
                                className="border border-zinc-700/50 rounded-xl px-4 py-3 bg-zinc-800/80 text-zinc-100 mb-2"
                            />
                            {loading && (
                                <View className="py-4 items-center">
                                    <ActivityIndicator size="small" color="#60A5FA" />
                                    <Text className="text-zinc-400 text-xs mt-2">Searching...</Text>
                                </View>
                            )}
                            {!loading && searchResults.length > 0 && (
                                <View className="border border-zinc-700/50 rounded-xl bg-zinc-800/80 max-h-48 overflow-hidden">
                                    <ScrollView nestedScrollEnabled>
                                        {searchResults.map((inst) => (
                                            <Pressable
                                                key={inst.id}
                                                onPress={() => {
                                                    setUniversity(inst);
                                                    setEduroamSearch('');
                                                }}
                                                className="p-3 border-b border-zinc-700/30 active:bg-zinc-700"
                                            >
                                                <Text className="font-medium text-zinc-200 text-sm">{inst.name}</Text>
                                                <Text className="text-xs text-zinc-500">{inst.country}</Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* Credentials Section */}
                {university && (
                    <View>
                        <Text className="text-lg font-semibold text-white mb-1">Credentials</Text>
                        <Text className="text-sm text-zinc-400 mb-4">Enter your login details</Text>

                        <View className="gap-4">
                            <View>
                                <Text className="text-sm font-medium text-zinc-300 mb-2">Identity (Username)</Text>
                                <TextInput
                                    value={identity}
                                    onChangeText={setIdentity}
                                    placeholder="user@university.edu"
                                    placeholderTextColor="#52525B"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    className="border border-zinc-700/50 rounded-xl px-4 py-3 bg-zinc-800/80 text-zinc-100"
                                />
                            </View>
                            
                            <View>
                                <Text className="text-sm font-medium text-zinc-300 mb-2">Anonymous Identity (Optional)</Text>
                                <TextInput
                                    value={anonymousIdentity}
                                    onChangeText={setAnonymousIdentity}
                                    placeholder="anonymous@university.edu"
                                    placeholderTextColor="#52525B"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    className="border border-zinc-700/50 rounded-xl px-4 py-3 bg-zinc-800/80 text-zinc-100"
                                />
                                <Text className="text-xs text-zinc-500 mt-1">
                                    Leave blank to use the default anonymous identity
                                </Text>
                            </View>

                            <View>
                                <Text className="text-sm font-medium text-zinc-300 mb-2">Password</Text>
                                <View className="relative">
                                    <TextInput
                                        value={password}
                                        onChangeText={setPassword}
                                        placeholder="Password"
                                        placeholderTextColor="#52525B"
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        className="border border-zinc-700/50 rounded-xl px-4 py-3 bg-zinc-800/80 text-zinc-100 pr-16"
                                    />
                                    <Button
                                        variant="ghost"
                                        onPress={() => setShowPassword(!showPassword)}
                                        className="absolute right-1 top-1"
                                    >
                                        <Text className="text-xs text-zinc-400">{showPassword ? 'Hide' : 'Show'}</Text>
                                    </Button>
                                </View>
                            </View>

                            <Button onPress={handleSave} className="mt-2">
                                <Text className="text-white font-medium">Save Configuration</Text>
                            </Button>
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
