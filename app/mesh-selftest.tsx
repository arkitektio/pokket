import { Text } from '@/components/ui/text';
import { meshNative, parseMeshStatus, type MeshNodeStatus } from '@/modules/pokket-mesh';
import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

/**
 * The mesh sidecar's on-device self-test, for CI (.github/workflows/mesh.yaml).
 *
 * A build made with EXPO_PUBLIC_MESH_SELFTEST=1 opened at
 *   pokket://mesh-selftest?control=<url>&key=<authkey>&host=<svc>&port=<port>
 * joins the test tailnet that `go test -run TestDeviceEnv` serves, and checks,
 * in the real app sandbox with the real permissions: the native module loads,
 * the node reaches "running", a forward opens, RN fetch and RN WebSocket work
 * over http://127.0.0.1 (release cleartext policy / ATS), and it posts its
 * result to the service THROUGH the mesh — so a report arriving at all proves
 * the path works. Every other build shows "disabled" and does nothing.
 */

const ENABLED = process.env.EXPO_PUBLIC_MESH_SELFTEST === '1';
const ID = 'selftest';
const RUNNING_TIMEOUT_MS = 120_000;

type Step = { name: string; ok: boolean; detail: string };

const log = (message: string) => console.log(`[mesh-selftest] ${message}`);

const withTimeout = <T,>(promise: Promise<T>, ms: number, what: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${what} timed out after ${ms} ms`)), ms)),
  ]);

const waitForRunning = (native: NonNullable<ReturnType<typeof meshNative>>): Promise<MeshNodeStatus> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      sub.remove();
      reject(new Error(`node not running after ${RUNNING_TIMEOUT_MS} ms (last: ${last?.state ?? 'none'})`));
    }, RUNNING_TIMEOUT_MS);
    let last: MeshNodeStatus | null = null;
    const sub = native.addListener('onStatus', ({ status }) => {
      const parsed = parseMeshStatus(status);
      if (!parsed || parsed.id !== ID) return;
      last = parsed;
      log(`status ${parsed.state} peers=${parsed.peers?.length ?? 0}`);
      if (parsed.state === 'running' && parsed.magicDnsSuffix && parsed.peers?.some((p) => p.online)) {
        clearTimeout(timer);
        sub.remove();
        resolve(parsed);
      }
    });
  });

const webSocketEcho = (url: string, message: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.onopen = () => ws.send(message);
    ws.onmessage = (event) => {
      resolve(String(event.data));
      ws.close();
    };
    ws.onerror = (event: any) => reject(new Error(event?.message || 'websocket error'));
  });

async function runSelfTest(params: { control: string; key: string; host: string; port: number }, onStep: (s: Step) => void) {
  const steps: Step[] = [];
  const step = async (name: string, run: () => Promise<string>) => {
    try {
      const detail = await run();
      const s = { name, ok: true, detail };
      steps.push(s);
      onStep(s);
      log(`PASS ${name}: ${detail}`);
    } catch (error) {
      const s = { name, ok: false, detail: error instanceof Error ? error.message : String(error) };
      steps.push(s);
      onStep(s);
      log(`FAIL ${name}: ${s.detail}`);
      throw error;
    }
  };

  let localPort = 0;
  try {
    const native = meshNative();
    await step('native module', async () => {
      if (!native) throw new Error('PokketMesh native module missing or built without the Go library');
      return `version ${native.version()}`;
    });
    await step('join tailnet', async () => {
      await native!.forget(ID);
      const running = waitForRunning(native!);
      await native!.start(ID, params.control, 'pokket-selftest', params.key);
      const status = await running;
      return `${status.selfDnsName} ${status.selfIps?.[0]} suffix=${status.magicDnsSuffix}`;
    });
    await step('forward', async () => {
      localPort = await withTimeout(native!.forward(ID, params.host, params.port, false), 30_000, 'forward');
      return `127.0.0.1:${localPort}`;
    });
    await step('fetch over loopback', async () => {
      const res = await withTimeout(fetch(`http://127.0.0.1:${localPort}/ht`), 30_000, 'fetch');
      const body = await res.json();
      const want = `${params.host}:${params.port}`;
      if (body.host !== want) throw new Error(`service saw Host ${body.host}, want ${want}`);
      return `HTTP ${res.status}, Host ${body.host}`;
    });
    await step('websocket over loopback', async () => {
      const echo = await withTimeout(webSocketEcho(`ws://127.0.0.1:${localPort}/ws`, 'hello'), 30_000, 'websocket');
      if (echo !== 'echo:hello') throw new Error(`got ${echo}`);
      return echo;
    });
  } catch {
    // Recorded above; still try to report below.
  }

  const ok = steps.length === 5 && steps.every((s) => s.ok);
  if (localPort) {
    try {
      await fetch(`http://127.0.0.1:${localPort}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok, steps }),
      });
      log(`reported ok=${ok}`);
    } catch (error) {
      log(`report failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  log(`RESULT ${ok ? 'PASS' : 'FAIL'}`);
  return ok;
}

export default function MeshSelfTestScreen() {
  const params = useLocalSearchParams<{ control?: string; key?: string; host?: string; port?: string }>();
  const [steps, setSteps] = React.useState<Step[]>([]);
  const [result, setResult] = React.useState<'running' | 'pass' | 'fail' | null>(null);
  const started = React.useRef(false);

  React.useEffect(() => {
    if (!ENABLED || started.current || !params.control || !params.key || !params.host || !params.port) return;
    started.current = true;
    setResult('running');
    void runSelfTest(
      { control: params.control, key: params.key, host: params.host, port: Number(params.port) },
      (s) => setSteps((prev) => [...prev, s]),
    ).then((ok) => setResult(ok ? 'pass' : 'fail'));
  }, [params.control, params.key, params.host, params.port]);

  if (!ENABLED) {
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
          Mesh self-test: {result ?? 'waiting for parameters'}
        </Text>
        {steps.map((s) => (
          <Text key={s.name} className={s.ok ? 'text-foreground' : 'text-destructive'}>
            {s.ok ? '✓' : '✗'} {s.name}: {s.detail}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}
