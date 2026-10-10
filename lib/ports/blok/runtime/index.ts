/**
 * The pure half of orkestrator's blok runtime (`core/blok/renderer/runtime`):
 * the catalog, the call schemas and the interpreter that evaluates a
 * `UtilCall`. The rendering half (components, hooks, context, tree) stays on
 * the desktop; port validators and effects only ever evaluate calls.
 */
export * from './functions';
export * from './normalize';
export * from './schemas';
export * from './types';
export { invokeUtilCall } from './resolution';
export {
  extractUiComponents,
  getValueAtPath,
  isRecord,
  isString,
  normalizeLiteralValue,
  splitPathSegments,
} from './utils';
