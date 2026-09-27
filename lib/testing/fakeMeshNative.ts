import { jest } from "@jest/globals";
// A stand-in for modules/pokket-mesh's native module, for jest: it records
// calls and emits status events the way the Go sidecar does (starting, then
// running with a MagicDNS suffix).
type Listener = (event: any) => void;

export type FakeMeshNative = ReturnType<typeof createFakeMeshNative>;

export const createFakeMeshNative = () => {
  const listeners: Record<string, Listener[]> = {};
  const calls: any[][] = [];
  let nextPort = 40000;
  const ports = new Map<string, number>();
  const emit = (status: object) =>
    (listeners.onStatus || []).forEach((cb) => cb({ status: JSON.stringify(status) }));
  const fake = {
    calls,
    /** What `start` leads to; tests may change it (e.g. "needs-login"). */
    startOutcome: "running" as string,
    emit,
    isAvailable: () => true,
    version: () => "test",
    addListener: (event: string, cb: Listener) => {
      (listeners[event] ||= []).push(cb);
      return { remove: () => {} };
    },
    start: jest.fn(async (id: string, controlUrl: string, hostname: string, authKey?: string | null) => {
      calls.push(["start", id, controlUrl, hostname, authKey ?? null]);
      setTimeout(() => emit({ id, state: "starting" }), 1);
      setTimeout(() => emit({ id, state: fake.startOutcome, magicDnsSuffix: "tail.example" }), 5);
    }),
    stop: jest.fn(async (id: string) => {
      calls.push(["stop", id]);
      ports.clear();
      emit({ id, state: "stopped" });
    }),
    forget: jest.fn(async (id: string) => {
      calls.push(["forget", id]);
    }),
    forward: jest.fn(async (id: string, host: string, port: number, tls: boolean) => {
      calls.push(["forward", id, host, port, tls]);
      const key = `${host}|${port}|${tls}`;
      if (!ports.has(key)) ports.set(key, nextPort++);
      return ports.get(key)!;
    }),
    status: jest.fn(async () => null),
    refreshNetwork: jest.fn(async () => {}),
    /** Simulate iOS reclaiming the loopback sockets while suspended. */
    rebindAll: () => {
      for (const key of ports.keys()) ports.set(key, nextPort++);
    },
  };
  return fake;
};
