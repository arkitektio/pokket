import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { App } from '@/lib/app/App';
import { discover } from '@/lib/arkitekt/fakts/discover';
import { cn } from '@/lib/utils';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Animated, Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
  const connect = App.useConnect();
  const [url, setUrl] = React.useState('https://go.arkitekt.live');
  const [isLoading, setIsLoading] = React.useState(false);
  const [advanced, setAdvanced] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const currentController = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    return () => {
      if (currentController.current) {
        try {
          currentController.current.abort();
        } catch {
          // ignore
        }
        currentController.current = null;
      }
    };
  }, []);

  // Animated value for collapsible Advanced area
  const advAnim = React.useRef(new Animated.Value(advanced ? 1 : 0)).current;
  React.useEffect(() => {
    Animated.timing(advAnim, { toValue: advanced ? 1 : 0, duration: 230, useNativeDriver: false }).start();
  }, [advanced, advAnim]);

  // Ref to the advanced URL input so we can focus when Advanced is opened
  const urlInputRef = React.useRef<TextInput | null>(null);
  React.useEffect(() => {
    if (advanced) {
      const t = setTimeout(() => urlInputRef.current?.focus(), 260);
      return () => clearTimeout(t);
    }
  }, [advanced]);

  const handleConnect = async () => {
    setError(null);
    setIsLoading(true);
    const controller = new AbortController();
    currentController.current = controller;
    try {
      const endpoint = await discover({ url, controller, timeout: 3000 });
      await connect({ endpoint, controller });
      router.replace('/');
    } catch (err: any) {
      console.warn('Connect failed', err);
      setError(err?.message || 'Unable to connect to Arkitekt');
    } finally {
      setIsLoading(false);
      currentController.current = null;
    }
  };

  const handleAbort = () => {
    if (currentController.current) {
      try {
        currentController.current.abort();
      } catch {
        // ignore
      }
      currentController.current = null;
    }
    setIsLoading(false);
    setError('Operation cancelled');
  };

  const advHeight = advAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 64] });
  const advOpacity = advAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <ThemedView style={{ flex: 1, backgroundColor: '#000000', position: 'relative' }}>
      <StatusBar style="light" />
      <ThemedView className="flex-1 items-center justify-center pt-20 px-6">
        <ThemedView className="items-center mb-3">
          <Image source={require('../assets/images/icon.png')} style={styles.logo} />
        </ThemedView>

        <ThemedText className="text-2xl font-light text-foreground  mb-2">Welcome to Arkitekt</ThemedText>

        <ThemedView style={{ marginTop: 10 }} />

        <View style={styles.connectRow}>
          <TouchableOpacity
            onPress={isLoading ? handleAbort : handleConnect}
            activeOpacity={0.9}
            className={cn("px-7 py-3 rounded-lg text-center")}
            style={[isLoading ? styles.abortButton : styles.connectButton]}
          >
            <View style={styles.buttonContent}>
              {isLoading ? <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} /> : null}
              <ThemedText className="text-center text-white font-medium">{isLoading ? 'Abort' : 'Connect'}</ThemedText>
            </View>
          </TouchableOpacity>
        </View>
        <View style={{ marginTop: 8 }}>
          <TouchableOpacity onPress={() => setAdvanced(true)} activeOpacity={0.8}>
            <ThemedText className="text-sm text-indigo-300">Advanced</ThemedText>
          </TouchableOpacity>
        </View>
        {error ? (
          <ThemedText className="text-sm text-red-400 mt-3 text-center">{error}</ThemedText>
        ) : null}

      </ThemedView>

      {/* Bottom advanced collapsible area */}
      <Animated.View style={[styles.bottomArea, { height: advHeight, opacity: advOpacity }]}>
        <View style={styles.advInner}>
          <View style={styles.advHeader}>
            <ThemedText className="text-sm text-gray-300">{url}</ThemedText>
            <TouchableOpacity onPress={() => setAdvanced((s) => !s)}>
              <ThemedText className="text-sm text-indigo-300 ml-4">{advanced ? 'Hide' : 'Advanced'}</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={{ marginTop: 8 }}>
            <TextInput
              placeholder="https://your-arkitekt.example"
              value={url}
              onChangeText={setUrl}
              ref={(r) => { urlInputRef.current = r; }}
              style={styles.input}
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              keyboardType="url"
              autoCorrect={false}
            />
          </View>
        </View>
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 84, height: 84, marginBottom: 8, borderRadius: 16 },
  card: { width: '100%', backgroundColor: 'rgba(10,14,20,0.88)', padding: 18, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, elevation: 8 },
  input: { borderWidth: 1, borderColor: '#1f2937', padding: 12, borderRadius: 10, backgroundColor: '#071022', color: '#e5e7eb' },
  defaultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  advancedToggle: { paddingHorizontal: 8, paddingVertical: 4 },
  footer: { marginTop: 20, alignItems: 'center' },
  actionButton: { backgroundColor: '#60a5fa', borderRadius: 10 },
  buttonDisabled: { backgroundColor: '#93c5fd', opacity: 0.85 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  connectButton: { backgroundColor: '#092a56', paddingVertical: 10, paddingHorizontal: 28, borderRadius: 10, alignSelf: 'center' },
  bottomArea: { position: 'absolute', left: 0, right: 0, bottom: 26, paddingHorizontal: 18 },
  advInner: { padding: 12, borderRadius: 12 },
  advHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  connectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  abortButton: { marginLeft: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#334155' },
});
