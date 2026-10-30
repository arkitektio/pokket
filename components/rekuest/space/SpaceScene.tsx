import * as React from 'react';
import * as THREE from 'three';
import {View} from 'react-native';
import {BlokSpaceHostProvider, type BlokSpaceHost} from '@/components/blok/catalog/run/host';
import {toMatrix4} from '@/components/blok/catalog/scene/affine';
import {SceneModelScopeProvider, SceneOwnerProvider, useSceneNotice, useSceneOverlay} from '@/components/blok/catalog/scene/context';
import {BlokSceneInertProvider} from '@/components/blok/catalog/scene/host';
import {SceneSurface} from '@/components/blok/catalog/scene/Scene';
import {MaterializedBlokRenderer} from '@/components/blok/MaterializedBlokRenderer';
import {Text} from '@/components/ui/text';
import {
  ComponentContext,
  useMaterializedBlokQuery,
  type SpaceBlokPlacementFragment,
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
 * What stands in it are 3D views: materialized bloks of the scene context.
 * Every one of them is rendered into the room's single scene, where its
 * `Scene` root only contributes what it holds, moved to where its placement
 * stands. A run of an action hosted here draws its action's `overlay` blok
 * over the agents it got, at their placements.
 */

/** The edge of the box that stands in for a placement with nothing to show, in meters. */
const MARKER_SIZE = 0.15;

type SceneView = {id: string; name?: string | null; blok: {name: string; context: ComponentContext}};

const viewName = (view: SceneView): string => view.name || view.blok.name;

/** The view, when it is one this room can show: a blok of the scene context. */
const sceneView = (view: SceneView | null | undefined): SceneView | null =>
  view?.blok.context === ComponentContext.Scene ? view : null;

/**
 * Something standing in the room: an app's placement (its agent, shown by one
 * of its 3D views), or a 3D blok placed on its own, with no agent. Both sit
 * where a 4x4 affine puts them.
 */
export type Standing = {
  key: string;
  name: string;
  affineMatrix: unknown;
  /** The 3D view it shows, when it has one this room can show. */
  view: SceneView | null;
  /** Whether it has a view at all, if not one this room can show. */
  hasView: boolean;
  /** The agent its models stand for; null for a blok placed on its own. */
  agentId: string | null;
};

export const standingsOf = (space: {
  placements: readonly SpacePlacementFragment[];
  blokPlacements: readonly SpaceBlokPlacementFragment[];
}): Standing[] => [
  ...space.placements.map(
    (placement): Standing => ({
      key: `agent:${placement.id}`,
      name: placement.name,
      affineMatrix: placement.affineMatrix,
      view: sceneView(placement.blok),
      hasView: Boolean(placement.blok),
      agentId: placement.agent.id,
    }),
  ),
  ...space.blokPlacements.map(
    (placement): Standing => ({
      key: `blok:${placement.id}`,
      name: placement.name || viewName(placement.blok),
      affineMatrix: placement.affineMatrix,
      view: sceneView(placement.blok),
      hasView: true,
      agentId: null,
    }),
  ),
];

/** Where each agent stands in the space, for an overlay's `Anchor` and `Route`. */
export const spaceHostOf = (placements: readonly Pick<SpacePlacementFragment, 'agent' | 'affineMatrix'>[]): BlokSpaceHost => {
  const byAgent = new Map(placements.map(placement => [placement.agent.id, placement.affineMatrix] as const));
  return {placementOf: agentId => byAgent.get(agentId) ?? null};
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

const Placed = ({item}: {item: Standing}) => {
  const [group, setGroup] = React.useState<THREE.Group | null>(null);
  const affine = item.affineMatrix;
  React.useLayoutEffect(() => {
    if (group) toMatrix4(affine).decompose(group.position, group.quaternion, group.scale);
  }, [affine, group]);
  return (
    <group ref={setGroup} name={item.key}>
      {item.view ? (
        // Its models stand for its agent: an overlay anchored at the agent binds to them.
        <SceneOwnerProvider value={item.agentId}>
          {/* Two identical devices name their models alike: each view keeps its own. */}
          <SceneModelScopeProvider value={`${item.key}/`}>
            <PlacedView id={item.view.id} name={viewName(item.view)} />
          </SceneModelScopeProvider>
        </SceneOwnerProvider>
      ) : (
        <Marker title={item.name} detail={item.hasView ? 'Its view is a panel, not a 3D view' : 'No 3D view'} />
      )}
    </group>
  );
};

/**
 * The run layer: the overlay of the action a run belongs to, drawn over the
 * agents placed here, in the room's own coordinates.
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
            <Placed key={item.key} item={item} />
          ))}
        </BlokSceneInertProvider>
        {run ? <RunLayer run={run} /> : null}
      </SceneSurface>
    </BlokSpaceHostProvider>
  );
  return <RekuestSceneHost>{run ? <RunHost run={run.run}>{surface}</RunHost> : surface}</RekuestSceneHost>;
};
