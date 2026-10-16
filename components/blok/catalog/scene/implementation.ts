/** What draws the 3D bloks: three.js and the GPU. Loaded the first time a scene is shown (see `index.tsx`). */
// First: three expects a browser's TextDecoder, FinalizationRegistry and navigator.gpu.
import '@/lib/gpu/polyfills';

export {
  AnimateRender,
  AttachRender,
  BeamRender,
  GlowRender,
  MoveRender,
  RotateRender,
  ShowRender,
  TintRender,
} from './bindings';
export {OnClickRender, PopoutRender} from './interaction';
export {ModelRender, RobotRender} from './Model';
export {SceneRender, SceneSurface} from './Scene';
