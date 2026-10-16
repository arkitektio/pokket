import * as z from 'zod';
import type {BlokComponentPlacement} from '@/lib/ports/blok/runtime';
import {actionProp, describedString} from '../shared/schemas';

/**
 * The prop schemas of the 3D bloks, the desktop's word for word, so a payload
 * validates on both. Kept apart from the components: the catalog needs the
 * schemas wherever a blok is checked, and only a scene being shown needs
 * three.js (see `index.ts`).
 */

// Bindings: children of a model that drive its named nodes.
/** Every binding sits somewhere under the model whose nodes it names. */
export const IN_MODEL: BlokComponentPlacement = {context: 'scene', downstreamOf: ['Model', 'Robot']};

export const bindingNodeProp = z.string().describe('The name of the node in the enclosing model that this binds.');

export const motionShape = (unit: string, rate: string) => ({
  node: bindingNodeProp,
  axis: z
    .string()
    .describe('The axis in the node\'s own frame: "x", "y", "z" or a vector as "x y z".'),
  value: z
    .unknown()
    .optional()
    .describe(`Where the part is, in ${unit} from the pose the model was authored in. A quantity ({magnitude, unit}) is converted.`),
  animateTo: z
    .unknown()
    .optional()
    .describe('Where the part is going. With it, the view moves there at speed (or over duration) and value corrects it.'),
  speed: z.number().optional().describe(`How fast it moves to animateTo, in ${rate}.`),
  duration: z.number().optional().describe('How long a move to animateTo takes, in seconds. Ignored when speed is given.'),
  scale: z.number().optional().describe('Multiplies the value before it is applied. Defaults to 1.'),
  offset: z.number().optional().describe(`Added after scale, in ${unit}. Defaults to 0.`),
  gain: z.number().optional().describe('Exaggerates the motion on screen only, for travel too small to see. Defaults to 1.'),
  smooth: z.boolean().optional().describe('Whether to ease toward each new value over 300 ms. Defaults to true.'),
});

export const moveSchema = z
  .object(motionShape('meters', 'm/s'))
  .describe('Translates a node along an axis by value x scale + offset meters from its authored pose.');

export const rotateSchema = z
  .object(motionShape('radians', 'rad/s'))
  .describe('Rotates a node about an axis by value x scale + offset radians from its authored pose.');

export const showSchema = z
  .object({
    node: bindingNodeProp,
    when: z.boolean().optional().describe('Whether the node is visible. Hiding a node hides everything beneath it.'),
  })
  .describe('Shows or hides a node and its whole subtree.');

export const glowSchema = z
  .object({
    node: bindingNodeProp,
    on: z.boolean().optional().describe('Whether the node glows.'),
    intensity: z.number().optional().describe('How strongly. Defaults to 1 for materials, and to the authored intensity for a light.'),
    color: describedString('The color of the glow, as a CSS color. Defaults to the material\'s own emissive color, or white.'),
  })
  .describe('Switches the emissive output of a node\'s materials, or the intensity of a punctual light attached to it.');

export const tintSchema = z
  .object({
    node: bindingNodeProp,
    color: describedString('The base color to give the node, as a CSS color. Without it the authored color shows.'),
  })
  .describe('Overrides the base color of a node. Its materials are copied first, so nodes sharing them are unaffected.');

export const attachSchema = z
  .object({
    node: bindingNodeProp,
    to: z
      .string()
      .describe('What to attach it to: a node of this model, or "<model id>:<node>" for a node of another model in the scene.'),
    when: z.boolean().optional().describe('Whether it is attached. When false the node returns to where it was authored.'),
  })
  .describe('While `when` holds, carries a node with another node, keeping its place in the world at the moment of attaching. For picked-up objects.');

export const beamSchema = z
  .object({
    start: z.string().describe('The node the beam leaves from.'),
    end: describedString('The node the beam ends at, in this model or as "<model id>:<node>". Use this or length.'),
    length: z.number().optional().describe('How far the beam reaches along the start node\'s own Z axis, in meters. Use this or end.'),
    on: z.boolean().optional().describe('Whether the beam is drawn. Defaults to true.'),
    wavelength: z.number().optional().describe('The wavelength in nanometers, shown as its color.'),
    color: describedString('The color of the beam as a CSS color. Takes precedence over wavelength.'),
    width: z.number().optional().describe('The diameter of the beam in meters. Defaults to 2 mm.'),
  })
  .describe('Draws a beam from one anchor to another, or for a length along an anchor\'s Z axis, following both as they move.');

export const animateSchema = z
  .object({
    clip: z.string().describe('The name of an animation clip in the enclosing model.'),
    progress: z.number().optional().describe('Where in the clip to show, from 0 (start) to 1 (end). Use this or time.'),
    time: z.number().optional().describe('Where in the clip to show, in seconds. Use this or progress.'),
    animateTo: z.number().optional().describe('The position to play to, in the unit of whichever of progress or time is used.'),
    duration: z.number().optional().describe('How long playing to animateTo takes, in seconds.'),
  })
  .describe('Scrubs a named animation clip of the model to a position, for mechanisms a single move or turn cannot describe. Never loops on its own.');

// Interaction: taps and the cards they open.
export const nodeProp = z.string().describe('The name of the node in the enclosing model.');

export const titleProp = describedString('The heading of the card; it shows the node name when unset.');

export const descriptionProp = describedString('A line under the heading of the card.');

export const onClickSchema = z
  .object({
    node: nodeProp,
    onClick: actionProp(
      'Called when the node is clicked (not when a drag of the view ends on it). Arguments may read event.node and event.point ([x, y, z] in meters, where it was hit).',
    ),
    open: describedString('The name of an html blok to show when the node is clicked.'),
    title: titleProp,
    description: descriptionProp,
    mode: z
      .enum(['popout', 'panel'])
      .optional()
      .describe(
        'Where the opened blok shows: "popout" as a card on the clicked spot (the viewer can drag it aside), "panel" beside the scene. Defaults to popout.',
      ),
  })
  .describe(
    'Makes a node and everything beneath it clickable, with a highlight on hover. A click runs an action, opens a blok, or both; a second click closes it, and opening one card closes the others that are not pinned.',
  );

export const popoutSchema = z
  .object({
    node: nodeProp,
    trigger: z
      .enum(['click', 'hover', 'always'])
      .optional()
      .describe('What shows the card: a click on the node, the pointer over it, or always. Defaults to click.'),
    open: z.boolean().optional().describe('Whether the card shows. When bound it decides alone and trigger is ignored.'),
    title: titleProp,
    description: descriptionProp,
  })
  .describe(
    'An HTML card anchored to a node that follows it as it moves; the viewer can drag it aside, and a line keeps pointing at the node. Its children are ordinary html components.',
  );

// Models.
export const modelShape = {
  src: z
    .string()
    .describe('The 3D model to show: an asset its app registered, as in "@self.assets.scope".'),
  id: describedString('A name other models in the scene address this one by, as in to="arm:tool0".'),
  origin: describedString('Where the model sits in the scene, as "x y z" in meters.'),
  rotation: describedString('How the model is turned, as "x y z" Euler angles in radians.'),
  scale: z.number().optional().describe('Uniform scale. Defaults to 1; a model is authored in meters.'),
};

export const modelSchema = z
  .object(modelShape)
  .describe(
    'Places one GLB model in the scene. Its children bind the model\'s named nodes to state. A model that is missing or refused renders a placeholder that says why.',
  );

export const jointValues = z.record(z.string(), z.unknown()).optional();

export const robotSchema = z
  .object({
    ...modelShape,
    joints: jointValues.describe(
      'Where each joint is: a map of joint name to radians (revolute, continuous) or meters (prismatic). A joint left out keeps its last value.',
    ),
    animateTo: jointValues.describe('Where each joint is going. Joints named here move at speed, or over duration.'),
    speed: z
      .unknown()
      .optional()
      .describe('How fast joints move to animateTo, in rad/s or m/s: one number for all joints or a map by joint name.'),
    duration: z
      .unknown()
      .optional()
      .describe('How long a move to animateTo takes, in seconds: one number or a map by joint name. Ignored where speed is given.'),
    onJointChange: actionProp(
      'Called when the viewer sets a joint by hand. Arguments may read event.name and event.value.',
    ),
  })
  .describe(
    'A Model with a joint table (extras.arkitekt.joints): applies a joint state map to it, including mimic joints, and clamps to limits.',
  );

export const MODEL_PROP_KINDS = {src: 'ASSET'} as const;

// The scene.
export const sceneSchema = z
  .object({
    camera: z
      .enum(['iso', 'front', 'side', 'top'])
      .optional()
      .describe('Where the camera starts looking from; it frames the models whatever their size. Defaults to iso.'),
    grid: z.boolean().optional().describe('Whether the ground grid starts shown; the viewer can switch it. Defaults to true.'),
    height: describedString(
      'CSS height of the view, e.g. "24rem". Omit to fit the element the scene is in (24rem where that has no height of its own).',
    ),
  })
  .describe(
    'Root of a 3D view: one renderer, camera and light rig. Y is up and one unit is one meter. Place Model and Robot inside.',
  );
