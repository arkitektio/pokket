// three.js objects (nodes, materials, uniforms) are mutable by design: they are
// changed here in effects and frame callbacks, never while rendering.
/* eslint-disable react-hooks/immutability */
import * as React from 'react';
import * as THREE from 'three';
import {useFrame, useThree} from '@react-three/fiber';
import {useCameraInput, type CameraInput} from '../FiberCanvas';

/**
 * Orbit controls for a touch screen: one finger turns the camera around its
 * target, two fingers move the target across the view, a pinch moves the
 * camera toward it. Each settles with damping, and the scene is only redrawn
 * while something still moves.
 *
 * Registered as R3F's default controls with drei's shape (`target`,
 * `update()`), so what frames the scene (a `Scene`'s camera rig) moves them
 * the way it would move drei's `OrbitControls`.
 */

export type OrbitTouchProps = {
  /** Turns slowly around the target until a finger takes over. */
  autoRotate?: boolean;
  /** Radians per second. */
  autoRotateSpeed?: number;
  /** The fraction of motion kept each frame at 60 fps; lower stops sooner. */
  damping?: number;
};

/** Radians the camera turns for a drag across the full height of the view. */
const ROTATE_PER_HEIGHT = 2 * Math.PI;
/** Below this, motion counts as stopped. */
const EPSILON = 1e-5;
const MIN_POLAR = 0.01;
const MAX_POLAR = Math.PI - 0.01;

export type OrbitTouchControls = {
  target: THREE.Vector3;
  update: () => void;
};

const offset = new THREE.Vector3();
const panX = new THREE.Vector3();
const panY = new THREE.Vector3();

export const OrbitTouch = ({autoRotate = false, autoRotateSpeed = 0.8, damping = 0.82}: OrbitTouchProps) => {
  const camera = useThree(state => state.camera);
  const height = useThree(state => state.size.height);
  const set = useThree(state => state.set);
  const get = useThree(state => state.get);
  const invalidate = useThree(state => state.invalidate);

  // What the fingers asked for and has not been applied yet.
  const pending = React.useMemo(
    () => ({theta: 0, phi: 0, scale: 1, pan: new THREE.Vector3(), spherical: new THREE.Spherical()}),
    [],
  );

  const controls = React.useMemo<OrbitTouchControls>(() => {
    const target = new THREE.Vector3();
    return {
      target,
      // Re-reads the camera after something else moved it (a view being framed).
      update: () => {
        camera.lookAt(target);
        invalidate();
      },
    };
  }, [camera, invalidate]);

  React.useEffect(() => {
    const previous = get().controls;
    set({controls: controls as unknown as THREE.EventDispatcher});
    return () => set({controls: previous});
  }, [controls, get, set]);

  const input = React.useMemo<CameraInput>(
    () => ({
      orbit: (dx, dy) => {
        const perPoint = ROTATE_PER_HEIGHT / Math.max(height, 1);
        pending.theta -= dx * perPoint;
        pending.phi -= dy * perPoint;
        invalidate();
      },
      pan: (dx, dy) => {
        // As far as the fingers moved, at the distance of the target.
        const perspective = camera as THREE.PerspectiveCamera;
        const distance = camera.position.distanceTo(controls.target);
        const visible = 2 * distance * Math.tan(((perspective.fov ?? 50) * Math.PI) / 360);
        const perPoint = visible / Math.max(height, 1);
        panX.setFromMatrixColumn(camera.matrix, 0).multiplyScalar(-dx * perPoint);
        panY.setFromMatrixColumn(camera.matrix, 1).multiplyScalar(dy * perPoint);
        pending.pan.add(panX).add(panY);
        invalidate();
      },
      dolly: factor => {
        if (factor > 0) pending.scale /= factor;
        invalidate();
      },
    }),
    [camera, controls, height, invalidate, pending],
  );
  useCameraInput(input);

  useFrame((_state, delta) => {
    const frames = Math.min(delta, 0.1) * 60;
    if (autoRotate) pending.theta -= autoRotateSpeed * Math.min(delta, 0.1);

    const keep = Math.pow(damping, frames);
    const apply = 1 - keep;
    const spherical = pending.spherical;
    offset.copy(camera.position).sub(controls.target);
    spherical.setFromVector3(offset);
    spherical.theta += pending.theta * apply;
    spherical.phi = Math.min(Math.max(spherical.phi + pending.phi * apply, MIN_POLAR), MAX_POLAR);
    // The pinch is applied whole: a lagging zoom feels like a missed gesture.
    spherical.radius *= pending.scale;
    controls.target.addScaledVector(pending.pan, apply);
    offset.setFromSpherical(spherical);
    camera.position.copy(controls.target).add(offset);
    camera.lookAt(controls.target);

    pending.theta *= keep;
    pending.phi *= keep;
    pending.pan.multiplyScalar(keep);
    pending.scale = 1;

    const moving =
      autoRotate || Math.abs(pending.theta) > EPSILON || Math.abs(pending.phi) > EPSILON || pending.pan.lengthSq() > EPSILON * EPSILON;
    if (moving) invalidate();
  }, -1);

  return null;
};
