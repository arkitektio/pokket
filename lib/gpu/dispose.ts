import * as THREE from 'three/webgpu';

/**
 * Tears a renderer down so the garbage collector can reclaim it
 * (react-native-webgpu #445, after its example app's `disposeWebGPURenderer`):
 *
 * - `dispose()` stops three's internal frame callback, which otherwise keeps
 *   the whole renderer alive; R3F's unmount only does WebGL-era cleanup.
 * - three's `RenderObjects.dispose()` leaves its listeners on the geometry of
 *   the module-level `QuadMesh`, which then roots the disposed backend. They
 *   are cleared here until three ships the fix (r187). Safe while one renderer
 *   is live at a time, which a phone showing one 3D view is.
 *
 * The shared device is not destroyed: three only destroys a device it made.
 */
export const disposeWebGPURenderer = (renderer: THREE.WebGPURenderer): void => {
  renderer.setAnimationLoop(null);
  renderer.dispose();
  // Any QuadMesh: they all share the one geometry.
  const quad = new THREE.QuadMesh(null as unknown as THREE.NodeMaterial);
  const geometry = quad.geometry as THREE.BufferGeometry;
  const targets: unknown[] = [geometry, geometry.index, ...Object.values(geometry.attributes)];
  for (const target of targets) {
    const listening = target as {_listeners?: unknown} | null;
    if (listening && listening._listeners) listening._listeners = {};
  }
};
