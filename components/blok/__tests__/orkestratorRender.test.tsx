import {describe, expect, it, jest} from '@jest/globals';
import * as React from 'react';
import {act, type ReactTestInstance, type ReactTestRenderer} from 'react-test-renderer';
import {parseBsx} from '@arkitektio/bsx';
import {normalizeBlokComponentTree} from '@arkitektio/bsx/runtime';
import {renderBlok, shownTexts} from '../testing';

jest.mock('sonner-native', () => ({toast: {info: jest.fn(), error: jest.fn()}}));
jest.mock('@rn-primitives/slot', () => {
  const {Pressable, Text, View} = jest.requireActual<typeof import('react-native')>('react-native');
  return {Pressable, Text, View};
});

/**
 * The Orkestrator's mikro bloks drawn on the phone: a scene's parts read the
 * scene its MikroScene loads, a shape picked from the list is the selection,
 * and a table's readers write what its parquet holds. Mikro answers here and
 * the parquet is a list of rows: nothing leaves the test.
 */

let mockMikroReady = true;
jest.mock('@/lib/app/App', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const guard = ({children, fallback}: {children: React.ReactNode; fallback?: React.ReactNode}) =>
    ReactActual.createElement(ReactActual.Fragment, null, mockMikroReady ? children : (fallback ?? null));
  return {Guard: new Proxy({}, {get: () => guard})};
});

const LAYERS = [
  {
    __typename: 'AnnotationLayer',
    id: 'l2',
    kind: 'ANNOTATION',
    name: null,
    visible: true,
    order: 1,
    annotationCollection: {__typename: 'AnnotationCollection', id: 'c1', name: 'Nuclei'},
  },
  {
    __typename: 'IntensityLayer',
    id: 'l1',
    kind: 'INTENSITY',
    name: 'DAPI',
    visible: true,
    order: 0,
    arrayLens: {__typename: 'ArrayLens', id: 'lens-1', label: 'whole', dataset: {__typename: 'ArrayDataset', id: 'd1'}},
  },
];

const ANSWERS: Record<string, (variables: Record<string, unknown>) => unknown> = {
  GetBlokScene: () => ({
    scene: {
      __typename: 'Scene',
      id: 's1',
      name: 'Embryo',
      latestSnapshot: null,
      worldCoordinateSystem: {__typename: 'CoordinateSystem', id: 'w1', name: 'world'},
      layers: LAYERS,
    },
  }),
  GetBlokAnnotationCollection: () => ({
    annotationCollection: {
      __typename: 'AnnotationCollection',
      id: 'c1',
      name: 'Nuclei',
      annotations: [
        {__typename: 'Annotation', id: 'a1', name: 'nucleus 1', kind: 'POLYGON'},
        {__typename: 'Annotation', id: 'a2', name: '', kind: 'POINT'},
      ],
    },
  }),
  GetBlokTable: () => ({
    tableDataset: {
      __typename: 'TableDataset',
      id: 't1',
      name: 'nuclei',
      store: {__typename: 'ParquetStore', id: 'st1', sizeBytes: 100},
      columns: [
        {name: 'label', order: 1, role: 'LABEL', dtype: 'string'},
        {name: 'area', order: 0, role: 'ATTRIBUTE', dtype: 'float64'},
      ].map(column => ({__typename: 'Column', id: column.name, longName: null, description: null, unit: null, axisType: null, ...column})),
    },
  }),
};

const operationName = (document: {definitions: readonly {name?: {value: string}}[]}) =>
  document.definitions.find(definition => definition.name)?.name?.value ?? '';

jest.mock('@/lib/mikro/funcs', () => ({
  useQuery: (document: {definitions: readonly {name?: {value: string}}[]}, options: {variables: Record<string, unknown>; skip?: boolean}) => ({
    data: options.skip ? undefined : ANSWERS[operationName(document)]?.(options.variables),
    loading: false,
    error: undefined,
  }),
}));
jest.mock('@/lib/mikro/media/useMediaUrl', () => ({useMikroClient: () => ({})}));
jest.mock('@/lib/datalayer/useDatalayer', () => ({useDatalayer: () => ({own: 'http://datalayer', reached: 'http://datalayer'})}));
jest.mock('@/components/mikro/SnapshotImage', () => {
  const {Text} = jest.requireActual<typeof import('react-native')>('react-native');
  return {SnapshotImage: ({snapshot}: {snapshot?: {store: {key: string}} | null}) => <Text>{`picture ${snapshot?.store.key ?? 'none'}`}</Text>};
});

const ROWS = [
  {area: 10, label: 'a'},
  {area: 2.5, label: 'b'},
  {area: null, label: 'c'},
  {area: 40, label: 'd'},
];
jest.mock('@/lib/mikro/tables/parquet', () => ({
  tableReader: () => ({
    rowCount: async () => ROWS.length,
    read: async ({columns, rowStart = 0, rowEnd}: {columns?: string[]; rowStart?: number; rowEnd?: number} = {}) =>
      ROWS.slice(rowStart, rowEnd).map(row => (columns ? Object.fromEntries(columns.map(column => [column, row[column as 'area']])) : row)),
  }),
}));

const blok = (source: string) => normalizeBlokComponentTree([parseBsx(source).tree]).roots;

const settle = () => act(async () => new Promise<void>(resolve => setTimeout(resolve, 50)));

const pressableLabelled = (renderer: ReactTestRenderer, label: string): ReactTestInstance =>
  renderer.root.find(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === label);

describe('a MikroScene on the phone', () => {
  const scene = blok(
    `<Blok kind="custom" context="panel">
      <MikroScene value={args.scene} bind={selected} bindWorld={world} onSelect={self.segment(annotation: event.annotation, lens: event.lens)}>
        <MikroSceneViewport height="10rem" />
        <MikroSceneLayers />
        <MikroSceneAnnotations />
        <MikroSceneProbe />
      </MikroScene>
    </Blok>`,
  );
  const args = {args: {scene: {object: 's1', __identifier: '@mikro/scene'}}};

  it('lists its layers and shapes, shows its last picture, and writes its world', async () => {
    const {renderer, store} = await renderBlok(scene, args);
    await settle();
    const shown = shownTexts(renderer.root);
    expect(shown).toEqual(expect.arrayContaining(['picture none', 'DAPI', 'Intensity · whole', 'Nuclei', 'nucleus 1', 'Point']));
    expect(shown.join(' ')).toMatch(/3D view opens in Orkestrator/);
    // The layers in their order.
    expect(shown.indexOf('DAPI')).toBeLessThan(shown.indexOf('Annotation · Nuclei'));
    expect(store.getState().runtimePathValues.world).toEqual({object: 'w1', __identifier: '@mikro/coordinatesystem'});
  });

  it('selects a shape pressed in the list: the binding holds it, and onSelect runs with it and the data lens', async () => {
    const dispatchAction = jest.fn(async (_action: unknown) => undefined);
    const {renderer, store} = await renderBlok(scene, args, {dispatchAction});
    await settle();

    await act(async () => pressableLabelled(renderer, 'Select nucleus 1').props.onPress());
    const annotation = {__identifier: '@mikro/annotation', object: 'a1'};
    const lens = {__identifier: '@mikro/arraylens', object: 'lens-1'};
    expect(store.getState().runtimePathValues.selected).toEqual({annotation, lens});
    expect(dispatchAction).toHaveBeenCalledTimes(1);
    expect(dispatchAction.mock.calls[0][0]).toEqual({dependency: 'self', operation: 'segment', arguments: {annotation, lens}});

    await act(async () => pressableLabelled(renderer, 'Deselect nucleus 1').props.onPress());
    expect(store.getState().runtimePathValues.selected).toBeNull();
  });

  it('says so in its place without mikro, reading nothing', async () => {
    mockMikroReady = false;
    try {
      const {renderer} = await renderBlok(scene, args);
      expect(shownTexts(renderer.root)).toEqual(['Mikro is not available.']);
    } finally {
      mockMikroReady = true;
    }
  });
});

describe("a TableDataset's readers on the phone", () => {
  const args = {args: {table: {object: 't1', __identifier: '@mikro/tabledataset'}}};

  it('write its columns in order, a page of its rows filtered and sorted, and one column\'s spread', async () => {
    const tree = blok(
      `<Blok kind="custom" context="panel">
        <TableColumns value={args.table} bind={cols} />
        <TableRows value={args.table} columns={["label"]} where={[{"column": "area", "op": "gt", "value": 2}]} orderBy="area" descending={true} limit={2} bind={rows} />
        <ColumnStat value={args.table} column="area" bind={stat} />
      </Blok>`,
    );
    const {store} = await renderBlok(tree, args);
    await settle();
    const values = store.getState().runtimePathValues as Record<string, {status: string; data: unknown}>;
    expect((values.cols.data as {name: string}[]).map(column => column.name)).toEqual(['area', 'label']);
    expect(values.rows).toMatchObject({status: 'ready', data: {rows: [{label: 'd'}, {label: 'a'}], total: 3}});
    expect(values.stat).toMatchObject({status: 'ready', data: {rows: 4, nonNull: 3, min: 2.5, max: 40, distinct: null}});
  });

  it('pages without a condition by reading just the page, the total from the footer', async () => {
    const tree = blok('<Blok kind="custom" context="panel"><TableRows value={args.table} limit={2} offset={1} bind={rows} /></Blok>');
    const {store} = await renderBlok(tree, args);
    await settle();
    expect((store.getState().runtimePathValues as Record<string, unknown>).rows).toMatchObject({
      data: {rows: [{area: 2.5, label: 'b'}, {area: null, label: 'c'}], total: 4},
    });
  });

  it('draw a histogram, and say which column a table lacks', async () => {
    const tree = blok(
      `<Blok kind="custom" context="panel">
        <ColumnHistogram value={args.table} column="area" bins={3} />
        <ColumnHistogram value={args.table} column="volume" />
      </Blok>`,
    );
    const {renderer} = await renderBlok(tree, args);
    await settle();
    const shown = shownTexts(renderer.root);
    expect(shown).toEqual(expect.arrayContaining(['2.5', '40', 'The table "nuclei" has no column "volume".']));
    // Two numbers in the first third (2.5, 10), one in the last (40).
    const bars = renderer.root.findAll(
      node => (node.type as unknown) === 'View' && typeof node.props.accessibilityLabel === 'string' && /^\d+$/.test(node.props.accessibilityLabel),
    );
    expect(bars.map(bar => bar.props.accessibilityLabel)).toEqual(['2', '0', '1']);
  });
});
