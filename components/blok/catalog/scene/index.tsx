import * as React from 'react';
import {
  createBlokComponent,
  type BlokComponentDefinition,
  type BlokObjectSchema,
  type BlokRenderArgs,
} from '@/lib/ports/blok/runtime';
import {
  animateSchema,
  attachSchema,
  beamSchema,
  glowSchema,
  IN_MODEL,
  MODEL_PROP_KINDS,
  modelSchema,
  moveSchema,
  onClickSchema,
  popoutSchema,
  robotSchema,
  rotateSchema,
  sceneSchema,
  showSchema,
  tintSchema,
} from './schemas';

export * from './host';

/**
 * The 3D vocabulary (orkestrator's `bloks/scene`): three containers place
 * models, eight children bind their named nodes to state, and two handle
 * interaction and the cards laid over the scene.
 *
 * The definitions here (names, schemas, placement) are what the catalog checks
 * every blok against. What draws them is three.js on the GPU, which most bloks
 * never need: it is loaded the first time a scene is shown, not with the app.
 */

type Implementation = typeof import('./implementation');

let implementation: Promise<Implementation> | undefined;

// Metro evaluates a module the first time it is required, so the require
// itself is what defers three.js; the promise lets React suspend on it once.
const loadImplementation = (): Promise<Implementation> => {
  implementation ??= Promise.resolve().then(() => require('./implementation') as Implementation);
  return implementation;
};

type RenderName = {
  [K in keyof Implementation]: Implementation[K] extends React.ComponentType<never> ? K : never;
}[keyof Implementation] &
  `${string}Render`;

/** Renders `name` from the implementation, once it is loaded (at once from then on). */
const lazyRender = (name: RenderName) =>
  function LazySceneBlok(args: BlokRenderArgs) {
    const loaded = React.use(loadImplementation());
    const Render = loaded[name] as unknown as React.ComponentType<BlokRenderArgs>;
    return <Render {...args} />;
  };

/** Waits for the implementation without showing anything: inside a scene, its own parts follow it at once. */
const suspended = (name: RenderName) => {
  const Lazy = lazyRender(name);
  return function SuspendedSceneBlok(args: BlokRenderArgs) {
    return (
      <React.Suspense fallback={null}>
        <Lazy {...args} />
      </React.Suspense>
    );
  };
};

const sceneComponent = <TSchema extends BlokObjectSchema>(
  api: Parameters<typeof createBlokComponent<TSchema>>[0],
  name: RenderName,
): BlokComponentDefinition => createBlokComponent(api, suspended(name));

export const sceneBlokComponents: BlokComponentDefinition[] = [
  sceneComponent(
    {name: 'Scene', acceptsChildren: true, placement: {childrenContext: 'scene', notDownstreamOf: ['Scene']}, schema: sceneSchema},
    'SceneRender',
  ),
  sceneComponent(
    {
      name: 'Model',
      acceptsChildren: true,
      placement: {context: 'scene', downstreamOf: ['Scene']},
      propKinds: MODEL_PROP_KINDS,
      schema: modelSchema,
    },
    'ModelRender',
  ),
  sceneComponent(
    {
      name: 'Robot',
      acceptsChildren: true,
      placement: {context: 'scene', downstreamOf: ['Scene']},
      propKinds: MODEL_PROP_KINDS,
      schema: robotSchema,
    },
    'RobotRender',
  ),
  sceneComponent({name: 'Move', placement: IN_MODEL, schema: moveSchema}, 'MoveRender'),
  sceneComponent({name: 'Rotate', placement: IN_MODEL, schema: rotateSchema}, 'RotateRender'),
  sceneComponent({name: 'Animate', placement: IN_MODEL, schema: animateSchema}, 'AnimateRender'),
  sceneComponent({name: 'Show', placement: IN_MODEL, schema: showSchema}, 'ShowRender'),
  sceneComponent({name: 'Glow', placement: IN_MODEL, schema: glowSchema}, 'GlowRender'),
  sceneComponent({name: 'Tint', placement: IN_MODEL, schema: tintSchema}, 'TintRender'),
  sceneComponent({name: 'Attach', placement: IN_MODEL, schema: attachSchema}, 'AttachRender'),
  sceneComponent({name: 'Beam', placement: IN_MODEL, schema: beamSchema}, 'BeamRender'),
  sceneComponent(
    {name: 'OnClick', placement: {context: 'scene', downstreamOf: ['Model', 'Robot']}, schema: onClickSchema},
    'OnClickRender',
  ),
  sceneComponent(
    {
      name: 'Popout',
      acceptsChildren: true,
      placement: {context: 'scene', childrenContext: 'html', downstreamOf: ['Model', 'Robot']},
      schema: popoutSchema,
    },
    'PopoutRender',
  ),
];
