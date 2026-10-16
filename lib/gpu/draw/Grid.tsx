// three.js objects (nodes, materials, uniforms) are mutable by design: they are
// changed here in effects and frame callbacks, never while rendering.
/* eslint-disable react-hooks/immutability */
import * as React from 'react';
import * as THREE from 'three';
import {useFrame} from '@react-three/fiber';
import {createGridMaterial} from './gridMaterial';

/**
 * A ground grid with drei's `<Grid>` props, on the WebGPU renderer (after
 * orkestrator's `platform/draw/Grid.tsx`).
 */
export type GridProps = {
  cellSize?: number;
  sectionSize?: number;
  cellColor?: THREE.ColorRepresentation;
  sectionColor?: THREE.ColorRepresentation;
  cellThickness?: number;
  sectionThickness?: number;
  fadeDistance?: number;
  fadeStrength?: number;
  infiniteGrid?: boolean;
};

const up = new THREE.Vector3(0, 1, 0);
const zero = new THREE.Vector3(0, 0, 0);

export const Grid = ({
  cellSize = 0.5,
  sectionSize = 1,
  cellColor = '#000000',
  sectionColor = '#2080ff',
  cellThickness = 0.5,
  sectionThickness = 1,
  fadeDistance = 100,
  fadeStrength = 1,
  infiniteGrid = false,
}: GridProps) => {
  const mesh = React.useRef<THREE.Mesh>(null);
  const {material, uniforms} = React.useMemo(() => createGridMaterial(infiniteGrid), [infiniteGrid]);
  React.useEffect(() => () => material.dispose(), [material]);

  React.useEffect(() => {
    uniforms.cellSize.value = cellSize;
    uniforms.sectionSize.value = sectionSize;
    uniforms.cellColor.value.set(cellColor);
    uniforms.sectionColor.value.set(sectionColor);
    uniforms.cellThickness.value = cellThickness;
    uniforms.sectionThickness.value = sectionThickness;
    uniforms.fadeDistance.value = fadeDistance;
    uniforms.fadeStrength.value = fadeStrength;
  }, [uniforms, cellSize, sectionSize, cellColor, sectionColor, cellThickness, sectionThickness, fadeDistance, fadeStrength]);

  const plane = React.useMemo(() => new THREE.Plane(), []);
  useFrame(({camera}) => {
    if (!mesh.current) return;
    plane.setFromNormalAndCoplanarPoint(up, zero).applyMatrix4(mesh.current.matrixWorld);
    plane.projectPoint(camera.position, uniforms.camProjPosition.value);
  });

  return (
    <mesh ref={mesh} frustumCulled={false} raycast={() => null}>
      <planeGeometry />
      <primitive object={material} attach="material" />
    </mesh>
  );
};
