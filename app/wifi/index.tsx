import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useWifiProfiles } from '@/hooks/useWifiProfiles';
import { Link, Stack } from 'expo-router';
import React from 'react';
import { Alert, FlatList, View } from 'react-native';

export default function WifiIndexScreen() {
    const { profiles, deleteProfile } = useWifiProfiles();

    return (
        <View className="flex-1 bg-background-300">
            <Stack.Screen options={{ title: 'Wi-Fi Profiles' }} />
            
            <View className="p-4 space-y-4 ">
                <View className="flex-row space-x-2 gap-2 bg-background-800 dark:bg-zinc-900 p-2 rounded-lg justify-between">
                    <Link href="/wifi/standard" asChild>
                        <Button className="flex-1 flex-row items-center space-x-2 text-black-300 gap-2" variant="outline">
                            <IconSymbol name="wifi" size={20} color="#000 mr-2" />
                            <ThemedText className='text-black'>Add Wi-Fi</ThemedText>
                        </Button>
                    </Link>
                    <Link href="/wifi/eduroam" asChild>
                        <Button className="flex-1 flex-row items-center space-x-2 text-black-300 gap-2" variant="outline">
                            <IconSymbol name="building.2.fill" size={20} color="#000" />
                            <ThemedText>Add Eduroam</ThemedText>
                        </Button>
                    </Link>
                </View>

                <ThemedText className="font-semibold text-lg mt-4">Saved Profiles</ThemedText>
                
                {profiles.length === 0 ? (
                    <Card>
                        <CardContent className="p-6 items-center">
                            <ThemedText className="text-gray-500">No saved profiles</ThemedText>
                        </CardContent>
                    </Card>
                ) : (
                    <FlatList
                        data={profiles}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => (
                            <Card className="mb-2">
                                <CardContent className="p-4 flex-row justify-between items-center">
                                    <View>
                                        <ThemedText className="font-medium">
                                            {item.type === 'eduroam' ? item.universityName : item.ssid}
                                        </ThemedText>
                                        <ThemedText className="text-xs text-gray-500">
                                            {item.type === 'eduroam' ? 'Eduroam' : 'Standard Wi-Fi'}
                                        </ThemedText>
                                    </View>
                                    <View className="flex-row items-center">
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
                                                <IconSymbol name="square.and.pencil" size={20} color="#000" />
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onPress={() => {
                                                Alert.alert(
                                                    'Delete Profile',
                                                    'Are you sure you want to delete this profile?',
                                                    [
                                                        { text: 'Cancel', style: 'cancel' },
                                                        { 
                                                            text: 'Delete', 
                                                            style: 'destructive',
                                                            onPress: () => deleteProfile(item)
                                                        }
                                                    ]
                                                );
                                            }}
                                        >
                                            <IconSymbol name="trash" size={20} color="#EF4444" />
                                        </Button>
                                    </View>
                                </CardContent>
                            </Card>
                        )}
                    />
                )}
            </View>
        </View>
    );
}
