import {Directory, File, Paths} from 'expo-file-system';
import type {ModelBytes} from './loadModel';

/**
 * Models kept on the phone, under the hash of their bytes.
 *
 * An asset's reference is the SHA-256 of its bytes, so a file named after it
 * never goes stale and needs no expiry: a model opened once opens again
 * without the network, and without hashing it again, since only bytes that
 * proved to be the model are kept. What does not fit the budget is dropped,
 * least recently stored first, the first time a model is asked for after the
 * app starts.
 */

/** What the kept models may take on disk. */
export const MODEL_CACHE_BYTES = 512 * 1024 * 1024;

const EXTENSION = '.glb';
const PARTIAL = '.part';

let evicted = false;

const folder = (): Directory => {
  const directory = new Directory(Paths.cache, 'models');
  if (!directory.exists) directory.create({intermediates: true});
  return directory;
};

const hexOf = (ref: string): string => {
  const match = /^sha256:([0-9a-f]{64})$/.exec(ref);
  if (!match) throw new Error(`"${ref}" is not a model reference.`);
  return match[1];
};

/** Drops partial downloads, then the oldest models until the rest fit `budget`. */
export const evictModels = (budget: number = MODEL_CACHE_BYTES): void => {
  const files = folder()
    .list()
    .filter((entry): entry is File => entry instanceof File);
  const kept: File[] = [];
  for (const file of files) {
    if (file.name.endsWith(PARTIAL)) file.delete();
    else if (file.name.endsWith(EXTENSION)) kept.push(file);
  }
  kept.sort((a, b) => (a.modificationTime ?? 0) - (b.modificationTime ?? 0));
  let total = kept.reduce((sum, file) => sum + (file.size ?? 0), 0);
  for (const file of kept) {
    if (total <= budget) break;
    total -= file.size ?? 0;
    file.delete();
  }
};

const evictOnce = () => {
  if (evicted) return;
  evicted = true;
  try {
    evictModels();
  } catch (error) {
    console.warn('[scene] the model cache could not be trimmed:', error);
  }
};

/**
 * The bytes of the model `ref`: from disk when they were kept, otherwise
 * downloaded from the URL `url` resolves to. Downloaded bytes are kept only
 * once `loadModel` found them to be the model (`keep`).
 */
export const modelBytes = async (ref: string, url: () => Promise<string>): Promise<ModelBytes> => {
  evictOnce();
  const hex = hexOf(ref);
  const target = new File(folder(), `${hex}${EXTENSION}`);
  if (target.exists) return {bytes: await target.bytes(), verified: true};

  const partial = new File(folder(), `${hex}-${Date.now()}${PARTIAL}`);
  const downloaded = await File.downloadFileAsync(await url(), partial);
  const bytes = await downloaded.bytes();
  return {
    bytes,
    keep: () => {
      try {
        if (target.exists) downloaded.delete();
        else downloaded.moveSync(target);
      } catch (error) {
        console.warn('[scene] a model could not be kept on disk:', error);
      }
    },
    discard: () => {
      if (downloaded.exists) downloaded.delete();
    },
  };
};
