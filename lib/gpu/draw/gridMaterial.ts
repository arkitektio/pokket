import * as THREE from 'three';
import {NodeMaterial} from 'three/webgpu';
import * as TSLTyped from 'three/tsl';

/**
 * orkestrator's TSL port of drei's grid shader
 * (`mikro/components/scene/platform/draw/gridNodeMaterial.ts`), kept as it
 * is there: anti-aliased cell and section lines from screen-space
 * derivatives, faded with the distance from the camera. drei's own grid is a
 * GLSL `ShaderMaterial`, which the WebGPU renderer cannot compile.
 */

// three's TSL typings lag its runtime API (swizzle chaining, node math): the
// graph is typed dynamically, the uniform handles by hand.
const TSL = TSLTyped as any;
const {Fn, abs, distance, float, fract, fwidth, min, mix, modelWorldMatrix, oneMinus, positionGeometry, pow, uniform, varying, vec2, vec4} =
  TSL;

type UniformNodeLike<T> = {value: T};

export type GridUniforms = {
  cellSize: UniformNodeLike<number>;
  sectionSize: UniformNodeLike<number>;
  cellColor: UniformNodeLike<THREE.Color>;
  sectionColor: UniformNodeLike<THREE.Color>;
  cellThickness: UniformNodeLike<number>;
  sectionThickness: UniformNodeLike<number>;
  fadeDistance: UniformNodeLike<number>;
  fadeStrength: UniformNodeLike<number>;
  fadeFrom: UniformNodeLike<number>;
  /** The camera's position projected onto the grid plane, set every frame. */
  camProjPosition: UniformNodeLike<THREE.Vector3>;
};

export type GridMaterialHandle = {material: NodeMaterial; uniforms: GridUniforms};

export const createGridMaterial = (infiniteGrid: boolean): GridMaterialHandle => {
  const uniforms: GridUniforms = {
    cellSize: uniform(0.5),
    sectionSize: uniform(1),
    cellColor: uniform(new THREE.Color()),
    sectionColor: uniform(new THREE.Color()),
    cellThickness: uniform(0.5),
    sectionThickness: uniform(1),
    fadeDistance: uniform(100),
    fadeStrength: uniform(1),
    fadeFrom: uniform(1),
    camProjPosition: uniform(new THREE.Vector3()),
  };
  const u = uniforms as unknown as Record<keyof GridUniforms, any>;

  const material = new NodeMaterial();
  material.transparent = true;
  material.depthWrite = false;
  material.side = THREE.BackSide;

  // drei lays the XY plane onto XZ and, for an infinite grid, spreads it over the fade radius.
  const scale = infiniteGrid ? float(1).add(u.fadeDistance) : float(1);
  const localNode = positionGeometry.xzy.mul(scale);
  material.positionNode = localNode;

  const vLocal = varying(localNode);
  const vWorld = varying(modelWorldMatrix.mul(vec4(localNode, 1.0)).xyz);

  material.outputNode = Fn(() => {
    const localXZ = vec2(vLocal.x, vLocal.z);
    const getGrid = (size: unknown, thickness: unknown) => {
      const r = localXZ.div(size);
      const grid = abs(fract(r.sub(0.5)).sub(0.5)).div(fwidth(r));
      const line = min(grid.x, grid.y).add(1.0).sub(thickness);
      return oneMinus(min(line, 1.0));
    };
    const g1 = getGrid(u.cellSize, u.cellThickness);
    const g2 = getGrid(u.sectionSize, u.sectionThickness);
    const from = u.camProjPosition.mul(u.fadeFrom);
    const d = oneMinus(min(distance(from, vWorld).div(u.fadeDistance), 1.0));
    const color = mix(u.cellColor, u.sectionColor, min(1.0, u.sectionThickness.mul(g2)));
    const base = g1.add(g2).mul(pow(d, u.fadeStrength));
    const alpha = mix(base.mul(0.75), base, g2);
    return vec4(color, alpha);
  })();

  return {material, uniforms};
};
