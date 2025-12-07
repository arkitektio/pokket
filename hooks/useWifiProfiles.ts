import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type WifiProfile = {
    ssid: string;
    password?: string;
    type: 'standard' | 'eduroam';
    identity?: string;
    anonymousIdentity?: string;
    universityId?: string;
    universityName?: string;
    universityCountry?: string;
};

const STORAGE_KEY = 'wifi_configs_v2';

export function useWifiProfiles() {
    const [profiles, setProfiles] = useState<WifiProfile[]>([]);
    const [loading, setLoading] = useState(true);

    const loadProfiles = useCallback(async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                setProfiles(JSON.parse(stored));
            } else {
                // Migrate old configs if they exist
                const oldStored = await AsyncStorage.getItem('wifi_configs');
                if (oldStored) {
                    const oldConfigs = JSON.parse(oldStored);
                    const migrated = oldConfigs.map((c: any) => ({
                        ssid: c.ssid,
                        password: c.password,
                        type: 'standard' as const
                    }));
                    setProfiles(migrated);
                    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
                }
            }
        } catch (err) {
            console.error('Failed to load WiFi profiles:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProfiles();
    }, [loadProfiles]);

    const saveProfile = useCallback(async (profile: WifiProfile) => {
        try {
            setProfiles(current => {
                let updated = [...current];
                if (profile.type === 'standard') {
                    updated = updated.filter(p => p.ssid !== profile.ssid || p.type !== 'standard');
                } else {
                    updated = updated.filter(p => p.universityId !== profile.universityId || p.type !== 'eduroam');
                }
                
                updated.push(profile);
                AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                return updated;
            });
        } catch (err) {
            console.error('Failed to save WiFi profile:', err);
        }
    }, []);

    const deleteProfile = useCallback(async (profile: WifiProfile) => {
        try {
            setProfiles(current => {
                const updated = current.filter(p => {
                    if (profile.type === 'standard') {
                        return p.ssid !== profile.ssid || p.type !== 'standard';
                    } else {
                        return p.universityId !== profile.universityId || p.type !== 'eduroam';
                    }
                });
                AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                return updated;
            });
        } catch (err) {
            console.error('Failed to delete WiFi profile:', err);
        }
    }, []);

    return {
        profiles,
        loading,
        saveProfile,
        deleteProfile,
        refresh: loadProfiles
    };
}
