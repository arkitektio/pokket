import { meshNative, parseMeshStatus, type MeshNodeStatus } from '@/modules/pokket-mesh';

/**
 * The mesh sidecar's on-device self-test, for CI (.github/workflows/mesh.yaml).
 * The screen (app/mesh-selftest.tsx) and the boot hook (./selftestBoot.tsx)
 * both start it through `startSelfTest`, which runs it once per app process.
 *
 * It joins the test tailnet that `go test -run TestDeviceEnv` serves, and
 * checks, in the real app sandbox with the real permissions: the native module
 * loads, the node reaches "running", a forward opens, RN fetch and RN
 * WebSocket work over http://127.0.0.1 (release cleartext policy / ATS), and
 * it posts its result to the service THROUGH the mesh — so a report arriving
 * at all proves the path works. Every build without EXPO_PUBLIC_MESH_SELFTEST=1
 * does nothing.
 */

export const SELFTEST_ENABLED = process.env.EXPO_PUBLIC_MESH_SELFTEST === '1';
/**
 * Optional: the self-test's parameters as a query string, baked into the build
 * so it runs without a deep link (the iOS simulator run uses this).
 */
export const SELFTEST_AUTORUN = process.env.EXPO_PUBLIC_MESH_SELFTEST_AUTORUN ?? '';

const ID = 'selftest';
const RUNNING_TIMEOUT_MS = 120_000;

export type SelfTestParams = { control: string; key: string; host: string; port: number; progress?: string };
export type Step = { name: string; ok: boolean; detail: string };
export type SelfTestState = { result: 'running' | 'pass' | 'fail' | null; steps: Step[] };

/** Where to stream progress (the test env's side channel), set per run. */
let progressUrl: string | undefined;
let progressSeq = 0;

export const setProgressUrl = (url: string | undefined) => {
  if (url) progressUrl = url;
};

export const selftestLog = (message: string) => {
  console.log(`[mesh-selftest] ${message}`);
  if (!progressUrl) return;
  // Fire and forget, numbered: Release builds keep console.log out of the
  // device log, and a device that never gets onto the mesh can still say why.
  fetch(progressUrl, { method: 'POST', body: `${++progressSeq} ${message}` }).catch(() => {});
};
const log = selftestLog;

/** Parses the self-test's parameters from a deep link's / AUTORUN's query. */
export const parseSelfTestParams = (query: Record<string, string | undefined>): SelfTestParams | null => {
  const { control, key, host, port, progress } = query;
  if (!control || !key || !host || !port || !Number(port)) return null;
  return { control, key, host, port: Number(port), progress: progress || undefined };
};

export const parseQuery = (query: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const part of query.replace(/^[^?]*\?/, '').split('&')) {
    if (!part) continue;
    const [k, v = ''] = part.split('=');
    out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
  }
  return out;
};

let state: SelfTestState = { result: null, steps: [] };
const listeners = new Set<(s: SelfTestState) => void>();
const setState = (next: SelfTestState) => {
  state = next;
  listeners.forEach((l) => l(state));
};
export const getSelfTestState = () => state;
export const subscribeSelfTest = (listener: (s: SelfTestState) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Starts the self-test unless it already ran in this process; `false` if it did. */
export const startSelfTest = (params: SelfTestParams, source: string): boolean => {
  if (!SELFTEST_ENABLED || state.result !== null) return false;
  setState({ result: 'running', steps: [] });
  setProgressUrl(params.progress);
  log(`starting (from ${source})`);
  void runSelfTest(params, (s) => setState({ ...state, steps: [...state.steps, s] })).then((ok) =>
    setState({ ...state, result: ok ? 'pass' : 'fail' }),
  );
  return true;
};

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
      log(
        `status ${parsed.state} backend=${parsed.backendState ?? '-'} peers=${parsed.peers?.length ?? 0}` +
          (parsed.health?.length ? ` health=${JSON.stringify(parsed.health)}` : '') +
          (parsed.error ? ` error=${parsed.error}` : ''),
      );
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

async function runSelfTest(params: SelfTestParams, onStep: (s: Step) => void) {
  log('self-test started');
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
      // The self-test's whole point is diagnosis: tsnet's log goes to logcat /
      // the console, and the node's user-facing lines to the JS log.
      native!.setVerbose(true);
      native!.addListener('onLog', ({ message }) => log(`node: ${message}`));
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
