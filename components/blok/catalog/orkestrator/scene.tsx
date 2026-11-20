import * as React from 'react';
import {ActivityIndicator, Pressable, ScrollView, View} from 'react-native';
import {Image as SceneIcon} from 'lucide-react-native';
import {useBinding, useBlok, useEventAction, useValue, type BlokRenderArgs} from '@arkitektio/bsx/runtime';
import {SnapshotImage} from '@/components/mikro/SnapshotImage';
import {Text} from '@/components/ui/text';
import {
  useGetBlokAnnotationCollectionQuery,
  useGetBlokSceneQuery,
  type BlokSceneFragment,
  type BlokSceneLayerFragment,
} from '@/lib/mikro/api/graphql';
import {humanize} from '@/lib/mikro/format';
import {useThemeColors} from '@/lib/theme/BrandProvider';
import {cn} from '@/lib/utils';
import {asStructure, cssLength, renderChildList} from '../shared';
import {
  asSelection,
  dataLens,
  layersKey,
  layersPayload,
  selectionPayload,
  worldRef,
  type BoundSelection,
  type SceneSelectPayload,
} from './payloads';
import {mikroScenePanelSchema, mikroSceneSchema, mikroSceneViewportSchema} from './schemas';

/**
 * The mikro scene bloks on the phone, after orkestrator's
 * `mikro/bloks/MikroSceneParts.tsx`. Orkestrator draws the scene with its
 * octree renderer (three.js on WebGPU, every layer's bricks streamed from
 * zarr); the phone draws no layer. What a phone can do, it does:
 *
 * - `MikroScene` loads the scene, shares it with the parts inside it, writes
 *   `bindWorld`, follows the scene while `live` (read again every few
 *   seconds), and runs `onLayersChange` when a layer comes, goes or draws
 *   another lens.
 * - `MikroSceneViewport` shows the scene's last picture (its latest snapshot).
 * - `MikroSceneLayers` lists the layers.
 * - `MikroSceneAnnotations` lists each annotation layer's shapes; a press
 *   selects one, which writes `bind` and runs `onSelect`, as a click on the
 *   shape does in orkestrator.
 * - `MikroSceneProbe` says that probing needs the 3D view.
 *
 * Nothing is drawn or probed here, so `onAnnotation` and `onPick` never run on
 * the phone.
 */

/** How often a live scene is read again: the phone has no subscription to mikro. */
export const LIVE_POLL_MS = 10_000;

/** How many shapes of one collection are listed. */
const ANNOTATION_LIMIT = 200;

type SceneState = {
  scene: BlokSceneFragment;
  /** The selected shape's id, or null. */
  selected: string | null;
  select: (annotationId: string | null) => void;
};

/** The scene the parts inside a `MikroScene` show, and its selection. */
const MikroSceneContext = React.createContext<SceneState | null>(null);

const Notice = ({children, className}: {children: React.ReactNode; className?: string}) => (
  <View className={cn('min-h-24 w-full items-center justify-center p-4', className)}>
    <Text className="text-center text-sm text-muted-foreground">{children}</Text>
  </View>
);

/* -------------------------------------------------------------------------- */

export const MikroSceneRender = ({component, buildChild}: BlokRenderArgs) => {
  const blok = useBlok(component, mikroSceneSchema);
  const value = asStructure(useValue(blok.value));
  const className = useValue(blok.className);
  const live = useValue(blok.live) !== false;
  const {data, loading, error} = useGetBlokSceneQuery({
    variables: {id: String(value?.object ?? '')},
    skip: !value,
    pollInterval: live ? LIVE_POLL_MS : 0,
    // As orkestrator's: a layer whose placement cannot condense nulls that field, not the scene.
    errorPolicy: 'all',
  });
  const scene = data?.scene ?? null;

  if (!value) return <Notice>No scene yet.</Notice>;
  if (!scene) {
    return loading ? (
      <View className="min-h-24 items-center justify-center">
        <ActivityIndicator />
      </View>
    ) : (
      <Notice>{error ? 'This scene could not be loaded.' : 'This scene was not found.'}</Notice>
    );
  }

  return (
    <SceneWiring component={component} scene={scene}>
      <View className={cn('min-w-0 gap-3', className)}>{renderChildList(component.children, buildChild)}</View>
    </SceneWiring>
  );
};

/** The container's events, its selection binding and its world binding. */
const SceneWiring = ({
  component,
  scene,
  children,
}: {
  component: BlokRenderArgs['component'];
  scene: BlokSceneFragment;
  children: React.ReactNode;
}) => {
  const blok = useBlok(component, mikroSceneSchema);
  const binding = useBinding(useValue(blok.bind));
  const onSelect = useEventAction(blok.onSelect);
  const onLayersChange = useEventAction(blok.onLayersChange);

  // The selection is the binding's when there is one, else this scene's own.
  const [own, setOwn] = React.useState<string | null>(null);
  const bound: BoundSelection = binding ? asSelection(binding.value) : null;
  const selected = binding ? (bound?.annotation?.object ?? null) : own;

  const layers = scene.layers;
  const select = React.useCallback(
    (annotationId: string | null) => {
      const payload: SceneSelectPayload = selectionPayload(annotationId ? [annotationId] : [], dataLens(layers));
      if (binding) binding.setValue(payload.annotation ? {annotation: payload.annotation, lens: payload.lens} : null);
      else setOwn(annotationId);
      onSelect?.(payload);
    },
    [binding, layers, onSelect],
  );

  useBoundWorld(useValue(blok.bindWorld), scene.worldCoordinateSystem?.id ?? null);
  useLayerChanges(layers, onLayersChange);

  const state = React.useMemo(() => ({scene, selected, select}), [scene, selected, select]);
  return <MikroSceneContext.Provider value={state}>{children}</MikroSceneContext.Provider>;
};

/** Keeps `bindWorld` on the scene's world space. Written only when it differs: a write is a new binding. */
const useBoundWorld = (bind: string | undefined, world: string | null) => {
  const binding = useBinding(bind);
  const held = asStructure(binding?.value)?.object ?? null;
  React.useEffect(() => {
    if (!binding || String(held ?? '') === String(world ?? '')) return;
    binding.setValue(world ? worldRef(world) : null);
  }, [binding, held, world]);
};

/** Runs `onLayersChange` when a layer comes, goes or draws another lens; the layers the scene opened with are not a change. */
const useLayerChanges = (layers: readonly BlokSceneLayerFragment[], onLayersChange: ((value?: unknown) => void) | undefined) => {
  const key = layersKey(layers);
  const seen = React.useRef<Set<string> | null>(null);
  const latest = React.useRef({layers, onLayersChange});
  // Before the effect below, which reads it: effects run in order.
  React.useEffect(() => {
    latest.current = {layers, onLayersChange};
  });
  React.useEffect(() => {
    const current = latest.current.layers;
    const previous = seen.current;
    seen.current = new Set(current.map(layer => layer.id));
    if (previous === null) return;
    latest.current.onLayersChange?.(layersPayload(current, previous));
  }, [key]);
};

/* -------------------------------------------------------------------------- */

export const MikroSceneViewportRender = ({component}: BlokRenderArgs) => {
  const blok = useBlok(component, mikroSceneViewportSchema);
  const state = React.useContext(MikroSceneContext);
  const height = cssLength(useValue(blok.height) ?? '32rem');
  const minHeight = cssLength(useValue(blok.minHeight));
  const className = useValue(blok.className);
  if (!state) return <Notice>Place the viewport inside a MikroScene.</Notice>;
  const snapshot = state.scene.latestSnapshot;

  // The phone draws no layer: the scene as it was last pictured, said so under it.
  return (
    <View className={cn('w-full gap-1', className)}>
      <View className="w-full overflow-hidden rounded-xl" style={{height: typeof height === 'number' ? height : 512, minHeight}}>
        <SnapshotImage snapshot={snapshot} icon={SceneIcon} width="100%" height={typeof height === 'number' ? height : 512} radius={12} />
      </View>
      <Text className="text-xs text-muted-foreground">
        {snapshot ? 'The scene as last pictured. Its 3D view opens in Orkestrator.' : 'No picture of this scene yet. Its 3D view opens in Orkestrator.'}
      </Text>
    </View>
  );
};

/* -------------------------------------------------------------------------- */

/** A part's box: a frame, scrolling inside when it is given a height. */
const Panel = ({component, children}: {component: BlokRenderArgs['component']; children: React.ReactNode}) => {
  const blok = useBlok(component, mikroScenePanelSchema);
  const height = cssLength(useValue(blok.height));
  const className = useValue(blok.className);
  return (
    <View className={cn('min-w-0 overflow-hidden rounded-xl border border-border', className)} style={{height}}>
      {height !== undefined ? <ScrollView contentContainerClassName="p-2">{children}</ScrollView> : <View className="p-2">{children}</View>}
    </View>
  );
};

const layerTitle = (layer: BlokSceneLayerFragment): string =>
  layer.name || ('arrayLens' in layer && layer.arrayLens?.label) || humanize(layer.kind);

const LayerRow = ({layer}: {layer: BlokSceneLayerFragment}) => {
  const lens = 'arrayLens' in layer ? layer.arrayLens : null;
  const collection = 'annotationCollection' in layer ? layer.annotationCollection : null;
  const detail = [humanize(layer.kind), lens?.label ?? collection?.name, layer.visible ? null : 'hidden'].filter(Boolean).join(' · ');
  return (
    <View className={cn('rounded-lg px-2 py-2', !layer.visible && 'opacity-60')}>
      <Text className="text-sm text-foreground" numberOfLines={1}>
        {layerTitle(layer)}
      </Text>
      <Text className="text-xs text-muted-foreground" numberOfLines={1}>
        {detail}
      </Text>
    </View>
  );
};

export const MikroSceneLayersRender = ({component}: BlokRenderArgs) => {
  const state = React.useContext(MikroSceneContext);
  if (!state) return <Notice>Place this inside a MikroScene.</Notice>;
  const layers = [...state.scene.layers].sort((a, b) => a.order - b.order);
  return (
    <Panel component={component}>
      {layers.length === 0 ? <Notice>No layers yet.</Notice> : layers.map(layer => <LayerRow key={layer.id} layer={layer} />)}
    </Panel>
  );
};

/* -------------------------------------------------------------------------- */

const AnnotationCard = ({collectionId, name, state}: {collectionId: string; name: string; state: SceneState}) => {
  const colors = useThemeColors();
  const {data, loading, error} = useGetBlokAnnotationCollectionQuery({
    variables: {id: collectionId, limit: ANNOTATION_LIMIT},
    // Shapes drawn elsewhere show up while the scene is followed.
    pollInterval: LIVE_POLL_MS,
  });
  const annotations = data?.annotationCollection.annotations ?? [];
  return (
    <View className="gap-1 rounded-lg border border-border p-2">
      <Text className="text-sm font-medium text-foreground">{data?.annotationCollection.name ?? name}</Text>
      {annotations.length === 0 ? (
        <Text className="text-xs text-muted-foreground">
          {loading ? 'Loading shapes…' : error ? 'Its shapes could not be loaded.' : 'No shapes yet.'}
        </Text>
      ) : (
        annotations.map(annotation => {
          const selected = state.selected === annotation.id;
          return (
            <Pressable
              key={annotation.id}
              accessibilityRole="button"
              accessibilityState={{selected}}
              accessibilityLabel={`${selected ? 'Deselect' : 'Select'} ${annotation.name || humanize(annotation.kind)}`}
              onPress={() => state.select(selected ? null : annotation.id)}
              className={cn('flex-row items-center justify-between rounded-md px-2 py-1.5', selected && 'bg-primary/15')}
            >
              <Text className="shrink text-sm text-foreground" numberOfLines={1}>
                {annotation.name || humanize(annotation.kind)}
              </Text>
              <Text className="text-xs" style={{color: selected ? colors.primary : colors.mutedForeground}}>
                {humanize(annotation.kind)}
              </Text>
            </Pressable>
          );
        })
      )}
      {annotations.length >= ANNOTATION_LIMIT ? (
        <Text className="text-xs text-muted-foreground">The first {ANNOTATION_LIMIT} shapes.</Text>
      ) : null}
    </View>
  );
};

export const MikroSceneAnnotationsRender = ({component}: BlokRenderArgs) => {
  const state = React.useContext(MikroSceneContext);
  if (!state) return <Notice>Place this inside a MikroScene.</Notice>;
  const collections = state.scene.layers.flatMap(layer =>
    'annotationCollection' in layer && layer.annotationCollection ? [layer.annotationCollection] : [],
  );
  return (
    <Panel component={component}>
      {collections.length === 0 ? (
        <Notice>No annotation layers yet.</Notice>
      ) : (
        <View className="gap-2">
          {collections.map(collection => (
            <AnnotationCard key={collection.id} collectionId={collection.id} name={collection.name} state={state} />
          ))}
        </View>
      )}
    </Panel>
  );
};

/* -------------------------------------------------------------------------- */

export const MikroSceneProbeRender = ({component}: BlokRenderArgs) => {
  const state = React.useContext(MikroSceneContext);
  if (!state) return <Notice>Place this inside a MikroScene.</Notice>;
  return (
    <Panel component={component}>
      <Notice>The probe reads what lies under the cursor in the 3D view, which opens in Orkestrator.</Notice>
    </Panel>
  );
};
