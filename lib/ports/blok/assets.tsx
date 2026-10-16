import * as React from 'react';
import {splitPathSegments, type BlokComponentNode} from './runtime';

/**
 * Assets: the files an app brings with it, named in a blok like everything
 * else of a dependency, as `@<dependency>.assets.<name>` (a model in a scene).
 * orkestrator's `core/blok/renderer/assets.tsx`, without the image half: an
 * html `img` naming an asset still draws nothing here.
 *
 * The blok core knows how to show one; it does not know which agent a
 * dependency is bound to or where its files are stored. A host (rekuest, in
 * the app) answers that through this context. Without a host an asset is
 * unknown, and whatever shows it says so.
 */

export type BlokAssetKind = 'MODEL_3D' | 'IMAGE';

/** The bytes of a stored asset, and whether they were already checked against its reference (read from the phone's cache). */
export type BlokAssetBytes = {bytes: Uint8Array; verified?: boolean; keep?: () => void; discard?: () => void};

export type BlokAsset =
  | {status: 'loading'}
  /** The file is stored: `load` returns its bytes, which hash to `ref`. */
  | {status: 'ready'; ref: string; kind: BlokAssetKind; load: () => Promise<BlokAssetBytes>}
  /**
   * The app registered the asset and it is not stored yet. One the app brings it uploads
   * when it runs. One it only names a `source` for is added by an admin, from that source.
   */
  | {status: 'awaited'; kind: BlokAssetKind; source?: BlokAssetSource}
  | {status: 'unknown'; reason: string};

/** Where a file its app does not hold is fetched from. Adding it is the desktop app's: it fetches and uploads it. */
export type BlokAssetSource = {
  /** The host the file is fetched from. */
  host: string;
};

export type BlokAssetHost = {
  /** The asset `name` of the agent bound to `dependency`. A hook: called unconditionally, with empty strings when a prop names none. */
  useAsset: (dependency: string, name: string) => BlokAsset;
};

const DETACHED_HOST: BlokAssetHost = {
  useAsset: () => ({status: 'unknown', reason: 'This view has no asset store.'}),
};

const BlokAssetHostContext = React.createContext<BlokAssetHost>(DETACHED_HOST);

export const BlokAssetHostProvider = BlokAssetHostContext.Provider;

/** The segment after the dependency that names a file the agent brings instead of one of its states. */
export const ASSETS_SEGMENT = 'assets';

export const ASSET_KIND_LABELS: Record<BlokAssetKind, string> = {MODEL_3D: '3D model', IMAGE: 'image'};

/** The `(dependency, name)` a prop names when it is bound to `<dependency>.assets.<name>`; `null` otherwise. */
export const assetNamedBy = (
  component: BlokComponentNode,
  key: string,
): {dependency: string; name: string} | null => {
  const path = component.props?.find(candidate => candidate.key === key)?.dynamic_value?.path;
  if (typeof path !== 'string') return null;
  // `self.assets.scope`, `@self.assets.scope` or `self/assets/scope`: split as every other path is.
  const [dependency, segment, name, ...rest] = splitPathSegments(path.replace(/^@/, ''));
  if (segment !== ASSETS_SEGMENT || !dependency || !name || rest.length) return null;
  return {dependency, name};
};

/** The asset the prop `key` names; `null` when the prop names none. */
export const useBlokAsset = (component: BlokComponentNode, key: string): BlokAsset | null => {
  const named = assetNamedBy(component, key);
  const asset = React.useContext(BlokAssetHostContext).useAsset(named?.dependency ?? '', named?.name ?? '');
  return named ? asset : null;
};
