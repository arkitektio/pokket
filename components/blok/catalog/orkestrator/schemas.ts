import * as z from 'zod';
import {
  actionProp,
  bindSchema,
  boolSchema,
  classNameSchema,
  sizeSchema,
  structureValueSchema,
  type SpecPort,
} from '@arkitektio/bsx/catalogs';
import {markBindSchema} from '@arkitektio/bsx/runtime';
import {ROW_OPS, ROWS_LIMIT_DEFAULT, ROWS_LIMIT_MAX} from '@/lib/mikro/tables/rows';

/**
 * The prop schemas of the Orkestrator's catalog (`orkestrator@1`), as
 * orkestrator's `mikro/bloks/index.tsx` and `mikro/bloks/table.tsx` write
 * them: the same names, props and descriptions, so a blok written for the
 * Orkestrator validates here. `orkestrator.test.ts` holds them to the snapshot
 * bsx ships (`orkestratorCatalog()`); what the phone does differently is said
 * where it is drawn, never by changing a schema.
 */

/** The service mikro's components need where they are drawn: without it a notice shows in their place. */
export const MIKRO_SERVICE = 'mikro';

/* ------------------------------------------------------------------ scene */

export const mikroSceneSchema = z
  .object({
    value: structureValueSchema.describe('The scene, a structure reference: typically `{args.scene}`.'),
    bind: markBindSchema(
      bindSchema.describe(
        'Where the selection is written: {"annotation", "lens"} (structure references), or null when nothing is selected.',
      ),
    ),
    bindWorld: markBindSchema(
      bindSchema.describe(
        'Where the scene\'s world coordinate system is written, a structure reference ({"object", "__identifier": "@mikro/coordinatesystem"}), once the scene has loaded. What a picker of what this scene can show asks the server with: `lenses(filters: {placeableIn: {space: $world}})`, `$world` read from this path.',
      ),
    ),
    live: boolSchema.describe('Follow the scene as others change it, an action writing a layer included. Defaults to true.'),
    className: classNameSchema,
    onAnnotation: actionProp(
      'Runs when a shape is drawn. event.annotation, event.kind, event.lens and event.descriptors: the shape and the lens under the probe as structure references (lens null when none was under it).',
    ),
    onSelect: actionProp(
      'Runs when the user changes the selection (the selection a draw makes is reported as onAnnotation, not here). event.annotation, event.annotations and event.lens.',
    ),
    onPick: actionProp(
      'Runs on a deliberate click that reads a voxel (probe mode, not a vertex being placed). event.layer, event.world, event.voxel and event.lens.',
    ),
    onLayersChange: actionProp(
      'Runs when a layer comes, goes or draws another lens. event.layers and event.added; an action here that writes layers is told again, `added` names the new ones.',
    ),
  })
  .describe(
    'One mikro scene and its stores, shared by the MikroScene parts inside it. One per blok is the supported case: a second scene\'s viewport also hears the window\'s keyboard.',
  );

/* ------------------------------------------------------------------ ports */

/** What a part hands its callbacks and writes to its binds, as rekuest ports (bsx 7). */
const field = (key: string, port: SpecPort) => ({key, ...port});
const scalar = (kind: string, nullable = false): SpecPort => ({kind, nullable});
const listOf = (item: SpecPort, nullable = false): SpecPort => ({kind: 'LIST', nullable, children: [field('...', item)]});
const model = (fields: Record<string, SpecPort>, nullable = false): SpecPort => ({
  kind: 'MODEL',
  nullable,
  children: Object.entries(fields).map(([key, port]) => field(key, port)),
});
/** A reader's record of its read, `data` being what it read. */
export const readerRecord = (data: SpecPort): SpecPort => ({
  kind: 'MODEL',
  children: [
    field('status', scalar('STRING')),
    ...['loading', 'ready', 'failed', 'empty', 'stale'].map(key => field(key, scalar('BOOL'))),
    field('error', scalar('STRING', true)),
    field('data', data),
  ],
});

const ANNOTATION: SpecPort = {kind: 'STRUCTURE', identifier: '@mikro/annotation'};
const LENS: SpecPort = {kind: 'STRUCTURE', identifier: '*'};
const SCENE_LIST = (item: SpecPort): SpecPort => ({kind: 'LIST', children: [{key: '...', ...item}]});
const LAYERS = SCENE_LIST({kind: 'STRUCTURE', identifier: '*'});
const DESCRIPTORS: SpecPort = {
  kind: 'DICT',
  nullable: true,
  children: [{key: '...', kind: 'UNION', children: ['STRING', 'FLOAT', 'BOOL'].map((kind, index) => ({key: String(index), kind}))}],
};
const CELL: SpecPort = {
  kind: 'UNION',
  nullable: true,
  children: ['STRING', 'FLOAT', 'BOOL'].map((kind, index) => field(String(index), {kind})),
};

/** What each callback hands its action (`event.<field>`), as the spec publishes it. */
export const MIKRO_SCENE_EVENTS = {
  onAnnotation: [
    {key: 'annotation', port: ANNOTATION, description: 'The drawn shape, as a structure reference.'},
    {key: 'kind', port: {kind: 'STRING'}, description: 'The kind of shape.'},
    {key: 'lens', port: {...LENS, nullable: true}, description: 'The lens under the probe, or null.'},
    {key: 'descriptors', port: DESCRIPTORS, description: "The shape's descriptors, or null."},
  ],
  onLayersChange: [
    {key: 'layers', port: LAYERS, description: 'The layers now drawn.'},
    {key: 'added', port: LAYERS, description: 'The layers that are new.'},
  ],
  onPick: [
    {key: 'layer', port: {kind: 'STRING'}, description: 'The layer read.'},
    {key: 'world', port: {...SCENE_LIST({kind: 'FLOAT'}), nullable: true}, description: 'The world point, or null.'},
    {key: 'voxel', port: SCENE_LIST({kind: 'INT'}), description: 'The voxel read.'},
    {key: 'lens', port: {...LENS, nullable: true}, description: 'The lens, or null.'},
  ],
  onSelect: [
    {key: 'annotation', port: ANNOTATION, description: 'The selected annotation.'},
    {key: 'annotations', port: SCENE_LIST(ANNOTATION), description: 'Every selected annotation.'},
    {key: 'lens', port: {...LENS, nullable: true}, description: 'The lens under the probe, or null.'},
  ],
};

/** What MikroScene writes to its binds. */
export const MIKRO_SCENE_BINDS: Record<string, SpecPort> = {
  bind: {
    kind: 'MODEL',
    nullable: true,
    children: [
      {key: 'annotation', ...ANNOTATION, nullable: true},
      {key: 'lens', ...LENS, nullable: true},
    ],
  },
  bindWorld: {kind: 'STRUCTURE', identifier: '@mikro/coordinatesystem'},
};

const COLUMN = model({
  name: scalar('STRING'),
  longName: scalar('STRING', true),
  description: scalar('STRING', true),
  dtype: scalar('STRING'),
  role: scalar('STRING', true),
  unit: scalar('STRING', true),
  axisType: scalar('STRING', true),
});

/** What each table reader reads, as its record's `data`. */
export const TABLE_READ = {
  TableColumns: listOf(COLUMN, true),
  ColumnStat: model(
    {
      rows: scalar('INT'),
      nonNull: scalar('INT'),
      min: scalar('FLOAT', true),
      max: scalar('FLOAT', true),
      mean: scalar('FLOAT', true),
      distinct: scalar('INT', true),
    },
    true,
  ),
  ColumnHistogram: model({domain: model({min: scalar('FLOAT'), max: scalar('FLOAT')}), bins: listOf(scalar('INT'))}, true),
  TableRows: model({rows: listOf({kind: 'DICT', children: [field('...', CELL)]}), total: scalar('INT')}, true),
} satisfies Record<string, SpecPort>;

export const mikroSceneViewportSchema = z
  .object({
    height: sizeSchema.describe('CSS height of the viewport. Defaults to "32rem".'),
    minHeight: sizeSchema.describe('CSS minimum height of the viewport.'),
    sliders: boolSchema.describe('Show the Z and dimension sliders. Defaults to true.'),
    cards: boolSchema.describe(
      "Open a shape's action card on a click or a draw. Defaults to false here: the blok decides what a shape does.",
    ),
    className: classNameSchema,
  })
  .describe("The scene's interactive view: draw, probe, navigate. Placed inside a MikroScene.");

export const mikroScenePanelSchema = z.object({
  height: sizeSchema.describe('CSS height of the panel.'),
  className: classNameSchema,
});

export const MIKRO_SCENE_PANELS = {
  MikroSceneLayers: "The scene's layers, as the scene page's Layers tab lists them. Placed inside a MikroScene.",
  MikroSceneAnnotations:
    "The scene's annotation layers, each card with its shapes and the selection in it. Placed inside a MikroScene.",
  MikroSceneProbe: 'What the probe reads under the cursor. Placed inside a MikroScene.',
} as const;

/* ----------------------------------------------------------------- tables */

const tableValueSchema = structureValueSchema.describe(
  'The table, a structure reference ({"object", "__identifier": "@mikro/tabledataset"}): typically `{args.table}`.',
);
const columnSchema = z.string().nullish().describe('The column, by its name. Nothing is read while it is unset.');
const clearOnUnmountSchema = boolSchema.describe('Remove the record when this leaves the screen, instead of keeping it marked stale.');

const recordBind = (data: string) =>
  markBindSchema(
    bindSchema.describe(
      `Where the record is written: {"status", "loading", "ready", "failed", "empty", "stale", "error", "data"}. ${data} Seed it in demo_state for the preview, which reads nothing.`,
    ),
  );

export const COLUMN_ROLES = ['ATTRIBUTE', 'COLOR', 'COORDINATE', 'GROUP_ID', 'ID', 'LABEL', 'TRACK_ID'] as const;

export const tableColumnsSchema = z
  .object({
    value: tableValueSchema,
    role: z
      .union([z.enum(COLUMN_ROLES), z.array(z.enum(COLUMN_ROLES))])
      .optional()
      .describe('Only the columns of this role (or of any of these roles).'),
    bind: recordBind(
      '`data` is the list of columns, in order: {"name", "longName", "description", "dtype", "role", "unit", "axisType"}.',
    ),
    clearOnUnmount: clearOnUnmountSchema,
  })
  .describe("Reads what a TableDataset's columns are. Draws nothing: a picker or a foreach reads the record.");

export const columnStatSchema = z
  .object({
    value: tableValueSchema,
    column: columnSchema,
    distinct: boolSchema.describe('Also count the distinct values. A full scan of the column: leave it off unless shown.'),
    bind: recordBind(
      '`data` is {"rows", "nonNull", "min", "max", "mean", "distinct"}; min/max/mean are null for a column with no numbers, distinct is null unless asked for.',
    ),
    clearOnUnmount: clearOnUnmountSchema,
  })
  .describe('Reads how full one column of a TableDataset is and how its numbers spread, in one scan. Draws nothing.');

export const columnHistogramSchema = z
  .object({
    value: tableValueSchema,
    column: columnSchema,
    bins: z.number().optional().describe('How many bars. Defaults to 32.'),
    height: sizeSchema.describe('CSS height of the bars. Defaults to "6rem".'),
    bind: recordBind('`data` is {"domain": {"min", "max"}, "bins": [counts]}, or null for a column with no numbers.'),
    clearOnUnmount: clearOnUnmountSchema,
    className: classNameSchema,
  })
  .describe('Draws how the numbers of one column of a TableDataset are distributed, as bars over its range.');

const conditionSchema = z.object({
  column: z.string(),
  op: z.enum(ROW_OPS).optional(),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))]).optional(),
});

export const tableRowsSchema = z
  .object({
    value: tableValueSchema,
    columns: z.array(z.string()).nullish().describe('The columns to read, by name. Defaults to every column.'),
    where: z
      .array(conditionSchema)
      .nullish()
      .describe(
        `Conditions every row must meet: [{"column", "op", "value"}], op one of ${ROW_OPS.join(', ')} (default eq). "in" takes a list; "contains" matches text, ignoring case.`,
      ),
    orderBy: z.string().nullish().describe('The column to sort by.'),
    descending: boolSchema.describe('Sort from the largest.'),
    limit: z.number().optional().describe(`Rows per page. Defaults to ${ROWS_LIMIT_DEFAULT}, at most ${ROWS_LIMIT_MAX}.`),
    offset: z.number().optional().describe('Rows to skip: the page is offset / limit.'),
    bind: recordBind('`data` is {"rows": [{column: value}], "total"}: total counts every row the conditions keep.'),
    clearOnUnmount: clearOnUnmountSchema,
  })
  .describe("Reads one page of a TableDataset's rows, filtered and sorted. Draws nothing: a foreach or a Table reads the record.");
