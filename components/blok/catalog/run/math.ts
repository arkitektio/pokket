import {Vector3} from 'three';
import {toMatrix4} from '../scene/affine';
import type {BlokRunAgent} from './host';

/**
 * Where the agents of a run stand in the room they are placed in: pure, so
 * the line of a `Route` is worked out (and tested) without a canvas.
 */

const isPlaced = (affine: unknown): boolean => affine !== null && affine !== undefined;

/**
 * The dependency keys a `through` names: a list, or the text BSX writes for
 * one (`"['robot', 'frame']"`, `'["robot"]'`, `"robot, frame"`), read as the
 * server reads it (`through_keys`).
 */
export const throughKeys = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
  if (typeof value !== 'string') return [];
  let inner = value.trim();
  if (inner.startsWith('[') && inner.endsWith(']')) inner = inner.slice(1, -1);
  return inner
    .split(',')
    .map(item => item.trim().replace(/^['"]+|['"]+$/g, '').trim())
    .filter(item => item !== '');
};

/** How far above a placement's origin the route runs, in meters: over the floor, under most devices. */
export const ROUTE_LIFT = 0.05;

/**
 * The corners of a `Route`: where the first agent bound to each key stands,
 * lifted off the floor. A key whose agent the space does not place is left
 * out, so the line runs through what is there.
 */
export const routePoints = (
  keys: readonly string[],
  agentsFor: (key: string) => readonly BlokRunAgent[],
  placementOf: (agentId: string) => unknown,
): Vector3[] =>
  keys.flatMap(key => {
    const first = agentsFor(key)[0];
    const affine = first ? placementOf(first.id) : null;
    if (!first || !isPlaced(affine)) return [];
    return [new Vector3().setFromMatrixPosition(toMatrix4(affine)).add(new Vector3(0, ROUTE_LIFT, 0))];
  });

/** A progress as the run reports it, 0-100, as a fraction of the way. */
export const progressFraction = (progress: unknown): number => {
  const value = typeof progress === 'number' && Number.isFinite(progress) ? progress : 0;
  return Math.min(1, Math.max(0, value / 100));
};

export type RouteSplit = {
  /** The way already gone: from the first corner to `head`. */
  travelled: Vector3[];
  /** The way still ahead: from `head` to the last corner. */
  ahead: Vector3[];
  /** Where along the line the run is; null for a line of fewer than two corners. */
  head: Vector3 | null;
};

/** The line cut where `fraction` of its length lies behind. */
export const splitRoute = (points: readonly Vector3[], fraction: number): RouteSplit => {
  if (points.length < 2) return {travelled: [], ahead: [], head: null};
  const lengths = points.slice(1).map((point, index) => point.distanceTo(points[index]));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const wanted = total * Math.min(1, Math.max(0, fraction));
  let walked = 0;
  for (let index = 0; index < lengths.length; index += 1) {
    const length = lengths[index];
    if (walked + length >= wanted || index === lengths.length - 1) {
      const along = length > 0 ? Math.min(1, (wanted - walked) / length) : 0;
      const head = points[index].clone().lerp(points[index + 1], along);
      return {
        travelled: [...points.slice(0, index + 1).map(point => point.clone()), head.clone()],
        ahead: [head.clone(), ...points.slice(index + 1).map(point => point.clone())],
        head,
      };
    }
    walked += length;
  }
  return {travelled: [], ahead: [], head: null};
};
