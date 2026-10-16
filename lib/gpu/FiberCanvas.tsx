import './polyfills';
import * as React from 'react';
import {AppState, PixelRatio, View, type LayoutChangeEvent, type StyleProp, type ViewStyle} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {Canvas, type CanvasRef} from 'react-native-webgpu';
import type {WebGLRenderer} from 'three';
import * as THREE from 'three/webgpu';
import {
  createRoot,
  events as pointerEvents,
  extend,
  unmountComponentAtNode,
  type ReconcilerRoot,
  type RootState,
} from '@react-three/fiber';
import {FiberProvider, useContextBridge} from 'its-fine';
import type {StoreApi} from 'zustand';
import {useGpu} from './device';
import {disposeWebGPURenderer} from './dispose';

/**
 * React Three Fiber on react-native-webgpu: R3F's own root, on the WebGPU
 * canvas, with three's WebGPU renderer on the shared device.
 *
 * What a browser does for R3F is done here instead:
 * - the frame is presented after each render (`context.present()`);
 * - the contexts around the canvas reach the scene inside it (its-fine's
 *   bridge, as R3F's DOM `<Canvas>` does);
 * - touches become R3F pointer events: a tap is a click at that spot, so
 *   `onClick` on an object and `onPointerMissed` work as on the web. There is
 *   no hover on a touch screen.
 * - one-finger drags, two-finger drags and pinches go to the camera controls
 *   in the scene (`useCameraInput`).
 *
 * The scene renders on demand by default: nothing is drawn while nothing
 * changes, so an idle view costs no GPU time. A component that animates calls
 * `invalidate()` for as long as it moves.
 */

// R3F's own <Canvas> registers three's classes as JSX elements (<mesh>, <color>, …);
// this root is made with `createRoot`, so it does so itself.
extend(THREE as unknown as Parameters<typeof extend>[0]);

/** What the camera controls in the scene do with the touches on the canvas. */
export type CameraInput = {
  /** One finger moved by (dx, dy) points. */
  orbit: (dx: number, dy: number) => void;
  /** Two fingers moved by (dx, dy) points. */
  pan: (dx: number, dy: number) => void;
  /** The pinch scaled by `factor` since the last call (>1 spreads the fingers). */
  dolly: (factor: number) => void;
};

/** Where the controls in the scene take the canvas's gestures from: `attach` returns how to let go. */
type CameraInputSlot = {attach: (input: CameraInput) => () => void};

const CameraInputContext = React.createContext<CameraInputSlot | null>(null);

/** Hands the canvas's camera gestures to `input` while the calling component is mounted. */
export const useCameraInput = (input: CameraInput): void => {
  const slot = React.useContext(CameraInputContext);
  React.useEffect(() => slot?.attach(input), [input, slot]);
};

/**
 * Whether the screen a canvas is on is the one shown. A screen pushed under
 * another keeps its canvas but stops drawing: give it `useIsFocused()`.
 */
export const CanvasVisibleContext = React.createContext(true);

/** How far a finger may travel and still tap. */
const TAP_SLOP = 8;
/** Sharper than this costs fill rate a phone screen does not show. */
const MAX_DPR = 2;

export type FiberCanvasProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  camera?: {position: [number, number, number]; fov: number; near: number; far: number};
  frameloop?: 'always' | 'demand';
  /** A tap that hit nothing in the scene. */
  onPointerMissed?: () => void;
  /** Shown in place of the canvas where the phone has no WebGPU device. */
  fallback?: (reason: string) => React.ReactNode;
};

type Live = {
  renderer: THREE.WebGPURenderer;
  canvas: HTMLCanvasElement;
  root: ReconcilerRoot<HTMLCanvasElement>;
  store?: StoreApi<RootState>;
};

/** What R3F reads of a DOM pointer event, for a touch at (x, y) in the canvas. */
const pointerAt = (type: string, x: number, y: number) => ({
  type,
  offsetX: x,
  offsetY: y,
  clientX: x,
  clientY: y,
  pointerId: 1,
  pointerType: 'touch',
  button: 0,
  buttons: type === 'pointerdown' ? 1 : 0,
  target: {setPointerCapture() {}, releasePointerCapture() {}, hasPointerCapture: () => false},
  stopPropagation() {},
  preventDefault() {},
});

const FiberCanvasInner = ({
  children,
  style,
  camera,
  frameloop = 'demand',
  onPointerMissed,
  fallback,
}: FiberCanvasProps) => {
  const Bridge = useContextBridge();
  const gpu = useGpu();
  const canvasRef = React.useRef<CanvasRef>(null);
  const live = React.useRef<Live | null>(null);
  const [size, setSize] = React.useState<{width: number; height: number} | null>(null);
  const [created, setCreated] = React.useState(0);
  const [failure, setFailure] = React.useState<string | null>(null);
  const cameraInput = React.useRef<CameraInput | null>(null);
  const [cameraSlot] = React.useState<CameraInputSlot>(() => ({
    attach: input => {
      cameraInput.current = input;
      return () => {
        if (cameraInput.current === input) cameraInput.current = null;
      };
    },
  }));
  const missed = React.useRef(onPointerMissed);
  React.useLayoutEffect(() => {
    missed.current = onPointerMissed;
  });
  // What the camera starts as; from then on it is the controls'.
  const [initialCamera] = React.useState(camera);
  // Nothing is drawn while the app is in the background or the screen is covered.
  const visible = React.useContext(CanvasVisibleContext);
  const [foreground, setForeground] = React.useState(AppState.currentState !== 'background');
  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);
  const running = visible && foreground;

  const onLayout = (event: LayoutChangeEvent) => {
    const {width, height} = event.nativeEvent.layout;
    if (width > 0 && height > 0) setSize({width, height});
  };

  // The renderer is made once there is a device and a size to draw at.
  const hasSize = size !== null;
  const device = gpu.status === 'ready' ? gpu.device : null;
  React.useEffect(() => {
    if (!device || !hasSize) return;
    const context = canvasRef.current?.getContext('webgpu');
    if (!context) return;
    const canvas = context.canvas as unknown as HTMLCanvasElement;
    const renderer = new THREE.WebGPURenderer({canvas, context, device, antialias: true});
    let disposed = false;
    const initializing = renderer.init().then(
      () => {
        if (disposed) return;
        const draw = renderer.render.bind(renderer);
        renderer.render = (scene: THREE.Object3D, frameCamera: THREE.Camera) => {
          draw(scene, frameCamera);
          context.present();
        };
        live.current = {renderer, canvas, root: createRoot(canvas)};
        setCreated(count => count + 1);
      },
      (error: Error) => {
        if (!disposed) setFailure(error.message);
      },
    );
    return () => {
      disposed = true;
      if (live.current?.renderer === renderer) {
        unmountComponentAtNode(canvas);
        live.current = null;
      }
      // A renderer still starting up is torn down once it has.
      initializing.finally(() => disposeWebGPURenderer(renderer));
    };
  }, [device, hasSize]);

  // Size, pixel ratio and frame loop follow the view.
  React.useLayoutEffect(() => {
    const current = live.current;
    if (!current || !size) return;
    current.root
      .configure({
        // R3F's types know only the WebGL renderer; it drives this one the same way.
        gl: current.renderer as unknown as WebGLRenderer,
        events: pointerEvents,
        size: {...size, top: 0, left: 0},
        dpr: Math.min(PixelRatio.get(), MAX_DPR),
        frameloop: running ? frameloop : 'never',
        camera: initialCamera,
        onPointerMissed: () => missed.current?.(),
      })
      // Back in view (and on Android maybe on a new surface): draw the scene once, whatever moves.
      .then(
        () => running && current.store?.getState().invalidate(),
        () => undefined,
      );
  }, [created, frameloop, initialCamera, running, size]);

  // The scene follows every render of the component that holds the canvas, as R3F's own <Canvas> does.
  React.useLayoutEffect(() => {
    const current = live.current;
    if (!current) return;
    current.store = current.root.render(
      <Bridge>
        <CameraInputContext.Provider value={cameraSlot}>{children}</CameraInputContext.Provider>
      </Bridge>,
    );
  });

  // The gestures read the root and the controls when a finger moves, never while rendering.
  /* eslint-disable react-hooks/refs */
  const [gesture] = React.useState(() => {
    const handlers = () => live.current?.store?.getState().events.handlers;
    const tap = Gesture.Tap()
      .maxDistance(TAP_SLOP)
      .runOnJS(true)
      .onEnd((event, success) => {
        const on = handlers();
        if (!success || !on) return;
        const fire = (handler: ((event: never) => void) | undefined, type: string) =>
          handler?.(pointerAt(type, event.x, event.y) as never);
        fire(on.onPointerDown, 'pointerdown');
        fire(on.onPointerUp, 'pointerup');
        fire(on.onClick, 'click');
      });
    const orbit = Gesture.Pan()
      .maxPointers(1)
      .runOnJS(true)
      .onChange(event => cameraInput.current?.orbit(event.changeX, event.changeY));
    const pan = Gesture.Pan()
      .minPointers(2)
      .runOnJS(true)
      .onChange(event => cameraInput.current?.pan(event.changeX, event.changeY));
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onChange(event => cameraInput.current?.dolly(event.scaleChange));
    return Gesture.Race(Gesture.Simultaneous(pan, pinch), orbit, tap);
  });
  /* eslint-enable react-hooks/refs */

  if (gpu.status === 'none' || failure) {
    const reason = failure ?? (gpu.status === 'none' ? gpu.reason : '');
    return <View style={style}>{fallback?.(reason) ?? null}</View>;
  }

  return (
    <GestureDetector gesture={gesture}>
      <View style={style} onLayout={onLayout} collapsable={false}>
        {gpu.status === 'ready' ? <Canvas ref={canvasRef} style={{flex: 1}} /> : null}
      </View>
    </GestureDetector>
  );
};

/** R3F on WebGPU, in a React Native view. Lays out like a `View`; give it a size. */
export const FiberCanvas = (props: FiberCanvasProps) => (
  <FiberProvider>
    <FiberCanvasInner {...props} />
  </FiberProvider>
);
