
import { useAlertDialog } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useWifiProfiles, WifiProfile } from '@/hooks/useWifiProfiles';
import { EduroamInstance } from '@/lib/eduroam/types';
import { useEduroam } from '@/lib/eduroam/useEduroam';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ThemedText } from './ThemedText';

export type WifiFormConfig = {
    type: 'standard' | 'eduroam';
    ssid: string;
    password?: string;
    identity?: string;
    anonymousIdentity?: string;
    university?: EduroamInstance;
    save: boolean;
};

interface WifiFormProps {
    onConfigChange: (config: WifiFormConfig, isValid: boolean) => void;
    initialConfig?: Partial<WifiFormConfig>;
    showSaveOption?: boolean;
}

export function WifiForm({ onConfigChange, initialConfig, showSaveOption = true }: WifiFormProps) {
    const [type, setType] = useState<'standard' | 'eduroam'>(initialConfig?.type || 'standard');
    const [ssid, setSsid] = useState(initialConfig?.ssid || '');
    const [password, setPassword] = useState(initialConfig?.password || '');
    const [identity, setIdentity] = useState(initialConfig?.identity || '');
    const [anonymousIdentity, setAnonymousIdentity] = useState(initialConfig?.anonymousIdentity || '');
    const [university, setUniversity] = useState<EduroamInstance | null>(initialConfig?.university || null);
    const [save, setSave] = useState(initialConfig?.save ?? true);
    
    const [showPassword, setShowPassword] = useState(false);
    const [eduroamSearch, setEduroamSearch] = useState('');
    const [showSavedConfigs, setShowSavedConfigs] = useState(false);

    const alert = useAlertDialog();
    const { profiles, deleteProfile } = useWifiProfiles();
    const { initialize, search, searchResults } = useEduroam();

    useEffect(() => {
        initialize();
    }, [initialize]);

    useEffect(() => {
        if (eduroamSearch.length > 2) {
            search(eduroamSearch);
        }
    }, [eduroamSearch, search]);

    // Validate and notify parent
    useEffect(() => {
        let isValid = false;
        if (type === 'standard') {
            isValid = !!ssid && !!password; // Assuming password is required for now
        } else {
            isValid = !!university && !!identity && !!password;
        }

        onConfigChange({
            type,
            ssid: type === 'eduroam' ? 'eduroam' : ssid,
            password,
            identity,
            anonymousIdentity,
            university: university || undefined,
            save
        }, isValid);
    }, [type, ssid, password, identity, anonymousIdentity, university, save, onConfigChange]);

    const loadProfile = (profile: WifiProfile) => {
        setType(profile.type);
        setSsid(profile.ssid);
        setPassword(profile.password || '');
        setIdentity(profile.identity || '');
        setAnonymousIdentity(profile.anonymousIdentity || '');
        if (profile.universityId && profile.universityName) {
            setUniversity({
                id: profile.universityId,
                name: profile.universityName,
                country: profile.universityCountry || 'Unknown',
                profiles: [], // Dummy
                geo: [] // Dummy
            });
        }
        setShowSavedConfigs(false);
    };

    return (
        <View className="space-y-4">
             {/* Network Type Toggle */}
             <View className="flex-row mb-4 bg-gray-100 p-1 rounded-lg">
                <Pressable
                    onPress={() => setType('standard')}
                    className={`flex-1 py-2 rounded-md items-center ${type === 'standard' ? 'bg-white shadow-sm' : ''}`}
                >
                    <Text className={`font-medium ${type === 'standard' ? 'text-blue-600' : 'text-gray-600'}`}>Standard Wi-Fi</Text>
                </Pressable>
                <Pressable
                    onPress={() => setType('eduroam')}
                    className={`flex-1 py-2 rounded-md items-center ${type === 'eduroam' ? 'bg-white shadow-sm' : ''}`}
                >
                    <Text className={`font-medium ${type === 'eduroam' ? 'text-blue-600' : 'text-gray-600'}`}>Eduroam</Text>
                </Pressable>
            </View>

            {/* Saved Configs Dropdown */}
            <View>
                <View className="flex-row justify-between items-center mb-2">
                    <Text className="font-medium">Saved Profiles</Text>
                    {profiles.length > 0 && (
                        <Button
                            variant="ghost"
                            onPress={() => setShowSavedConfigs(!showSavedConfigs)}
                            className="py-1"
                        >
                            <Text className="text-xs text-blue-600">
                                {showSavedConfigs ? 'Hide' : `Show (${profiles.length})`}
                            </Text>
                        </Button>
                    )}
                </View>

                {showSavedConfigs && profiles.length > 0 && (
                    <View className="mb-4 border border-gray-200 rounded-lg bg-gray-50 max-h-48">
                        <ScrollView nestedScrollEnabled>
                            {profiles.map((profile, index) => (
                                <Pressable
                                    key={index}
                                    onPress={() => loadProfile(profile)}
                                    className="flex-row justify-between items-center p-3 border-b border-gray-200"
                                >
                                    <View className="flex-1">
                                        <Text className="font-medium">
                                            {profile.type === 'eduroam' ? profile.universityName : profile.ssid}
                                        </Text>
                                        <Text className="text-xs text-gray-500">
                                            {profile.type === 'eduroam' ? 'Eduroam' : 'Standard'}
                                        </Text>
                                    </View>
                                    <View className="flex-row space-x-2">
                                        <Button
                                            variant="ghost"
                                            onPress={(e) => {
                                                e?.stopPropagation();
                                                loadProfile(profile);
                                            }}
                                            className="py-1 px-2"
                                        >
                                            <Text className="text-xs text-blue-600">Use</Text>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onPress={(e) => {
                                                e?.stopPropagation();
                                                alert.show(
                                                    'Delete Profile',
                                                    'Remove saved profile?',
                                                    [
                                                        { label: 'Cancel', variant: 'cancel' },
                                                        {
                                                            label: 'Delete',
                                                            variant: 'destructive',
                                                            onPress: () => deleteProfile(profile),
                                                        },
                                                    ],
                                                );
                                            }}
                                            className="py-1 px-2"
                                        >
                                            <Text className="text-xs text-red-600">Delete</Text>
                                        </Button>
                                    </View>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>

            {type === 'eduroam' ? (
                <View className="space-y-4">
                    {/* University Search */}
                    <View>
                        <ThemedText className="mb-2 font-medium">University / Organization</ThemedText>
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
                                {searchResults.length > 0 && (
                                    <View className="border border-gray-200 rounded-lg bg-white max-h-48 overflow-hidden">
                                        <ScrollView nestedScrollEnabled>
                                            {searchResults.map((inst) => (
                                                <Pressable
                                                    key={inst.id}
                                                    onPress={() => {
                                                        setUniversity(inst);
                                                        setEduroamSearch('');
                                                        // Clear results? eduroam.search('') might clear it
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
                    </View>

                    {university && (
                        <>
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
                        </>
                    )}
                </View>
            ) : (
                <View className="space-y-4">
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
                </View>
            )}

            {showSaveOption && (
                <Pressable
                    onPress={() => setSave(!save)}
                    className="flex-row items-center p-3 bg-gray-50 rounded-lg mt-2"
                >
                    <View className={`w-5 h-5 border-2 rounded mr-3 items-center justify-center ${save ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                        }`}>
                        {save && (
                            <ThemedText className="text-white text-xs">✓</ThemedText>
                        )}
                    </View>
                    <ThemedText className="text-sm flex-1">
                        Save this configuration for future use
                    </ThemedText>
                </Pressable>
            )}
        </View>
    );
}
