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
        <View className="flex-1 bg-background">
            <Stack.Screen options={{ title: params.universityId ? 'Edit Eduroam Profile' : 'Add Eduroam Profile' }} />
            <ScrollView className="flex-1" contentContainerClassName="p-5 gap-5">
                {/* University Section */}
                <View>
                    <Text className="text-lg font-semibold text-foreground mb-1">University / Organization</Text>
                    <Text className="text-sm text-muted-foreground mb-4">Select your institution</Text>

                    {university ? (
                        <View className="flex-row items-center justify-between p-4 bg-primary/10 rounded-xl border border-primary/20">
                            <View className="flex-1">
                                <Text className="font-semibold text-primary">{university.name}</Text>
                                <Text className="text-xs text-primary/60 mt-0.5">{university.country}</Text>
                            </View>
                            <Pressable onPress={() => setUniversity(null)} className="p-2">
                                <Text className="text-primary font-semibold text-sm">Change</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View>
                            <TextInput
                                value={eduroamSearch}
                                onChangeText={setEduroamSearch}
                                placeholder="Search for your university..."
                                placeholderTextColor="hsl(165, 8%, 35%)"
                                className="border border-border rounded-xl px-4 py-3 bg-card text-card-foreground mb-2"
                            />
                            {loading && (
                                <View className="py-4 items-center">
                                    <ActivityIndicator size="small" color="hsl(165, 50%, 55%)" />
                                    <Text className="text-muted-foreground text-xs mt-2">Searching...</Text>
                                </View>
                            )}
                            {!loading && searchResults.length > 0 && (
                                <View className="border border-border rounded-xl bg-card max-h-48 overflow-hidden">
                                    <ScrollView nestedScrollEnabled>
                                        {searchResults.map((inst) => (
                                            <Pressable
                                                key={inst.id}
                                                onPress={() => {
                                                    setUniversity(inst);
                                                    setEduroamSearch('');
                                                }}
                                                className="p-3 border-b border-border active:bg-accent"
                                            >
                                                <Text className="font-medium text-card-foreground text-sm">{inst.name}</Text>
                                                <Text className="text-xs text-muted-foreground">{inst.country}</Text>
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
                        <Text className="text-lg font-semibold text-foreground mb-1">Credentials</Text>
                        <Text className="text-sm text-muted-foreground mb-4">Enter your login details</Text>

                        <View className="gap-4">
                            <View>
                                <Text className="text-sm font-medium text-foreground mb-2">Identity (Username)</Text>
                                <TextInput
                                    value={identity}
                                    onChangeText={setIdentity}
                                    placeholder="user@university.edu"
                                    placeholderTextColor="hsl(165, 8%, 35%)"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    className="border border-border rounded-xl px-4 py-3 bg-card text-card-foreground"
                                />
                            </View>
                            
                            <View>
                                <Text className="text-sm font-medium text-foreground mb-2">Anonymous Identity (Optional)</Text>
                                <TextInput
                                    value={anonymousIdentity}
                                    onChangeText={setAnonymousIdentity}
                                    placeholder="anonymous@university.edu"
                                    placeholderTextColor="hsl(165, 8%, 35%)"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    className="border border-border rounded-xl px-4 py-3 bg-card text-card-foreground"
                                />
                                <Text className="text-xs text-muted-foreground mt-1">
                                    Leave blank to use the default anonymous identity
                                </Text>
                            </View>

                            <View>
                                <Text className="text-sm font-medium text-foreground mb-2">Password</Text>
                                <View className="relative">
                                    <TextInput
                                        value={password}
                                        onChangeText={setPassword}
                                        placeholder="Password"
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
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
