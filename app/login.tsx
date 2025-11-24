import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { App } from '@/lib/app/App';
import { discover } from '@/lib/arkitekt/fakts/discover';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Button, Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
  const connect = App.useConnect();
  const [url, setUrl] = React.useState('https://go.arkitekt.live');
  const [isLoading, setIsLoading] = React.useState(false);
  const [advanced, setAdvanced] = React.useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    const controller = new AbortController();
    try {
      const endpoint = await discover({ url, controller, timeout: 3000 });
      await connect({ endpoint, controller });
      router.replace('/');
    } catch (err: any) {
      console.warn('Connect failed', err);
      Alert.alert('Connection Failed', err?.message || 'Unable to connect to Arkitekt');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView className="flex-1 items-center justify-center px-6">
      <View style={styles.header}>
        <Image source={require('../assets/images/icon.png')} style={styles.logo} />
        <ThemedText className="text-2xl font-bold">Arkitekt</ThemedText>
        <ThemedText className="text-sm text-gray-500">Provision devices and connect to your Arkitekt server</ThemedText>
      </View>

      <View style={styles.card}>
        <ThemedText className="font-semibold mb-2">Arkitekt Endpoint</ThemedText>

        {!advanced ? (
          <View style={styles.defaultRow}>
            <ThemedText className="text-sm text-gray-600">{url}</ThemedText>
            <TouchableOpacity onPress={() => setAdvanced(true)} style={styles.advancedToggle}>
              <ThemedText className="text-sm text-blue-600">Advanced</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <TextInput
            placeholder="https://your-arkitekt.example"
            value={url}
            onChangeText={setUrl}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="url"
            autoCorrect={false}
          />
        )}

        <View style={{ marginTop: 16 }}>
          <Button disabled={isLoading} title={isLoading ? 'Connecting…' : 'Connect'} onPress={handleConnect} />
        </View>
      </View>

      <View style={styles.footer}>
        <ThemedText className="text-xs text-gray-500">Use the default endpoint or enable Advanced to enter a custom URL.</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 80, height: 80, marginBottom: 8, borderRadius: 12 },
  card: { width: '100%', backgroundColor: '#fff', padding: 16, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.04, elevation: 2 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', padding: 10, borderRadius: 8, backgroundColor: '#fff' },
  defaultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  advancedToggle: { paddingHorizontal: 8, paddingVertical: 4 },
  footer: { marginTop: 20, alignItems: 'center' },
});
