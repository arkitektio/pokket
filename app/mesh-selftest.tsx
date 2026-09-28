import { Text } from '@/components/ui/text';
import {
  getSelfTestState,
  parseSelfTestParams,
  SELFTEST_ENABLED,
  startSelfTest,
  subscribeSelfTest,
} from '@/lib/mesh/selftest';
import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

/**
 * The mesh sidecar's on-device self-test (lib/mesh/selftest.ts), for CI.
 * A build made with EXPO_PUBLIC_MESH_SELFTEST=1 opened at
 *   pokket://mesh-selftest?control=<url>&key=<authkey>&host=<svc>&port=<port>&progress=<url>
 * runs it and shows its steps. Every other build shows "disabled".
 */
export default function MeshSelfTestScreen() {
  const params = useLocalSearchParams<{ control?: string; key?: string; host?: string; port?: string; progress?: string }>();
  const state = React.useSyncExternalStore(subscribeSelfTest, getSelfTestState);

  React.useEffect(() => {
    const parsed = parseSelfTestParams(params);
    if (parsed) startSelfTest(parsed, 'deep link');
  }, [params]);

  if (!SELFTEST_ENABLED) {
    return (
      <View className="flex-1 bg-background p-6">
        <Text>The mesh self-test is disabled in this build.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-6">
        <Text className="text-xl font-semibold mb-4" testID="mesh-selftest-result">
          Mesh self-test: {state.result ?? 'waiting for parameters'}
        </Text>
        {state.steps.map((s) => (
          <Text key={s.name} className={s.ok ? 'text-foreground' : 'text-destructive'}>
            {s.ok ? '✓' : '✗'} {s.name}: {s.detail}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}
