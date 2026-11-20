import * as React from 'react';
import * as THREE from 'three';
import {View} from 'react-native';
import {BlokSpaceHostProvider, type BlokPose, type BlokRoom, type BlokSpaceHost} from '@/components/blok/catalog/run/host';
import {toMatrix4} from '@/components/blok/catalog/scene/affine';
import {SceneModelScopeProvider, SceneOwnerProvider, useSceneNotice, useSceneOverlay} from '@/components/blok/catalog/scene/context';
import {BlokSceneInertProvider} from '@/components/blok/catalog/scene/host';
import {SceneSurface} from '@/components/blok/catalog/scene/Scene';
import {MaterializedBlokRenderer} from '@/components/blok/MaterializedBlokRenderer';
import {Text} from '@/components/ui/text';
import {
  ComponentContext,
  useListMaterializedBloksQuery,
  useMaterializedBlokQuery,
  type ListMaterializedBlokFragment,
  type SpaceFragment,
  type SpacePlacementFragment,
} from '@/lib/rekuest/api/graphql';
import {RekuestSceneHost} from '@/lib/rekuest/blok/sceneHost';
import type {SpaceRun} from '@/lib/rekuest/run/useRun';
import {cn} from '@/lib/utils';
import {ActionBlokRenderer, RunHost} from '../run/ActionBlokRenderer';

/**
 * A space as one 3D room, to look at (orkestrator's `SpaceScene` without its
 * editor: arranging stays on the desktop).
 *
 * What stands in it are the agents someone placed here, each drawn by its own
 * 3D view (a scene blok it declares) into the room's single scene, where its
 * `Scene` root only contributes what it holds, moved to where its placement
 * stands. A run of an action hosted here draws its action's `Space` blok into
 * this room, over the agents it got, where they stand here.
 */

/** The edge of the box that stands in for a placement with nothing to show, in meters. */
const MARKER_SIZE = 0.15;

/** How many 3D views are asked for: past the server's default page. */
const VIEW_LIMIT = 500;

/**
 * Someone placed an agent here: where it stands is a 4x4 affine, the same for
 * everyone. The space keeps only that; the agent is drawn by its own 3D view.
 */
export type Standing = {
  key: string;
  name: string;
  affineMatrix: unknown;
  /** The agent its models stand for. */
  agentId: string;
};

export const standingsOf = (space: {placements: readonly SpacePlacementFragment[]}): Standing[] =>
  space.placements.map(placement => ({
    key: `agent:${placement.id}`,
    name: placement.name || placement.agent.name,
    affineMatrix: placement.affineMatrix,
    agentId: placement.agent.id,
  }));

/** Whether `view` is one of the agent's own: declared by it, or mapped to it as `self`. */
const isOwnView = (view: ListMaterializedBlokFragment, agentId: string): boolean =>
  view.declaredBy?.id === agentId || view.agentMappings.some(mapping => mapping.key === 'self' && mapping.agent.id === agentId);

/** The 3D view an agent is drawn by (orkestrator's `agentSceneView`): its own default scene blok, else any of its own. */
export const agentSceneView = (
  agentId: string,
  views: readonly ListMaterializedBlokFragment[],
): ListMaterializedBlokFragment | null => {
  const own = views.filter(view => view.blok.context === ComponentContext.Scene && isOwnView(view, agentId));
  return own.find(view => view.isDefault) ?? own[0] ?? null;
};

const isPose = (value: unknown): value is BlokPose =>
  Array.isArray(value) &&
  value.length === 4 &&
  value.every(row => Array.isArray(row) && row.length === 4 && row.every(cell => typeof cell === 'number'));

/**
 * The room a run's `Space` blok is drawn into here: this space, whatever room
 * the blok names. A device stands where this space places it, and the space
 * draws every device itself, so a `Placed` draws none again: it binds what it
 * holds to the model that is already there. Nothing is arranged on the phone.
 */
export const spaceHostOf = (placements: readonly Pick<SpacePlacementFragment, 'agent' | 'affineMatrix'>[]): BlokSpaceHost => {
  const byAgent = new Map(
    placements.flatMap(placement => (isPose(placement.affineMatrix) ? [[placement.agent.id, placement.affineMatrix] as const] : [])),
  );
  const room: BlokRoom = {poseOf: agentId => byAgent.get(agentId) ?? null};
  return {useRoom: () => room, renderAgent: () => null};
};

const Marker = ({title, detail}: {title: string; detail: string}) => {
  const mesh = React.useRef<THREE.Mesh>(null);
  const anchor = React.useCallback(() => mesh.current, []);
  useSceneOverlay({visible: true, anchor, title, description: detail, content: null, mode: 'popout'});
  return (
    <mesh ref={mesh} position={[0, MARKER_SIZE / 2, 0]}>
      <boxGeometry args={[MARKER_SIZE, MARKER_SIZE, MARKER_SIZE]} />
      <meshBasicMaterial color="#8b8b8b" wireframe />
    </mesh>
  );
};

const PlacedView = ({id, name}: {id: string; name: string}) => {
  const {data, error} = useMaterializedBlokQuery({variables: {id}});
  useSceneNotice(error ? `${name} could not be loaded` : null, error?.message);
  if (!data?.materializedBlok) return null;
  return <MaterializedBlokRenderer materializedBlok={data.materializedBlok} chrome="none" />;
};

const Placed = ({item, views}: {item: Standing; views: readonly ListMaterializedBlokFragment[] | null}) => {
  const [group, setGroup] = React.useState<THREE.Group | null>(null);
  const affine = item.affineMatrix;
  React.useLayoutEffect(() => {
    if (group) toMatrix4(affine).decompose(group.position, group.quaternion, group.scale);
  }, [affine, group]);
  const view = views ? agentSceneView(item.agentId, views) : null;
  return (
    <group ref={setGroup} name={item.key}>
      {view ? (
        // Its models stand for its agent: a run's `Placed` for that agent binds to them.
        <SceneOwnerProvider value={item.agentId}>
          {/* Two identical devices name their models alike: each view keeps its own. */}
          <SceneModelScopeProvider value={`${item.key}/`}>
            <PlacedView id={view.id} name={view.name || view.blok.name} />
          </SceneModelScopeProvider>
        </SceneOwnerProvider>
      ) : views ? (
        <Marker title={item.name} detail="No 3D view" />
      ) : null}
    </group>
  );
};

/**
 * The run layer: the `Space` blok of the action a run belongs to, drawn over
 * the agents placed here, in the room's own coordinates.
 */
const RunLayer = ({run}: {run: SpaceRun}) => (
  <SceneModelScopeProvider value={`run:${run.run.task.id}/`}>
    <ActionBlokRenderer actionBlok={run.actionBlok} run={run.run} chrome="none" />
  </SceneModelScopeProvider>
);

/**
 * The room as it is: every 3D view where it was placed, live unless a travel
 * provider around it says otherwise. `overlay` is the screen's own views over
 * the scene. `readOnly`: the devices ignore the finger, so nothing in it can
 * be run. `run` draws a run of an action into the room.
 */
export const SpaceScene = ({
  space,
  overlay,
  readOnly = false,
  run,
  className,
}: {
  space: SpaceFragment;
  overlay?: React.ReactNode;
  readOnly?: boolean;
  run?: SpaceRun | null;
  className?: string;
}) => {
  const items = React.useMemo(() => standingsOf(space), [space]);
  const {data: viewData} = useListMaterializedBloksQuery({
    variables: {filters: {contexts: [ComponentContext.Scene]}, pagination: {limit: VIEW_LIMIT}},
    skip: items.length === 0,
  });
  const views = viewData?.materializedBloks ?? null;
  const host = React.useMemo(() => spaceHostOf(space.placements), [space.placements]);
  // The run is provided around the whole surface, so a card it opens (the run's ask) has it too.
  const surface = (
    <BlokSpaceHostProvider value={host}>
      <SceneSurface
        className={cn('flex-1 overflow-hidden', className)}
        overlay={
          <>
            {items.length === 0 ? (
              <View pointerEvents="none" className="absolute inset-0 items-center justify-center p-6">
                <View className="rounded-lg bg-background/80 px-4 py-3">
                  <Text className="text-center text-sm text-muted-foreground">
                    Nothing stands in this space yet. Arrange it in orkestrator.
                  </Text>
                </View>
              </View>
            ) : null}
            {overlay}
          </>
        }
      >
        <BlokSceneInertProvider value={readOnly}>
          {items.map(item => (
            <Placed key={item.key} item={item} views={views} />
          ))}
        </BlokSceneInertProvider>
        {run ? <RunLayer run={run} /> : null}
      </SceneSurface>
    </BlokSpaceHostProvider>
  );
  return <RekuestSceneHost>{run ? <RunHost run={run.run}>{surface}</RunHost> : surface}</RekuestSceneHost>;
};
