import * as React from 'react';
import {Pressable, ScrollView, View, type LayoutChangeEvent} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, type SharedValue} from 'react-native-reanimated';
import * as THREE from 'three';
import {useFrame, useThree} from '@react-three/fiber';
import {Box, Grid3x3, Pin, RotateCw, Scan, TriangleAlert, X} from 'lucide-react-native';
import {Text} from '@/components/ui/text';
import {OrbitTouch} from '@/lib/gpu/controls/OrbitTouch';
import {Grid} from '@/lib/gpu/draw/Grid';
import {FiberCanvas} from '@/lib/gpu/FiberCanvas';
import {
  BlokNodeErrorSurface,
  useBlok,
  useValue,
  type BlokNodeErrorProps,
  type BlokRenderArgs,
} from '@arkitektio/bsx/runtime';
import {useThemeColors} from '@/lib/theme/BrandProvider';
import {cn} from '@/lib/utils';
import {cssLength} from '../shared';
import {
  createSceneStore,
  SceneStoreProvider,
  useSceneNotice,
  useSceneState,
  useSceneStoreApi,
  type SceneOverlay,
  type SceneView,
} from './context';
import {BlokSceneEmbedProvider, useBlokSceneEmbedded, useBlokSceneFill} from './host';
import {usePersistedComponentState} from '@arkitektio/bsx/renderer/persist';
import type {sceneCatalog} from '@arkitektio/bsx/catalogs';

type Scene = typeof sceneCatalog.components;

/**
 * orkestrator's `bloks/scene/Scene.tsx` on the phone: the canvas is R3F on
 * WebGPU (`lib/gpu`), the cards laid over it are React Native views, and the
 * camera is turned with the fingers (one to turn, two to move, a pinch to
 * zoom). It draws only while something moves.
 *
 * Left out: dragging a card aside (cards stay on their part), the snapshot
 * mode for previews, and the settings popover (its switches are the toolbar's
 * buttons here).
 */

/** The direction each view looks from, toward what it frames. */
const VIEW_DIRECTIONS: Record<SceneView, [number, number, number]> = {
  iso: [1, 0.8, 1],
  front: [0, 0.25, 1],
  side: [1, 0.25, 0],
  top: [0, 1, 0.001],
};

const VIEW_LABELS: Record<SceneView, string> = {iso: 'Iso', front: 'Front', side: 'Side', top: 'Top'};

/** The height a scene takes where the element it is in has none to fit (24rem). */
const FALLBACK_HEIGHT = 384;

const bounds = new THREE.Box3();
const sphere = new THREE.Sphere();

/** Where the viewer left the camera: what a `persist` scene keeps by its id. */
export type ScenePose = {position: [number, number, number]; target: [number, number, number]; grid: boolean};

const isTriple = (value: unknown): value is [number, number, number] =>
  Array.isArray(value) && value.length === 3 && value.every(item => typeof item === 'number' && Number.isFinite(item));

export const isScenePose = (value: unknown): value is ScenePose =>
  typeof value === 'object' &&
  value !== null &&
  isTriple((value as ScenePose).position) &&
  isTriple((value as ScenePose).target) &&
  typeof (value as ScenePose).grid === 'boolean';

/**
 * Points the camera at what is in the scene. A view is a direction; how far
 * back the camera stands follows from the size of the models. The scene is
 * framed when a view is asked for, and once when its first model arrives; a
 * kept pose stands until the viewer asks for a view.
 */
const CameraRig = ({pose}: {pose?: ScenePose | null}) => {
  const store = useSceneStoreApi();
  const view = useSceneState(state => state.view);
  const placed = useSceneState(state => state.placed);
  const three = useThree(state => state.get);
  const ready = useThree(state => state.controls !== null);

  const frame = React.useCallback(
    (name: SceneView) => {
      const camera = three().camera;
      const controls = three().controls as unknown as {target: THREE.Vector3; update: () => void} | null;
      if (!ready || !controls) return;
      bounds.makeEmpty();
      store.getState().placed.forEach(object => {
        object.updateWorldMatrix(true, true);
        bounds.expandByObject(object);
      });
      if (bounds.isEmpty()) bounds.set(new THREE.Vector3(-0.15, 0, -0.15), new THREE.Vector3(0.15, 0.3, 0.15));
      bounds.getBoundingSphere(sphere);
      const fov = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
      const distance = (Math.max(sphere.radius, 0.01) / Math.sin(fov / 2)) * 1.15;
      const direction = new THREE.Vector3(...VIEW_DIRECTIONS[name]).normalize();
      controls.target.copy(sphere.center);
      camera.position.copy(sphere.center).addScaledVector(direction, distance);
      camera.near = distance / 200;
      camera.far = distance * 200;
      camera.updateProjectionMatrix();
      controls.update();
    },
    [ready, store, three],
  );

  // A kept pose stands until the viewer asks for a view: it is where they left the camera.
  const restore = React.useCallback(() => {
    const controls = three().controls as unknown as {target: THREE.Vector3; update: () => void} | null;
    if (!ready || !controls || !pose) return false;
    const camera = three().camera;
    controls.target.set(...pose.target);
    camera.position.set(...pose.position);
    const distance = camera.position.distanceTo(controls.target);
    camera.near = Math.max(distance / 200, 0.001);
    camera.far = distance * 200;
    camera.updateProjectionMatrix();
    controls.update();
    return true;
  }, [pose, ready, three]);

  React.useEffect(() => {
    if (view.serial === 0 && restore()) return;
    frame(view.name);
  }, [frame, restore, view]);

  const framedFor = React.useRef(0);
  React.useEffect(() => {
    if (placed.size > framedFor.current && !(pose && store.getState().view.serial === 0)) frame(store.getState().view.name);
    framedFor.current = placed.size;
  }, [frame, placed, pose, store]);

  return null;
};

const SceneControls3D = () => <OrbitTouch autoRotate={useSceneState(state => state.settings.autoRotate)} />;

/** Inside the canvas an error cannot be a card; it is reported beside the scene. */
const SceneErrorSurface = ({componentId, title, detail}: BlokNodeErrorProps) => {
  useSceneNotice(title, detail ? `${detail} (${componentId})` : componentId);
  return null;
};

/** Room kept between a card and the edge of the view, and between a card and what it points at. */
const CARD_INSET = 8;
const CARD_GAP = 12;

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), Math.max(low, high));

/** A popout card as the frame loop moves it: where it goes, and how big it was laid out. */
type CardHandle = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  shown: SharedValue<number>;
  width: SharedValue<number>;
  height: SharedValue<number>;
};

type CardHandles = React.RefObject<Map<string, CardHandle>>;

const projected = new THREE.Vector3();

/**
 * Keeps every popout on its anchor, in each frame drawn, without a React
 * render: the position goes to the card's shared values. A card rides above
 * the spot it points at, kept inside the view, and flips below when there is
 * no room above.
 */
const OverlayTracker = ({cards}: {cards: CardHandles}) => {
  const store = useSceneStoreApi();
  const overlays = useSceneState(state => state.overlays);
  const invalidate = useThree(state => state.invalidate);
  // A card that just opened needs a frame to find its place.
  React.useEffect(() => invalidate(), [invalidate, overlays]);
  useFrame(({camera, size}) => {
    store.getState().overlays.forEach(overlay => {
      const handle = cards.current?.get(overlay.id);
      if (!handle || overlay.mode !== 'popout') return;
      const anchor = overlay.anchor();
      if (!anchor) {
        handle.shown.set(0);
        return;
      }
      if (overlay.point) projected.copy(overlay.point).applyMatrix4(anchor.matrixWorld);
      else anchor.getWorldPosition(projected);
      projected.project(camera);
      const x = (projected.x * 0.5 + 0.5) * size.width;
      const y = (-projected.y * 0.5 + 0.5) * size.height;
      const width = handle.width.get();
      const height = handle.height.get();
      const above = y - height - CARD_GAP;
      const top = above >= CARD_INSET ? above : y + CARD_GAP;
      handle.x.set(clamp(x - width / 2, CARD_INSET, size.width - width - CARD_INSET));
      handle.y.set(clamp(top, CARD_INSET, size.height - height - CARD_INSET));
      // Not before it was laid out, and not for a spot behind the camera.
      handle.shown.set(projected.z > 1 || width === 0 ? 0 : 1);
    });
  });
  return null;
};

/** What a card shows: a header (title, description, pin and close), then its content. */
const CardBody = ({overlay}: {overlay: SceneOverlay}) => {
  const store = useSceneStoreApi();
  const colors = useThemeColors();
  const pinned = useSceneState(state => state.pinned.has(overlay.id));
  const header = overlay.title || overlay.description || overlay.dismissable;
  return (
    <>
      {header ? (
        <View className="flex-row items-start gap-1.5">
          <View className="min-w-0 flex-1">
            {overlay.title ? (
              <Text numberOfLines={1} className="text-sm font-medium text-popover-foreground">
                {overlay.title}
              </Text>
            ) : null}
            {overlay.description ? (
              <Text className="text-xs text-muted-foreground">{overlay.description}</Text>
            ) : null}
          </View>
          {overlay.dismissable ? (
            <View className="-mr-1 -mt-1 flex-row">
              <Pressable
                accessibilityLabel={pinned ? 'Unpin' : 'Pin'}
                hitSlop={6}
                className="rounded p-1 active:bg-muted"
                onPress={() => store.getState().togglePinned(overlay.id)}
              >
                <Pin size={14} color={pinned ? colors.foreground : colors.mutedForeground} fill={pinned ? colors.foreground : 'none'} />
              </Pressable>
              <Pressable
                accessibilityLabel="Close"
                hitSlop={6}
                className="rounded p-1 active:bg-muted"
                onPress={() => overlay.onDismiss?.()}
              >
                <X size={14} color={colors.mutedForeground} />
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
      <ScrollView className="max-h-72" nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {overlay.content}
      </ScrollView>
    </>
  );
};

const CARD_CLASS = 'gap-2 rounded-lg border border-border bg-popover p-2.5 shadow-md';

/** A card on its anchor in the 3D view. */
const PopoutCard = ({overlay, cards}: {overlay: SceneOverlay; cards: CardHandles}) => {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const shown = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const handle = React.useMemo<CardHandle>(() => ({x, y, shown, width, height}), [height, shown, width, x, y]);

  React.useEffect(() => {
    const all = cards.current;
    all?.set(overlay.id, handle);
    return () => {
      if (all?.get(overlay.id) === handle) all.delete(overlay.id);
    };
  }, [cards, handle, overlay.id]);

  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{translateX: x.value}, {translateY: y.value}],
  }));

  const onLayout = (event: LayoutChangeEvent) => {
    width.set(event.nativeEvent.layout.width);
    height.set(event.nativeEvent.layout.height);
  };

  return (
    <Animated.View
      style={[{position: 'absolute', left: 0, top: 0, maxWidth: 288, minWidth: 176}, style]}
      onLayout={onLayout}
      pointerEvents="box-none"
    >
      <View className={CARD_CLASS}>
        <CardBody overlay={overlay} />
      </View>
    </Animated.View>
  );
};

/** The view half of a scene: popouts on their anchors, panels along the bottom, and what went wrong. */
const SceneOverlays = ({cards}: {cards: CardHandles}) => {
  const overlays = useSceneState(state => state.overlays);
  const notices = useSceneState(state => state.notices);
  const showNotices = useSceneState(state => state.settings.notices);
  const all = [...overlays.values()];
  const panels = all.filter(overlay => overlay.mode === 'panel');
  return (
    <>
      <View pointerEvents="box-none" className="absolute inset-0 overflow-hidden">
        {all
          .filter(overlay => overlay.mode === 'popout')
          .map(overlay => (
            <PopoutCard key={overlay.id} overlay={overlay} cards={cards} />
          ))}
      </View>
      {panels.length ? (
        <View pointerEvents="box-none" className="absolute bottom-14 left-2 right-2 gap-2">
          {panels.map(overlay => (
            <View key={overlay.id} className={cn(CARD_CLASS, 'max-h-80')}>
              <CardBody overlay={overlay} />
            </View>
          ))}
        </View>
      ) : null}
      {notices.size && showNotices ? (
        <View pointerEvents="box-none" className="absolute left-2 right-2 top-2 gap-1">
          {[...notices.values()].map(notice => (
            <View key={notice.id} className="rounded-lg border border-amber-500/40 bg-background/90 px-3 py-1.5">
              <Text className="text-xs text-foreground">
                <Text className="text-xs font-medium">{notice.title}</Text>
                {notice.detail ? <Text className="text-xs text-muted-foreground"> {notice.detail}</Text> : null}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
};

const ToolButton = (props: {active?: boolean; label: string; onPress: () => void; children: React.ReactNode}) => (
  <Pressable
    accessibilityLabel={props.label}
    accessibilityState={{selected: props.active}}
    hitSlop={4}
    onPress={props.onPress}
    className={cn('h-8 min-w-8 items-center justify-center rounded-md px-2', props.active ? 'bg-primary' : 'active:bg-white/20')}
  >
    {props.children}
  </Pressable>
);

/**
 * The scene's own controls, docked bottom-right: where to look from, and how
 * the view is drawn. They change the viewer's picture only, never the device.
 */
const SceneControls = () => {
  const store = useSceneStoreApi();
  const colors = useThemeColors();
  const view = useSceneState(state => state.view.name);
  const settings = useSceneState(state => state.settings);
  const noticeCount = useSceneState(state => state.notices.size);
  const update = store.getState().updateSettings;
  const iconColor = (active?: boolean) => (active ? colors.primaryForeground : '#ffffff');
  return (
    <View className="absolute bottom-2 right-2 flex-row items-center gap-1 rounded-lg bg-black/50 p-1">
      {(Object.keys(VIEW_LABELS) as SceneView[]).map(name => (
        <ToolButton
          key={name}
          active={view === name}
          label={`Look from the ${VIEW_LABELS[name].toLowerCase()}`}
          onPress={() => store.getState().requestView(name)}
        >
          <Text className={cn('text-xs font-medium', view === name ? 'text-primary-foreground' : 'text-white')}>
            {VIEW_LABELS[name]}
          </Text>
        </ToolButton>
      ))}
      <ToolButton label="Frame everything in the scene" onPress={() => store.getState().requestView(view)}>
        <Scan size={15} color={iconColor()} />
      </ToolButton>
      <ToolButton active={settings.grid} label="Ground grid" onPress={() => update({grid: !settings.grid})}>
        <Grid3x3 size={15} color={iconColor(settings.grid)} />
      </ToolButton>
      <ToolButton
        active={settings.autoRotate}
        label="Turn the view slowly"
        onPress={() => update({autoRotate: !settings.autoRotate})}
      >
        <RotateCw size={15} color={iconColor(settings.autoRotate)} />
      </ToolButton>
      {noticeCount ? (
        <ToolButton active={settings.notices} label="Warnings" onPress={() => update({notices: !settings.notices})}>
          <TriangleAlert size={15} color={iconColor(settings.notices)} />
        </ToolButton>
      ) : null}
    </View>
  );
};

/** How long the camera stays put before where it stands counts as where the viewer left it. */
const POSE_SETTLE_MS = 400;

/**
 * Reports where the viewer leaves the camera (and the grid), for a scene that
 * keeps its pose. Orkestrator hears the orbit controls' `end`; the phone's
 * touch controls have none, so a pose is reported once the camera has stood
 * still for a moment.
 */
const PoseKeeper = ({onPoseChange}: {onPoseChange: (pose: ScenePose) => void}) => {
  const grid = useSceneState(state => state.settings.grid);
  const get = useThree(state => state.get);
  const report = React.useRef(onPoseChange);
  React.useEffect(() => {
    report.current = onPoseChange;
  });
  const last = React.useRef<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const poseNow = React.useCallback((): ScenePose | null => {
    const controls = get().controls as unknown as {target: THREE.Vector3} | null;
    if (!controls) return null;
    const {position} = get().camera;
    return {
      position: [position.x, position.y, position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
      grid,
    };
  }, [get, grid]);

  const schedule = React.useCallback(
    (pose: ScenePose) => {
      if (timer.current !== undefined) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = undefined;
        report.current(pose);
      }, POSE_SETTLE_MS);
    },
    [],
  );

  useFrame(() => {
    const pose = poseNow();
    if (!pose) return;
    const key = JSON.stringify(pose);
    if (last.current === null) {
      // Where it starts is not where the viewer left it.
      last.current = key;
      return;
    }
    if (key === last.current) return;
    last.current = key;
    schedule(pose);
  });

  React.useEffect(
    () => () => {
      if (timer.current !== undefined) clearTimeout(timer.current);
    },
    [],
  );
  return null;
};

/** The ground grid, drawn or not as the viewer chose. */
const SceneGrid = () =>
  useSceneState(state => state.settings.grid) ? (
    <Grid infiniteGrid cellSize={0.05} sectionSize={0.5} fadeDistance={8} cellColor="#8b8b8b" sectionColor="#6b6b6b" />
  ) : null;

/** A theme color (`hsl(h s% l%)`) as three.js parses it, with commas. */
const threeColor = (css: string): string =>
  css.replace(/^hsl\(\s*([\d.]+)\s+([\d.]+%)\s+([\d.]+%)\s*\)$/, 'hsl($1, $2, $3)');

/** The scene clears to the app's background, the same on both platforms. */
const SceneBackground = () => {
  const background = threeColor(useThemeColors().background);
  return <color key={background} attach="background" args={[background]} />;
};

/** Where a scene would be on a phone without WebGPU. */
const NoGpu = ({reason}: {reason: string}) => {
  const colors = useThemeColors();
  return (
    <View className="flex-1 items-center justify-center gap-2 px-6">
      <Box size={22} color={colors.mutedForeground} />
      <Text className="text-center text-sm font-medium text-foreground">This 3D view cannot be shown here</Text>
      <Text className="text-center text-xs text-muted-foreground">{reason}</Text>
    </View>
  );
};

type SceneSurfaceProps = {
  view?: SceneView;
  grid?: boolean;
  className?: string;
  style?: React.ComponentProps<typeof View>['style'];
  onLayout?: (event: LayoutChangeEvent) => void;
  onPointerMissed?: () => void;
  /** Views laid over the scene, inside its store. */
  overlay?: React.ReactNode;
  /** What stands in the scene: rendered inside the canvas. */
  children?: React.ReactNode;
  /** Where the viewer left the camera last time (a `persist` scene): it starts there. */
  pose?: ScenePose | null;
  /** Hears where the viewer leaves the camera. */
  onPoseChange?: (pose: ScenePose) => void;
};

/**
 * One 3D view: the renderer, camera, light rig and ground, with the views that
 * belong to it laid over. A `Scene` blok opens one for itself.
 */
export const SceneSurface = ({
  view = 'iso',
  grid = true,
  className,
  style,
  onLayout,
  onPointerMissed,
  overlay,
  children,
  pose,
  onPoseChange,
}: SceneSurfaceProps) => {
  // What is asked for is where the scene starts; from then on it is the viewer's.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const store = React.useMemo(() => createSceneStore({view, grid: pose?.grid ?? grid}), []);
  const cards = React.useRef(new Map<string, CardHandle>());
  const [camera] = React.useState(() => ({position: VIEW_DIRECTIONS[view], fov: 40, near: 0.005, far: 200}));

  return (
    <SceneStoreProvider value={store}>
      <View className={className} style={style} onLayout={onLayout}>
        <FiberCanvas
          style={{position: 'absolute', top: 0, right: 0, bottom: 0, left: 0}}
          camera={camera}
          onPointerMissed={() => {
            store.getState().dismiss();
            onPointerMissed?.();
          }}
          fallback={reason => <NoGpu reason={reason} />}
        >
          <BlokNodeErrorSurface.Provider value={SceneErrorSurface}>
            <BlokSceneEmbedProvider value>
              <SceneBackground />
              <ambientLight intensity={0.7} />
              <directionalLight position={[2, 4, 3]} intensity={1.6} />
              <directionalLight position={[-3, 2, -2]} intensity={0.5} />
              <SceneGrid />
              <SceneControls3D />
              <CameraRig pose={pose} />
              {onPoseChange ? <PoseKeeper onPoseChange={onPoseChange} /> : null}
              {children}
              <OverlayTracker cards={cards} />
            </BlokSceneEmbedProvider>
          </BlokNodeErrorSurface.Provider>
        </FiberCanvas>
        <SceneOverlays cards={cards} />
        <SceneControls />
        {overlay}
      </View>
    </SceneStoreProvider>
  );
};

type SceneRenderArgs = BlokRenderArgs<Scene['Scene']['schema']>;

const SceneChildren = ({component, buildChild}: Pick<SceneRenderArgs, 'component' | 'buildChild'>) => (
  <>
    {(component.children ?? []).map(child => (
      <React.Fragment key={child.id}>{buildChild(child.id)}</React.Fragment>
    ))}
  </>
);

const StandaloneScene = ({component, schema, buildChild}: SceneRenderArgs) => {
  const blok = useBlok(component, schema);
  const camera = useValue(blok.camera) ?? 'iso';
  const grid = useValue(blok.grid) ?? true;
  const declared = cssLength(useValue(blok.height));
  // A screen that shows the scene as its whole content decides the size, not the blok.
  const screen = useBlokSceneFill();
  // Unless the scene sits inside something with no height of its own to give.
  const [collapsed, setCollapsed] = React.useState(false);
  const fill = screen && !collapsed;
  // A scrolling page has no height for "100%" to fill: there the scene takes 24rem.
  const height = fill ? undefined : typeof declared === 'number' ? declared : FALLBACK_HEIGHT;
  const persist = useValue(blok.persist) === true;
  const kept = usePersistedComponentState(component.id, persist, isScenePose);

  // A kept pose is read before the scene starts: it starts where the viewer left it.
  if (!kept.loaded) return <View className={fill ? 'flex-1' : 'w-full'} style={height === undefined ? undefined : {height}} />;

  return (
    <SceneSurface
      view={camera}
      grid={grid}
      pose={kept.initial}
      onPoseChange={persist ? kept.save : undefined}
      className={fill ? 'flex-1 overflow-hidden' : 'w-full overflow-hidden rounded-xl bg-muted/20'}
      style={height === undefined ? undefined : {height}}
      onLayout={fill ? event => event.nativeEvent.layout.height === 0 && setCollapsed(true) : undefined}
    >
      <SceneChildren component={component} buildChild={buildChild} />
    </SceneSurface>
  );
};

export const SceneRender = (args: SceneRenderArgs) =>
  // Inside a scene that is already open, this one only adds what it holds.
  useBlokSceneEmbedded() ? (
    <SceneChildren component={args.component} buildChild={args.buildChild} />
  ) : (
    <StandaloneScene {...args} />
  );
