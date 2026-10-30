import * as React from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {useBinding, useBlok, useValue, type BlokRender} from '@arkitektio/bsx/runtime';
import {usePersistedComponentState} from '@arkitektio/bsx/renderer/persist';
import {isMatrixRows, toMatrix4} from './affine';
import type {sceneCatalog} from '@arkitektio/bsx/catalogs';

type Scene = typeof sceneCatalog.components;

/**
 * orkestrator's `bloks/scene/Transform.tsx`: places its children by an affine
 * matrix, from `matrix`, the local it is bound to, or (with `persist`) the
 * pose it kept by its id.
 *
 * Left out: the gizmo. Orkestrator moves the children with drei's
 * `TransformControls`, which needs a mouse and the DOM; the phone draws the
 * matrix and lets nothing drag it, so `gizmo`, `mode` and `size` are read and
 * have no effect here.
 */

export const TransformRender: BlokRender<Scene['Transform']> = ({component, buildChild, schema}) => {
  const blok = useBlok(component, schema);
  const binding = useBinding(useValue(blok.bind));
  const declared = useValue(blok.matrix);
  // Read so a bound value resolves as it does on the desktop; there is no gizmo to give them to.
  useValue(blok.gizmo);
  useValue(blok.mode);
  useValue(blok.size);
  const persist = useValue(blok.persist) === true;
  const kept = usePersistedComponentState(component.id, persist && !binding, isMatrixRows);

  const source = binding && binding.value != null ? binding.value : (kept.initial ?? declared);
  const sourceKey = JSON.stringify(source ?? null);
  // Keyed by value: a data model rebuilt around the same matrix moves nothing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const matrix = React.useMemo(() => toMatrix4(source), [sourceKey]);

  const [group, setGroup] = React.useState<THREE.Group | null>(null);
  const invalidate = useThree(three => three.invalidate);
  React.useLayoutEffect(() => {
    if (!group) return;
    matrix.decompose(group.position, group.quaternion, group.scale);
    invalidate();
  }, [group, invalidate, matrix]);

  return (
    <group ref={setGroup}>
      {(component.children ?? []).map(child => (
        <React.Fragment key={child.id}>{buildChild(child.id)}</React.Fragment>
      ))}
    </group>
  );
};
