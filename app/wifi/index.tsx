import { useAlertDialog } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useWifiProfiles } from '@/hooks/useWifiProfiles';
import { Link, Stack } from 'expo-router';
import React from 'react';
import { FlatList, Text, View } from 'react-native';

export default function WifiIndexScreen() {
    const { profiles, deleteProfile } = useWifiProfiles();
    const alert = useAlertDialog();

    return (
        <View className="flex-1 bg-zinc-950">
            <Stack.Screen options={{ title: 'Wi-Fi Profiles' }} />
            
            <View className="p-5 gap-4">
                <View className="flex-row gap-2">
                    <Link href="/wifi/standard" asChild>
                        <Button className="flex-1 flex-row items-center gap-2 bg-zinc-800 border border-zinc-700/50 rounded-xl" variant="outline">
                            <IconSymbol name="wifi" size={18} color="#60A5FA" />
                            <Text className="text-zinc-200 text-sm font-medium">Add Wi-Fi</Text>
                        </Button>
                    </Link>
                    <Link href="/wifi/eduroam" asChild>
                        <Button className="flex-1 flex-row items-center gap-2 bg-zinc-800 border border-zinc-700/50 rounded-xl" variant="outline">
                            <IconSymbol name="building.2.fill" size={18} color="#60A5FA" />
                            <Text className="text-zinc-200 text-sm font-medium">Add Eduroam</Text>
                        </Button>
                    </Link>
                </View>

                <Text className="font-semibold text-base text-zinc-300 mt-2">Saved Profiles</Text>
                
                {profiles.length === 0 ? (
                    <View className="py-12 items-center">
                        <View className="w-16 h-16 rounded-full bg-zinc-800 items-center justify-center mb-4">
                            <IconSymbol name="wifi" size={28} color="#52525B" />
                        </View>
                        <Text className="text-zinc-500 text-sm">No saved profiles</Text>
                    </View>
                ) : (
                    <FlatList
                        data={profiles}
                        keyExtractor={(item, index) => index.toString()}
                        ItemSeparatorComponent={() => <View className="h-2" />}
                        renderItem={({ item }) => (
                            <View className="flex-row items-center justify-between p-4 bg-zinc-800/80 rounded-xl border border-zinc-700/50">
                                <View className="flex-row items-center flex-1">
                                    <View className="w-10 h-10 rounded-full bg-blue-500/15 items-center justify-center mr-3">
                                        <IconSymbol
                                            name={item.type === 'eduroam' ? 'building.2.fill' : 'wifi'}
                                            size={18}
                                            color="#60A5FA"
                                        />
                                    </View>
                                    <View>
                                        <Text className="font-medium text-sm text-zinc-200">
                                            {item.type === 'eduroam' ? item.universityName : item.ssid}
                                        </Text>
                                        <Text className="text-xs text-zinc-500 mt-0.5">
                                            {item.type === 'eduroam' ? 'Eduroam' : 'Standard Wi-Fi'}
                                        </Text>
                                    </View>
                                </View>
                                <View className="flex-row items-center gap-1">
                                    <Link href={{
                                        pathname: item.type === 'eduroam' ? "/wifi/eduroam" : "/wifi/standard",
                                        params: { 
                                            ssid: item.ssid,
                                            password: item.password,
                                            type: item.type,
                                            identity: item.identity,
                                            anonymousIdentity: item.anonymousIdentity,
                                            universityId: item.universityId,
                                            universityName: item.universityName,
                                            universityCountry: item.universityCountry
                                        }
                                    }} asChild>
                                        <Button variant="ghost" size="sm">
                                            <IconSymbol name="square.and.pencil" size={18} color="#71717A" />
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onPress={() => {
                                            alert.show(
                                                'Delete Profile',
                                                'Are you sure you want to delete this profile?',
                                                [
                                                    { label: 'Cancel', variant: 'cancel' },
                                                    { 
                                                        label: 'Delete', 
                                                        variant: 'destructive',
                                                        onPress: () => deleteProfile(item),
                                                    },
                                                ],
                                            );
                                        }}
                                    >
                                        <IconSymbol name="trash" size={18} color="#EF4444" />
                                    </Button>
                                </View>
                            </View>
                        )}
                    />
                )}
            </View>
        </View>
    );
}
