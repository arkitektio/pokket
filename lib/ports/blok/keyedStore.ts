import AsyncStorage from '@react-native-async-storage/async-storage';
import type {KeyedStore, KeyedStoreOptions} from '@arkitektio/bsx/cache/keyedStore';

/**
 * `@arkitektio/bsx`'s keyed store (`cache/keyedStore.ts`), kept in AsyncStorage
 * instead of IndexedDB: one record per id, stored with the "hash" it was kept
 * for, mirrored in memory so a blok opened twice reads the device once. Given to
 * the package by `./platform.ts`.
 *
 * A store that cannot be read is a miss; a save that cannot be written still
 * serves this run of the app.
 */

type Stored<T> = {key: string; value: T};

export const createKeyedStore = <T,>({
  prefix,
  version,
  isValue,
  label,
}: {
  /** Namespaces the AsyncStorage keys. */
  prefix: string;
  /** Bumped when what is kept changes meaning: older records are misses. */
  version: number;
  isValue: (value: unknown) => value is T;
  /** Named in warnings. */
  label: string;
}): KeyedStore<T> => {
  const memory = new Map<string, Stored<T>>();
  const storageKey = (id: string) => `${prefix}:v${version}:${id}`;

  const read = (raw: string | null): Stored<T> | null => {
    if (raw === null) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return null;
      const entry = parsed as {key?: unknown; value?: unknown};
      return typeof entry.key === 'string' && isValue(entry.value) ? {key: entry.key, value: entry.value} : null;
    } catch {
      return null;
    }
  };

  return {
    load: async (id, hash) => {
      const cached = memory.get(id);
      if (cached) return cached.key === hash ? cached.value : null;
      try {
        const entry = read(await AsyncStorage.getItem(storageKey(id)));
        if (!entry) return null;
        memory.set(id, entry);
        return entry.key === hash ? entry.value : null;
      } catch (error) {
        console.warn(`Could not read a ${label}`, error);
        return null;
      }
    },
    save: async (id, hash, value) => {
      const entry: Stored<T> = {key: hash, value};
      memory.set(id, entry);
      try {
        await AsyncStorage.setItem(storageKey(id), JSON.stringify(entry));
      } catch (error) {
        console.warn(`Could not keep a ${label}`, error);
      }
    },
    forget: async id => {
      memory.delete(id);
      try {
        await AsyncStorage.removeItem(storageKey(id));
      } catch (error) {
        console.warn(`Could not forget a ${label}`, error);
      }
    },
    clear: async () => {
      memory.clear();
      try {
        const keys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith(`${prefix}:`));
        await AsyncStorage.multiRemove(keys);
      } catch (error) {
        console.warn(`Could not clear the ${label}s`, error);
      }
    },
  };
};

/**
 * The package's stores by their names, as pokket kept them before it used the
 * package: the same AsyncStorage keys, so what a phone kept survives.
 */
const PREFIXES: Record<string, string> = {
  'orkestrator-blok-locals': 'pokket-blok-locals',
  'orkestrator-blok-components': 'pokket-blok-components',
};

/** `configureBlokPlatform({keyedStore})`: a package store, in AsyncStorage. */
export const asyncKeyedStore = <T,>({db, store, version, isValue, label}: KeyedStoreOptions<T>): KeyedStore<T> =>
  createKeyedStore({prefix: PREFIXES[db] ?? `${db}:${store}`, version, isValue, label});
