import * as React from 'react';
import {View} from 'react-native';
import {Text} from '@/components/ui/text';
import type {sceneCatalog} from '@arkitektio/bsx/catalogs';
import type {BlokRender, BlokRenderArgs} from '@arkitektio/bsx/runtime';
import {sceneRender} from '../scene';
import {useBlokSceneEmbedded} from '../scene/host';

type Scene = typeof sceneCatalog.components;

/**
 * The components only an action's own blok holds (scene@1, orkestrator
 * `bloks/run/components.tsx`): they read the run it is shown for. `Overlay` is
 * the root of one drawn into the space hosting the run, `Anchor` anchors at
 * the agent a dependency is bound to, and `Route` draws a line through several.
 *
 * Inside a space (`components/rekuest/space/SpaceScene.tsx`) an `Overlay` adds
 * what it holds to the room; anywhere else it shows a note that it belongs to
 * a run in a space.
 */

const Children = ({component, buildChild}: Pick<BlokRenderArgs, 'component' | 'buildChild'>) => (
  <>
    {(component.children ?? []).map(child => (
      <React.Fragment key={child.id}>{buildChild(child.id)}</React.Fragment>
    ))}
  </>
);

export const OverlayRender: BlokRender<Scene['Overlay']> = ({component, buildChild}) =>
  useBlokSceneEmbedded() ? (
    <Children component={component} buildChild={buildChild} />
  ) : (
    <View className="min-h-24 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6">
      <Text className="text-center text-sm text-muted-foreground">
        An overlay is drawn into the space that hosts a run of its action. Open the run in a space to see it.
      </Text>
    </View>
  );

/** The run components of scene@1: `Anchor` and `Route` are loaded with three.js, like the rest of the scene. */
export const runRenders = {
  Overlay: OverlayRender,
  Anchor: sceneRender<'Anchor'>('AnchorRender'),
  Route: sceneRender<'Route'>('RouteRender'),
};
