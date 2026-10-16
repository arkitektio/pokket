/**
 * The model cache on disk, against an in-memory stand-in for expo-file-system:
 * what is kept, what is read back without the network, and what is dropped.
 */

import {beforeEach, describe, expect, it, jest} from '@jest/globals';

type Entry = {bytes: Uint8Array; modificationTime: number};

const mockDisk = new Map<string, Entry>();
let mockClock = 0;
const mockDownloads: string[] = [];

jest.mock('expo-file-system', () => {
  const join = (parts: unknown[]) =>
    parts.map(part => (typeof part === 'string' ? part : (part as {uri: string}).uri)).join('/');

  class File {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get name() {
      return this.uri.split('/').pop() ?? '';
    }
    get exists() {
      return mockDisk.has(this.uri);
    }
    get size() {
      return mockDisk.get(this.uri)?.bytes.byteLength ?? 0;
    }
    get modificationTime() {
      return mockDisk.get(this.uri)?.modificationTime ?? null;
    }
    async bytes() {
      return mockDisk.get(this.uri)!.bytes;
    }
    delete() {
      mockDisk.delete(this.uri);
    }
    moveSync(target: File) {
      mockDisk.set(target.uri, mockDisk.get(this.uri)!);
      mockDisk.delete(this.uri);
      this.uri = target.uri;
    }
    static async downloadFileAsync(url: string, target: File) {
      mockDownloads.push(url);
      mockDisk.set(target.uri, {bytes: new TextEncoder().encode(url), modificationTime: (mockClock += 1)});
      return target;
    }
  }

  class Directory {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get exists() {
      return true;
    }
    create() {}
    list() {
      return [...mockDisk.keys()].filter(uri => uri.startsWith(`${this.uri}/`)).map(uri => new File(uri));
    }
  }

  return {File, Directory, Paths: {cache: {uri: 'cache'}}};
});

const ref = (digit: string) => `sha256:${digit.repeat(64)}`;

// Required after the mock is set up; eviction runs once per module, so each test gets a fresh one.
const load = () => {
  let module: typeof import('../assetCache') | undefined;
  jest.isolateModules(() => {
    module = require('../assetCache');
  });
  return module!;
};

beforeEach(() => {
  mockDisk.clear();
  mockDownloads.length = 0;
});

describe('modelBytes', () => {
  it('downloads a model it does not hold, and keeps it only when told to', async () => {
    const {modelBytes} = load();
    const first = await modelBytes(ref('a'), async () => 'https://store/a');
    expect(first.verified).toBeFalsy();
    expect(mockDownloads).toEqual(['https://store/a']);
    expect([...mockDisk.keys()].some(uri => uri.endsWith(`${'a'.repeat(64)}.glb`))).toBe(false);

    first.keep?.();
    const again = await modelBytes(ref('a'), async () => 'https://store/a');
    expect(again.verified).toBe(true);
    expect(new TextDecoder().decode(again.bytes)).toBe('https://store/a');
    expect(mockDownloads).toHaveLength(1);
  });

  it('leaves nothing behind for bytes that did not pass', async () => {
    const {modelBytes} = load();
    const bytes = await modelBytes(ref('b'), async () => 'https://store/b');
    bytes.discard?.();
    expect(mockDisk.size).toBe(0);
  });

  it('refuses a reference that is not a hash', async () => {
    const {modelBytes} = load();
    await expect(modelBytes('model.glb', async () => 'https://store/x')).rejects.toThrow('not a model reference');
  });
});

describe('evictModels', () => {
  it('drops partial downloads, then the oldest models until the rest fit', () => {
    const {evictModels} = load();
    const put = (name: string, size: number) =>
      mockDisk.set(`cache/models/${name}`, {bytes: new Uint8Array(size), modificationTime: (mockClock += 1)});
    put(`${'1'.repeat(64)}.glb`, 40);
    put(`${'2'.repeat(64)}.glb`, 40);
    put(`${'3'.repeat(64)}-1.part`, 10);
    put(`${'4'.repeat(64)}.glb`, 40);

    evictModels(100);

    expect([...mockDisk.keys()].map(uri => uri.split('/').pop()?.slice(0, 1))).toEqual(['2', '4']);
  });
});
