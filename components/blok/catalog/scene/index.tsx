import * as React from 'react';
import type {sceneCatalog} from '@arkitektio/bsx/catalogs';
import type {BlokRender, BlokRenderArgs} from '@arkitektio/bsx/runtime';

type Scene = typeof sceneCatalog.components;

export * from './host';
export {SceneOwnerProvider, useSceneNotice, useSceneOverlay} from './context';

/**
 * The 3D vocabulary (scene@1, orkestrator's `bloks/scene`): three containers
 * place models, a transform places what it holds, eight children bind their
 * named nodes to state, and two handle interaction and the cards laid over the
 * scene. The run components (`Overlay`, `Anchor`, `Route`) are `../run`.
 *
 * The contract (names, schemas, placement) is the package's `sceneCatalog`.
 * What draws it is three.js on the GPU, which most bloks never need: it is
 * loaded the first time a scene is shown, not with the app.
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
  [K in keyof Implementation]: Implementation[K] extends React.ComponentType<BlokRenderArgs<any>> ? K : never;
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

/** A scene@1 component's render, loaded with three.js. */
export const sceneRender = <K extends keyof Scene>(name: RenderName): BlokRender<Scene[K]> => suspended(name);

/** What draws scene@1 but the run components (`../run`): each loaded with three.js. */
export const sceneRenders = {
  Scene: sceneRender<'Scene'>('SceneRender'),
  Model: sceneRender<'Model'>('ModelRender'),
  Robot: sceneRender<'Robot'>('RobotRender'),
  Transform: sceneRender<'Transform'>('TransformRender'),
  Move: sceneRender<'Move'>('MoveRender'),
  Rotate: sceneRender<'Rotate'>('RotateRender'),
  Animate: sceneRender<'Animate'>('AnimateRender'),
  Visible: sceneRender<'Visible'>('VisibleRender'),
  Glow: sceneRender<'Glow'>('GlowRender'),
  Tint: sceneRender<'Tint'>('TintRender'),
  Attach: sceneRender<'Attach'>('AttachRender'),
  Beam: sceneRender<'Beam'>('BeamRender'),
  OnClick: sceneRender<'OnClick'>('OnClickRender'),
  Popout: sceneRender<'Popout'>('PopoutRender'),
};
