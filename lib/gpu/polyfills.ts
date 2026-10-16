/// <reference types="@webgpu/types" />
import 'fast-text-encoding';
// Installs `navigator.gpu` and `createImageBitmap` (which here also takes the
// encoded bytes of an image) on the JS runtime.
import 'react-native-webgpu';

/**
 * What three.js expects of a browser that Hermes does not have, installed once
 * before three is imported (`lib/gpu` imports this first).
 *
 * - `TextDecoder`: three's core and GLTFLoader decode JSON chunks with it.
 * - `FinalizationRegistry`: three's renderer registers objects with one; where
 *   Hermes lacks it, registering is a no-op and disposal is explicit (which
 *   it is anyway: see `dispose.ts`).
 */

type Registry = {register: () => void; unregister: () => boolean};

const globals = globalThis as unknown as {FinalizationRegistry?: new () => Registry};

if (typeof globals.FinalizationRegistry === 'undefined') {
  globals.FinalizationRegistry = class {
    register() {}
    unregister() {
      return false;
    }
  };
}
