import './polyfills';
import * as React from 'react';

/**
 * The phone's one GPU device, shared by every canvas.
 *
 * Asked for once, the first time a 3D view mounts, and kept: a device per
 * canvas would leak on every open and close (react-native-webgpu #445), and
 * mikro's renderers will need to share resources across views anyway. A lost
 * device (the driver reset, the app was evicted) is asked for again by the
 * next view.
 *
 * There is no WebGL fallback. On Android WebGPU needs Vulkan, which some older
 * phones do not offer; there a 3D view says so instead of drawing.
 */

export type GpuSupport =
  | {status: 'pending'}
  | {status: 'ready'; device: GPUDevice; adapter: GPUAdapter; features: ReadonlySet<string>}
  | {status: 'none'; reason: string};

/**
 * The features the WebGPU spec defines, requested wherever the adapter has
 * them: three.js asks for the same set when it creates a device itself.
 * Dawn names more features than these; requesting one outside the spec fails.
 */
const SPEC_FEATURES = [
  'core-features-and-limits',
  'depth-clip-control',
  'depth32float-stencil8',
  'texture-compression-bc',
  'texture-compression-bc-sliced-3d',
  'texture-compression-etc2',
  'texture-compression-astc',
  'texture-compression-astc-sliced-3d',
  'timestamp-query',
  'indirect-first-instance',
  'shader-f16',
  'rg11b10ufloat-renderable',
  'bgra8unorm-storage',
  'float32-filterable',
  'float32-blendable',
  'clip-distances',
  'dual-source-blending',
  'subgroups',
  'texture-formats-tier1',
  'texture-formats-tier2',
  'primitive-index',
] as const;

let current: Promise<GpuSupport> | null = null;

const probe = async (): Promise<GpuSupport> => {
  const gpu = typeof navigator !== 'undefined' ? navigator.gpu : undefined;
  if (!gpu) return {status: 'none', reason: 'This build has no WebGPU.'};
  // `compatibility` reaches devices short of core WebGPU; three draws in compatibility mode on those.
  const adapter = await gpu.requestAdapter({featureLevel: 'compatibility', powerPreference: 'high-performance'});
  if (!adapter) {
    return {
      status: 'none',
      reason: 'This phone offers no WebGPU device. 3D views need Vulkan on Android, or Metal on iOS.',
    };
  }
  const requiredFeatures = SPEC_FEATURES.filter(name => adapter.features.has(name)) as GPUFeatureName[];
  const device = await adapter.requestDevice({requiredFeatures});
  device.lost.then(() => {
    current = null;
  });
  return {status: 'ready', device, adapter, features: new Set(requiredFeatures)};
};

/** The shared device; asks for it on first use. */
export const requestGpu = (): Promise<GpuSupport> => {
  current ??= probe().catch((error: Error): GpuSupport => {
    current = null;
    return {status: 'none', reason: `The GPU could not be opened: ${error.message}`};
  });
  return current;
};

/** The shared device, for a component: `pending` until it was asked for. */
export const useGpu = (): GpuSupport => {
  const [support, setSupport] = React.useState<GpuSupport>({status: 'pending'});
  React.useEffect(() => {
    let live = true;
    requestGpu().then(next => live && setSupport(next));
    return () => {
      live = false;
    };
  }, []);
  return support;
};
