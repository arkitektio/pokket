import {sceneRender} from '../scene';

/**
 * The components that place an action's dependencies in 3D (the scene family,
 * bsx `bloks/run/components.tsx`): they read the run the blok is shown for.
 * `Space` is a scene whose layout is a shared room, `Placed` draws at the agent
 * a dependency is bound to, where the room keeps it, and `Route` draws a line
 * through several. Loaded with three.js, like the rest of the scene.
 */
export const runRenders = {
  Space: sceneRender<'Space'>('SpaceRender'),
  Placed: sceneRender<'Placed'>('PlacedRender'),
  Route: sceneRender<'Route'>('RouteRender'),
};
