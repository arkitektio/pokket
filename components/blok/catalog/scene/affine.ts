import * as THREE from 'three';

/**
 * Where something stands, as a space placement keeps it (orkestrator
 * `core/model/affine.ts`): a 4x4 affine matrix in rows, in meters with Y up.
 */
export type Affine = number[][];

export const isMatrixRows = (value: unknown): value is Affine =>
  Array.isArray(value) &&
  value.length === 4 &&
  value.every(row => Array.isArray(row) && row.length === 4 && row.every(cell => typeof cell === 'number' && Number.isFinite(cell)));

/** The matrix of a stored affine; the identity for one that is absent or malformed. */
export const toMatrix4 = (affine: unknown): THREE.Matrix4 => {
  const matrix = new THREE.Matrix4();
  if (!isMatrixRows(affine)) return matrix;
  // `set` takes rows, as the affine is stored.
  return matrix.set(...(affine.flat() as Parameters<THREE.Matrix4['set']>));
};

export const fromMatrix4 = (matrix: THREE.Matrix4): Affine => {
  const e = matrix.elements;
  return [
    [e[0], e[4], e[8], e[12]],
    [e[1], e[5], e[9], e[13]],
    [e[2], e[6], e[10], e[14]],
    [e[3], e[7], e[11], e[15]],
  ];
};

