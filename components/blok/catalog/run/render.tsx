import * as React from 'react';
import * as THREE from 'three';
import {useBlok, useValue, type BlokRender, type BlokRenderArgs} from '@arkitektio/bsx/runtime';
import {ModelProvider, useOwnedModel, useSceneNotice, useSceneOverlay, type ModelContextValue} from '../scene/context';
import {FALLBACK_SCENE_RGB, useThemeColour} from '../scene/colour';
import {BlokTrayProvider, useBlokRunHost, useBlokSpaceHost, type BlokRunAgent} from './host';
import {progressFraction, resolveAnchors, routePoints, splitRoute, throughKeys} from './math';
import type {sceneCatalog} from '@arkitektio/bsx/catalogs';

type Scene = typeof sceneCatalog.components;

/**
 * What draws `Anchor` and `Route` inside a scene (orkestrator
 * `bloks/run/components.tsx`): loaded with three.js, the first time a scene is
 * shown (`scene/implementation.ts`).
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

/** One agent the space places: its children at its placement, bound to its model as its scene blok loaded it. */
const PlacedAt = ({agent, matrix, children}: {agent: BlokRunAgent; matrix: THREE.Matrix4; children: React.ReactNode}) => {
  const [group, setGroup] = React.useState<THREE.Group | null>(null);
  React.useLayoutEffect(() => {
    if (group) matrix.decompose(group.position, group.quaternion, group.scale);
  }, [group, matrix]);
  const device = useOwnedModel(agent.id);
  const standIn = React.useMemo(() => (group ? standInModel(group) : null), [group]);
  const model = device ?? standIn;
  return (
    <group ref={setGroup} name={`at:${agent.id}`}>
      {model ? <ModelProvider value={model}>{children}</ModelProvider> : null}
    </group>
  );
};

/** One agent the space does not place: a card in the side tray, where what would point at it shows. */
const TrayAt = ({agent, dependency, children}: {agent: BlokRunAgent; dependency: string; children: React.ReactNode}) => {
  const [root] = React.useState(() => new THREE.Object3D());
  const model = React.useMemo(() => standInModel(root), [root]);
  const anchor = React.useCallback(() => null, []);
  useSceneOverlay({
    visible: true,
    anchor,
    mode: 'panel',
    title: agent.name,
    description: `Not placed in this space (${dependency})`,
    content: null,
  });
  return (
    <BlokTrayProvider value={agent.name}>
      <ModelProvider value={model}>{children}</ModelProvider>
    </BlokTrayProvider>
  );
};

export const AnchorRender: BlokRender<Scene['Anchor']> = ({component, buildChild, schema}) => {
  const blok = useBlok(component, schema);
  const dependency = useValue(blok.dep);
  const run = useBlokRunHost();
  const space = useBlokSpaceHost();
  const agents = React.useMemo(() => (dependency ? run.agentsFor(dependency) : []), [dependency, run]);
  const anchors = React.useMemo(() => resolveAnchors(agents, space.placementOf), [agents, space]);
  useSceneNotice(
    dependency && agents.length === 0 ? `Nothing is bound to "${dependency}"` : null,
    'The run has no agent for this dependency, so nothing is drawn for it.',
  );
  const children = <Children component={component} buildChild={buildChild} />;
  return (
    <>
      {anchors.placed.map(({agent, matrix}) => (
        <PlacedAt key={agent.id} agent={agent} matrix={matrix}>
          {children}
        </PlacedAt>
      ))}
      {anchors.unplaced.map(agent => (
        <TrayAt key={agent.id} agent={agent} dependency={dependency ?? ''}>
          {children}
        </TrayAt>
      ))}
    </>
  );
};

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

export const RouteRender: BlokRender<Scene['Route']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  const through = useValue(blok.through);
  const progress = useValue(blok.progress) ?? undefined;
  const color = useThemeColour(useValue(blok.color) || ROUTE_COLOR) ?? FALLBACK_SCENE_RGB;
  const run = useBlokRunHost();
  const space = useBlokSpaceHost();
  const keys = React.useMemo(() => throughKeys(through), [through]);
  const points = React.useMemo(() => routePoints(keys, run.agentsFor, space.placementOf), [keys, run, space]);
  const split = React.useMemo(
    () => splitRoute(points, progress === undefined ? 1 : progressFraction(progress)),
    [points, progress],
  );
  useSceneNotice(
    keys.length >= 2 && points.length < 2 ? 'A route with nowhere to go' : null,
    `Fewer than two of ${keys.join(', ')} stand in this space.`,
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
