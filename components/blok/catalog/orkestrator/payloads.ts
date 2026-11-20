/**
 * What a MikroScene's events hand a blok's action, as plain data: structure
 * references (`{__identifier, object}`) that slot straight into an action's
 * ports. orkestrator's `scene/platform/events/eventPayloads.ts`, for the
 * layers the phone reads (`BlokSceneLayer`: the array lens is `arrayLens`).
 *
 * Pure, so the mapping is tested without a scene.
 */

export type StructureRef = {__identifier: string; object: string};

const ANNOTATION = '@mikro/annotation';
const ARRAY_LENS = '@mikro/arraylens';
const WORLD = '@mikro/coordinatesystem';

const ref = (identifier: string, id: string): StructureRef => ({__identifier: identifier, object: id});

/** The parts of a scene layer the payloads read. */
export type PayloadLayer = {
  id: string;
  __typename?: string;
  visible?: boolean | null;
  arrayLens?: {id?: string | null; dataset?: {id?: string | null} | null} | null;
};

/** The array lens a layer draws, as a reference; null for any other kind. */
export const lensOfLayer = (layers: readonly PayloadLayer[], layerId: string | null | undefined): StructureRef | null => {
  const layer = layerId ? layers.find(entry => entry.id === layerId) : undefined;
  return layer?.arrayLens?.id && layer.arrayLens.dataset ? ref(ARRAY_LENS, layer.arrayLens.id) : null;
};

/** The lens a host should run with: the first visible array layer's (the phone has no data layer of its own). */
export const dataLens = (layers: readonly PayloadLayer[]): StructureRef | null =>
  lensOfLayer(layers, layers.find(layer => layer.visible !== false && layer.arrayLens?.dataset)?.id);

export type SceneSelectPayload = {
  /** The first selected shape, or null when nothing is selected. */
  annotation: StructureRef | null;
  annotations: StructureRef[];
  lens: StructureRef | null;
};

export const selectionPayload = (annotationIds: readonly string[], lens: StructureRef | null): SceneSelectPayload => ({
  annotation: annotationIds[0] ? ref(ANNOTATION, annotationIds[0]) : null,
  annotations: annotationIds.map(id => ref(ANNOTATION, id)),
  lens,
});

/** What `bind` holds: the shape and the lens it was looked at with, or null. */
export type BoundSelection = {annotation: StructureRef | null; lens: StructureRef | null} | null;

export const asSelection = (raw: unknown): BoundSelection => {
  if (raw == null || typeof raw !== 'object') return null;
  const value = raw as {annotation?: unknown; lens?: unknown};
  const structure = (item: unknown): StructureRef | null => {
    if (item == null || typeof item !== 'object') return null;
    const {object, __identifier} = item as {object?: unknown; __identifier?: unknown};
    return object != null && typeof __identifier === 'string' ? {object: String(object), __identifier} : null;
  };
  return {annotation: structure(value.annotation), lens: structure(value.lens)};
};

export const worldRef = (id: string): StructureRef => ref(WORLD, id);

export type SceneLayersPayload = {
  layers: {layer: string; kind: string; lens: StructureRef | null}[];
  /** Layers that were not there at the previous event: tells a host its own run's layers from the rest. */
  added: string[];
};

/** Moves only when a layer comes, goes or draws another lens: not on contrast or visibility ticks. */
export const layersKey = (layers: readonly PayloadLayer[]): string =>
  layers.map(layer => `${layer.id}:${layer.arrayLens?.id ?? ''}`).join(',');

export const layersPayload = (layers: readonly PayloadLayer[], previousIds: ReadonlySet<string>): SceneLayersPayload => ({
  layers: layers.map(layer => ({
    layer: layer.id,
    kind: layer.__typename ?? 'Layer',
    lens: lensOfLayer(layers, layer.id),
  })),
  added: layers.filter(layer => !previousIds.has(layer.id)).map(layer => layer.id),
});
