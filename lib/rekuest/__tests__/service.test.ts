import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';

jest.mock('sonner-native', () => ({toast: {error: jest.fn(), success: jest.fn(), info: jest.fn()}}));

// eslint-disable-next-line @typescript-eslint/no-require-imports -- after the mocks, on purpose
const {rekuestServiceDefinition} = require('../service') as typeof import('../service');

/** Sockets made while a test runs: none until the session is first used. */
const opened: string[] = [];
class Socket {
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: (() => void) | null = null;
  onclose: ((event: {code: number}) => void) | null = null;
  constructor(public url: string) {
    opened.push(url);
  }
  send() {}
  close(code = 1000) {
    this.readyState = 3;
    this.onclose?.({code});
  }
}

const build = () =>
  rekuestServiceDefinition.builder({
    manifest: {} as never,
    alias: {id: 'a', host: '127.0.0.1', port: 41000, ssl: false, path: 'rekuest'} as never,
    origin: {id: 'a', host: 'rekuest.mesh.lab', ssl: true, path: 'rekuest'} as never,
    fakts: {} as never,
    getToken: async () => ({access_token: 'token'}) as never,
  }) as unknown as {session: {getUrl: () => string; getStatus: () => string}; dispose: () => void};

describe("rekuest's service", () => {
  const original = globalThis.WebSocket;
  beforeEach(() => {
    opened.length = 0;
    globalThis.WebSocket = Socket as unknown as typeof WebSocket;
  });
  afterEach(() => {
    globalThis.WebSocket = original;
  });

  it('opens its session on first use, at the alias it talks to, and closes it when disposed', () => {
    const service = build();
    expect(opened).toEqual([]);
    const session = service.session;
    // The stand-in the client talks to (a mesh forward on loopback), as the GraphQL client does.
    expect(session.getUrl()).toBe('ws://127.0.0.1:41000/rekuest/session');
    expect(service.session).toBe(session);
    expect(opened).toHaveLength(1);

    service.dispose();
    expect(session.getStatus()).toBe('closed');
    expect(() => service.session).toThrow(/not connected/);
  });

  it('closes nothing it never opened', () => {
    const service = build();
    service.dispose();
    expect(opened).toEqual([]);
  });
});
