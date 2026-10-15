/**
 * Orkestrator's blok runtime (`core/blok/renderer/runtime`), kept file for
 * file so the two can be diffed: the catalog, the call schemas, the
 * interpreter, and the rendering half (store, hooks, scope, tree). Only the
 * node error card is pokket's own, drawn with React Native.
 */
export * from './checks';
export * from './components';
export * from './context';
export * from './functions';
export * from './hooks';
export * from './normalize';
export * from './port';
export * from './preflight';
export * from './schemas';
export * from './scope';
export * from './task';
export * from './tree';
export * from './types';
// `utils` is exported because entry points outside the runtime (the rekuest
// adapters) normalize payloads with the same helpers. `resolution` stays
// internal — components go through the hooks — except `invokeUtilCall`, which
// the rekuest port-call runtime (effects/validators) reuses to evaluate a
// standalone UtilCall against its own catalog and context.
export { invokeUtilCall } from './resolution';
export {
  extractUiComponents,
  getValueAtPath,
  isRecord,
  isString,
  normalizeLiteralValue,
  splitPathSegments,
} from './utils';
