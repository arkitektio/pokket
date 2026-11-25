import * as React from 'react';
import * as z from 'zod';
import {boolSchema, classNameSchema, markStructureSchema, sizeSchema} from '@arkitektio/bsx/catalogs';
import {createBlokComponent, type BlokComponentDefinition, type BlokRenderArgs} from '@arkitektio/bsx/runtime';
import {outputSchema, transformSchema} from './mount/schema';
import {MIKRO_SERVICE} from './schemas';

/**
 * The Orkestrator's plot and live mounts (orkestrator `core/blok/plot` and
 * `lovekit/bloks`), with its names, props and placement:
 *
 *     <Plot axis="wavelength" type="SPECTRUM" unit="nm">
 *       <LovekitTrace value={self.scope.spectrum} />
 *     </Plot>
 *     <Scene camera="top">
 *       <LovekitVideo value={self.scope.camera} />
 *     </Scene>
 *
 * What the phone does differently is in the renders (`./liveRenders.tsx`):
 * a plot is drawn with SVG, and a video stream cannot be a texture in the
 * scene (the phone's WebRTC draws into a native view), so it plays in a card
 * beside the scene. The mount math (`./mount`) is orkestrator's, copied whole.
 *
 * The renders are loaded when first drawn: LiveKit and the mesh have no
 * business in every blok, and none in the tests that load the catalog.
 */

type Renders = typeof import('./liveRenders');

let renders: Promise<Renders> | undefined;
const loadRenders = (): Promise<Renders> => {
  renders ??= Promise.resolve().then(() => require('./liveRenders') as Renders);
  return renders;
};

const lazily = (name: keyof Renders) => {
  const Lazy = (args: BlokRenderArgs) => {
    const Render = React.use(loadRenders())[name] as React.ComponentType<BlokRenderArgs>;
    return <Render {...args} />;
  };
  const Suspended = (args: BlokRenderArgs): React.ReactElement => (
    <React.Suspense fallback={null}>
      <Lazy {...args} />
    </React.Suspense>
  );
  Suspended.displayName = `Lazy(${String(name)})`;
  return Suspended;
};

/* ------------------------------------------------------------------- plot */

export const plotSchema = z
  .object({
    axis: z.string().describe('The name of the measured axis, e.g. "wavelength".'),
    type: z
      .enum(['SPACE', 'TIME', 'MICROTIME', 'SPECTRUM'])
      .optional()
      .describe('What the axis measures, as mikro names it. Defaults to SPECTRUM.'),
    unit: z.string().describe('The unit positions along the axis are shown in, e.g. "nm". Every mount is converted into it.'),
    reference: z
      .string()
      .optional()
      .describe('The space the axis is in, as mikro and lovekit name a reference; mounts of another space are flagged.'),
    height: sizeSchema.describe('CSS height of the plot. Defaults to "20rem".'),
    className: classNameSchema,
  })
  .describe(
    'A plot along one measured axis. The mounts inside it (LovekitTrace) are drawn along that axis, each in a row of its own.',
  );

export const PlotBlok = createBlokComponent(
  {
    name: 'Plot',
    acceptsChildren: true,
    placement: {notDownstreamOf: ['Plot']},
    schema: plotSchema,
  },
  lazily('PlotRender'),
);

/* ---------------------------------------------------------------- lovekit */

const LOVEKIT_SERVICE = 'lovekit';

/** A lovekit stream, as a structure reference. */
const streamValue = (what: string) =>
  markStructureSchema(z.object({object: z.union([z.string(), z.number()]), __identifier: z.string()}), '@lovekit/stream')
    .nullish()
    .describe(`The ${what} stream, a structure reference: typically \`{self.state.stream}\`.`);

export const lovekitVideoSchema = z
  .object({
    value: streamValue('video'),
    transform: transformSchema,
    output: outputSchema,
    opacity: z.number().optional().describe('How opaque the frames are drawn, 0 to 1. Defaults to 1.'),
  })
  .describe(
    "A live video stream's frames on a quad in a Scene, sized and placed by the stream's declared axes and calibration. Streams of one reference line up with each other.",
  );

export const LovekitVideoBlok = createBlokComponent(
  {
    name: 'LovekitVideo',
    service: LOVEKIT_SERVICE,
    placement: {context: 'scene', downstreamOf: ['Scene', 'Space']},
    schema: lovekitVideoSchema,
  },
  lazily('LovekitVideoRender'),
);

export const lovekitTraceSchema = z
  .object({
    value: streamValue('data'),
    transform: transformSchema,
    output: outputSchema,
    color: z.string().optional().describe('The line colour, any CSS colour. Defaults to "#7dd3fc".'),
    className: classNameSchema,
  })
  .describe(
    "A live data stream (a spectrum, a profile) drawn as a line in a Plot: x from the stream's calibration converted to the plot's unit, y scaled to what has arrived.",
  );

export const LovekitTraceBlok = createBlokComponent(
  {
    name: 'LovekitTrace',
    service: LOVEKIT_SERVICE,
    placement: {downstreamOf: ['Plot']},
    schema: lovekitTraceSchema,
  },
  lazily('LovekitTraceRender'),
);

/* ----------------------------------------------------------- mikro mounts */

/** A structure reference of one identifier, as a mount's value. */
const reference = (identifier: string) =>
  markStructureSchema(z.object({object: z.union([z.string(), z.number()]), __identifier: z.string()}), identifier).nullish();

export const mikroSceneMountSchema = z
  .object({
    value: reference('@mikro/scene').describe('The scene, a structure reference: typically `{args.scene}`.'),
    transform: transformSchema,
    output: outputSchema,
    live: boolSchema.describe('Follow the scene as others change it. Defaults to true.'),
  })
  .describe(
    "A mikro scene's 3D layers in a Scene, placed by its world's axes and reference and moved by mikro-style transform steps. Viewing only; one per Scene.",
  );

export const MikroSceneMountBlok = createBlokComponent(
  {
    name: 'MikroSceneMount',
    service: MIKRO_SERVICE,
    placement: {context: 'scene', downstreamOf: ['Scene', 'Space']},
    schema: mikroSceneMountSchema,
  },
  lazily('MikroSceneMountRender'),
);

export const mikroChartMountSchema = z
  .object({
    value: reference('@mikro/chart').describe('The chart, a structure reference: typically `{args.chart}`.'),
    transform: transformSchema,
    output: outputSchema,
  })
  .describe(
    "A mikro chart's lines in a Plot: its axis converted into the plot's (and moved by mikro-style transform steps), its rows in one row of the plot.",
  );

export const MikroChartMountBlok = createBlokComponent(
  {
    name: 'MikroChartMount',
    service: MIKRO_SERVICE,
    placement: {downstreamOf: ['Plot']},
    schema: mikroChartMountSchema,
  },
  lazily('MikroChartMountRender'),
);

export const LIVE_BLOKS: readonly BlokComponentDefinition[] = [
  PlotBlok,
  LovekitVideoBlok,
  LovekitTraceBlok,
  MikroSceneMountBlok,
  MikroChartMountBlok,
];
