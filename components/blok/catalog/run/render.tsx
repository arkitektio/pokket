import * as React from 'react';
import * as THREE from 'three';
import {placedSchema, routeSchema, spaceSchema} from '@arkitektio/bsx/catalogs/parts/run';
import type {sceneCatalog} from '@arkitektio/bsx/catalogs';
import {useBlok, useValue, type BlokRender, type BlokRenderArgs} from '@arkitektio/bsx/runtime';
import {toMatrix4} from '../scene/affine';
import {ModelProvider, SceneOwnerProvider, useOwnedModel, useSceneNotice, type ModelContextValue} from '../scene/context';
import {FALLBACK_SCENE_RGB, useThemeColour} from '../scene/colour';
import {useBlokSceneEmbedded} from '../scene/host';
import {SceneFrame} from '../scene/Scene';
import {useBlokRunHost, useBlokSpaceHost, type BlokPose, type BlokRoom, type BlokRunAgent} from './host';
import {progressFraction, routePoints, splitRoute, throughKeys} from './math';

type Scene = typeof sceneCatalog.components;

/**
 * What draws `Space`, `Placed` and `Route` (bsx `bloks/run/components.tsx`):
 * loaded with three.js, the first time a scene is shown
 * (`scene/implementation.ts`).
 */

const Children = ({component, buildChild}: Pick<BlokRenderArgs, 'component' | 'buildChild'>) => (
  <>
    {(component.children ?? []).map(child => (
      <React.Fragment key={child.id}>{buildChild(child.id)}</React.Fragment>
    ))}
  </>
);

const EMPTY_REPORT = {
  ref: '',
  size: 0,
  nodes: [],
  stats: {nodes: 0, triangles: 0, textures: 0, animations: 0},
  joints: [],
  animations: [],
  warnings: [],
};

/**
 * What stands in for a device whose model is not in the scene (yet): its
 * anchor, with no nodes to bind and nothing to click. A binding without a
 * `node` then works on the anchor; one naming a node reports it missing.
 */
const standInModel = (root: THREE.Object3D): ModelContextValue => ({
  instance: {root, nodes: new Map(), rest: new Map(), clips: [], report: EMPTY_REPORT},
  addClickable: () => () => undefined,
});

/* -------------------------------------------------------------------------- */
/* The room                                                                   */
/* -------------------------------------------------------------------------- */

/** What a `Space` tells what it holds: the room, and where each device stands now. */
type RoomContextValue = {
  room: BlokRoom;
  /** Where each placed agent stands now (its kept pose, else its `Placed`'s): what a `Route` runs through. */
  standing: ReadonlyMap<string, BlokPose>;
  stand: (agentId: string, pose: BlokPose | null) => void;
};

const NO_ROOM_CONTEXT: RoomContextValue = {room: {poseOf: () => null}, standing: new Map(), stand: () => undefined};

const RoomContext = React.createContext<RoomContextValue>(NO_ROOM_CONTEXT);

const samePose = (a: BlokPose | undefined, b: BlokPose | null): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const RoomProvider = ({room, children}: {room: BlokRoom; children: React.ReactNode}) => {
  const [standing, setStanding] = React.useState<ReadonlyMap<string, BlokPose>>(() => new Map());
  const stand = React.useCallback((agentId: string, pose: BlokPose | null) => {
    setStanding(previous => {
      if (samePose(previous.get(agentId), pose)) return previous;
      const next = new Map(previous);
      if (pose === null) next.delete(agentId);
      else next.set(agentId, pose);
      return next;
    });
  }, []);
  const value = React.useMemo(() => ({room, standing, stand}), [room, standing, stand]);
  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};

/** Says so when a `Space` names no room. Inside the scene: a notice needs the scene's store, which the frame opens. */
const RoomNotice = ({reference}: {reference: string}) => {
  useSceneNotice(reference ? null : 'A space without a room', 'Name the room (`room="room:lab"`): where devices stand is kept by it.');
  return null;
};

/**
 * A scene whose layout is a shared room. The phone looks at a room: arranging
 * it stays on the desktop, so there is no gizmo here and a device stands where
 * the room keeps it, or where its `Placed` says.
 */
export const SpaceRender: BlokRender<Scene['Space']> = args => {
  const {component, buildChild} = args;
  const blok = useBlok(component, spaceSchema);
  const reference = useValue(blok.room) ?? '';
  const room = useBlokSpaceHost().useRoom(reference);
  const embedded = useBlokSceneEmbedded();
  const children = (
    <RoomProvider room={room}>
      <RoomNotice reference={reference} />
      <Children component={component} buildChild={buildChild} />
    </RoomProvider>
  );
  if (embedded) return children;
  return <SceneFrame {...(args as unknown as React.ComponentProps<typeof SceneFrame>)}>{children}</SceneFrame>;
};

/* -------------------------------------------------------------------------- */
/* Placed devices                                                             */
/* -------------------------------------------------------------------------- */

const isPoseRows = (value: unknown): value is BlokPose =>
  Array.isArray(value) &&
  value.length === 4 &&
  value.every(row => Array.isArray(row) && row.length === 4 && row.every(cell => typeof cell === 'number' && Number.isFinite(cell)));

const IDENTITY: BlokPose = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];

/** One agent a dependency is bound to: drawn by its own scene blok where the room keeps it, its children bound to its model. */
const PlacedAgent = ({
  agent,
  dependency,
  declared,
  blokName,
  children,
}: {
  agent: BlokRunAgent;
  dependency: string;
  declared: unknown;
  blokName: string | null;
  children: React.ReactNode;
}) => {
  const {room, stand} = React.useContext(RoomContext);
  const space = useBlokSpaceHost();
  const kept = room.poseOf(agent.id);
  const pose: BlokPose = kept ?? (isPoseRows(declared) ? declared : IDENTITY);
  const poseKey = JSON.stringify(pose);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the pose by its value, not its identity
  const matrix = React.useMemo(() => toMatrix4(pose), [poseKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => stand(agent.id, pose), [agent.id, poseKey, stand]);
  React.useEffect(() => () => stand(agent.id, null), [agent.id, stand]);

  const [group, setGroup] = React.useState<THREE.Group | null>(null);
  React.useLayoutEffect(() => {
    if (group) matrix.decompose(group.position, group.quaternion, group.scale);
  }, [group, matrix]);

  const device = useOwnedModel(agent.id);
  const standIn = React.useMemo(() => (group ? standInModel(group) : null), [group]);
  const model = device ?? standIn;

  return (
    <group ref={setGroup} name={`placed:${dependency}:${agent.id}`}>
      <SceneOwnerProvider value={agent.id}>{space.renderAgent(agent.id, blokName)}</SceneOwnerProvider>
      {model ? <ModelProvider value={model}>{children}</ModelProvider> : null}
    </group>
  );
};

export const PlacedRender: BlokRender<Scene['Placed']> = ({component, buildChild}) => {
  const blok = useBlok(component, placedSchema);
  const dependency = useValue(blok.dep);
  const blokName = useValue(blok.blok) ?? null;
  const declared = useValue(blok.matrix);
  const run = useBlokRunHost();
  const agents = React.useMemo(() => (dependency ? run.agentsFor(dependency) : []), [dependency, run]);
  useSceneNotice(
    dependency && agents.length === 0 ? `Nothing is bound to "${dependency}"` : null,
    'The run has no agent for this dependency, so nothing is drawn for it.',
  );
  useSceneNotice(
    declared !== undefined && declared !== null && !isPoseRows(declared) ? 'A placement that is not a matrix' : null,
    `"${dependency}" stands at the room's origin: its matrix is not four rows of four numbers.`,
  );
  const children = <Children component={component} buildChild={buildChild} />;
  return (
    <>
      {agents.map(agent => (
        <PlacedAgent key={agent.id} agent={agent} dependency={dependency ?? ''} declared={declared} blokName={blokName}>
          {children}
        </PlacedAgent>
      ))}
    </>
  );
};

/* -------------------------------------------------------------------------- */
/* Route                                                                      */
/* -------------------------------------------------------------------------- */

const ROUTE_COLOR = 'chart-1';

/**
 * A polyline, solid or dashed. Orkestrator draws drei's `Line` (screen-space
 * widths); the phone's renderer draws one-pixel lines, so `lineWidth` is lost.
 */
const Polyline = ({points, color, dashed}: {points: readonly THREE.Vector3[]; color: string; dashed?: boolean}) => {
  const line = React.useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints([...points]);
    const material = dashed
      ? new THREE.LineDashedMaterial({color, dashSize: 0.04, gapSize: 0.03, transparent: true, opacity: 0.5})
      : new THREE.LineBasicMaterial({color});
    const object = new THREE.Line(geometry, material);
    if (dashed) object.computeLineDistances();
    object.raycast = () => undefined;
    return object;
  }, [color, dashed, points]);
  React.useEffect(
    () => () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    },
    [line],
  );
  return <primitive object={line} />;
};

export const RouteRender: BlokRender<Scene['Route']> = ({component}) => {
  const blok = useBlok(component, routeSchema);
  const through = useValue(blok.through);
  const progress = useValue(blok.progress) ?? undefined;
  const color = useThemeColour(useValue(blok.color) || ROUTE_COLOR) ?? FALLBACK_SCENE_RGB;
  const run = useBlokRunHost();
  const {standing} = React.useContext(RoomContext);
  const keys = React.useMemo(() => throughKeys(through), [through]);
  const placementOf = React.useCallback((agentId: string) => standing.get(agentId) ?? null, [standing]);
  const points = React.useMemo(() => routePoints(keys, run.agentsFor, placementOf), [keys, run, placementOf]);
  const split = React.useMemo(
    () => splitRoute(points, progress === undefined ? 1 : progressFraction(progress)),
    [points, progress],
  );
  useSceneNotice(
    keys.length >= 2 && points.length < 2 ? 'A route with nowhere to go' : null,
    `Fewer than two of ${keys.join(', ')} are placed in this space.`,
  );
  if (!split.head) return null;
  return (
    <group name="route">
      {split.travelled.length >= 2 ? <Polyline points={split.travelled} color={color} /> : null}
      {split.ahead.length >= 2 && progress !== undefined ? <Polyline points={split.ahead} color={color} dashed /> : null}
      {progress !== undefined ? (
        <mesh position={split.head} raycast={() => null}>
          <sphereGeometry args={[0.02, 16, 16]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
};
