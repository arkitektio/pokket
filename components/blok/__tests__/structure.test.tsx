import {describe, expect, it, jest} from '@jest/globals';
import {ApolloClient, ApolloLink, InMemoryCache, Observable, type Operation} from '@apollo/client';
import * as React from 'react';
import {Text as RNText} from 'react-native';
import {act, type ReactTestInstance, type ReactTestRenderer} from 'react-test-renderer';
import {renderBlok, shownTexts, textAt} from '../testing';

jest.mock('sonner-native', () => ({toast: {info: jest.fn(), error: jest.fn()}}));
jest.mock('@rn-primitives/slot', () => {
  const {Pressable, Text, View} = jest.requireActual<typeof import('react-native')>('react-native');
  return {Pressable, Text, View};
});
jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0})}));

/**
 * structure@1: the picker asks its author's query on the service it names,
 * or the source that lists the structure; it writes a structure reference,
 * waits for what its query cannot do without, and lets the user lift what
 * only narrows it. The display names the object as its source does; the
 * viewer opens what the phone can and says so otherwise.
 *
 * The services are Apollo clients over a link that answers here: nothing
 * leaves the test.
 */

type Answer = (operation: Operation) => Record<string, unknown>;

const mockServices: Record<string, {client: ApolloClient<unknown>}> = {};
const mockShowDetail = jest.fn<(route: string) => void>();

jest.mock('@/lib/arkitekt/hooks', () => ({
  ...jest.requireActual<Record<string, unknown>>('@/lib/arkitekt/hooks'),
  useArkitektStore: <T,>(selector: (state: {connection: {serviceMap: typeof mockServices}}) => T) =>
    selector({connection: {serviceMap: mockServices}}),
}));
jest.mock('@/lib/navigation', () => ({showDetail: (route: string) => mockShowDetail(route)}));
// The viewer's mikro reads: the dataset's last picture, drawn as its key.
jest.mock('@/lib/mikro/funcs', () => ({
  useQuery: (_document: unknown, options: {variables: {id: string}}) => ({
    data: {arrayDataset: {latestSnapshot: {id: `snap-${options.variables.id}`, store: {key: `pictures/${options.variables.id}.png`}}}},
  }),
}));
jest.mock('@/components/mikro/SnapshotImage', () => {
  const {Text} = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SnapshotImage: ({snapshot}: {snapshot?: {store: {key: string}} | null}) => <Text>{`picture ${snapshot?.store.key ?? 'none'}`}</Text>,
  };
});

/** A service whose every answer is `answer`'s, recording what it was asked. */
const serve = (service: string, answer: Answer): jest.Mock<Answer> => {
  const asked = jest.fn(answer);
  mockServices[service] = {
    client: new ApolloClient({
      cache: new InMemoryCache(),
      link: new ApolloLink(operation => Observable.of({data: asked(operation)})),
    }),
  };
  return asked;
};

const settle = () => act(async () => new Promise<void>(resolve => setTimeout(resolve, 300)));

const pressableWith = (renderer: ReactTestRenderer, label: string): ReactTestInstance =>
  renderer.root.find(
    node => typeof node.props.onPress === 'function' && typeof node.type !== 'string' && shownTexts(node).includes(label),
  );

const QUERY = `query Lenses($dataset: ID, $search: String, $values: [ID!]) {
  options: lenses(filters: {dataset: $dataset, search: $search, ids: $values}) { value: id label: name }
}`;

const picker = (props: Record<string, unknown>[], identifier = '@mikro/arraylens') => [
  {
    id: 'root',
    component: 'Html',
    children: [
      {
        id: 'picker',
        component: 'StructurePicker',
        props: [
          {key: 'identifier', static_value: identifier},
          {key: 'bind', dynamic_value: {path: 'picked'}},
          {
            key: 'onChange',
            agent_call: {dependency: 'self', operation: 'chosen', arguments: [{key: 'lens', value_path: 'event.value'}]},
          },
          ...props,
        ],
      },
      textAt('shown', 'picked.object'),
    ],
  },
];

describe('StructurePicker', () => {
  it("runs its author's query on the service it names, and writes the structure picked", async () => {
    const asked = serve('mikro', operation =>
      operation.variables.values
        ? {options: [{value: 'l2', label: 'Second lens'}]}
        : {options: [{value: 'l1', label: 'First lens'}, {value: 'l2', label: 'Second lens', description: 'Max projection'}]},
    );
    const dispatchAction = jest.fn(() => undefined);
    const {renderer} = await renderBlok(picker([{key: 'query', static_value: QUERY}, {key: 'ward', static_value: 'mikro'}]), {}, {dispatchAction});
    expect(asked).not.toHaveBeenCalled();

    await act(async () => pressableWith(renderer, 'Pick a arraylens…').props.onPress());
    await settle();
    expect(asked.mock.calls[0][0].variables).toEqual({dataset: null});
    expect(shownTexts(renderer.root)).toEqual(expect.arrayContaining(['First lens', 'Second lens', 'Max projection']));

    await act(async () => pressableWith(renderer, 'Second lens').props.onPress());
    await settle();
    expect(dispatchAction).toHaveBeenCalledWith(
      {dependency: 'self', operation: 'chosen', arguments: {lens: {object: 'l2', __identifier: '@mikro/arraylens'}}},
      expect.anything(),
    );
    // The field names its value by asking for it by id.
    expect(asked.mock.calls.at(-1)?.[0].variables).toEqual({dataset: null, values: ['l2']});
    expect(shownTexts(renderer.root)).toEqual(expect.arrayContaining(['Second lens', 'l2']));

    await act(async () => renderer.root.findByProps({accessibilityLabel: 'Clear'}).props.onPress());
    expect(dispatchAction).toHaveBeenLastCalledWith(
      {dependency: 'self', operation: 'chosen', arguments: {lens: null}},
      expect.anything(),
    );
    expect(shownTexts(renderer.root)).not.toContain('l2');
  });

  it('narrows by a nullable variable while it has a value, and the user may lift it', async () => {
    const asked = serve('mikro', () => ({options: []}));
    const {renderer} = await renderBlok(
      picker([{key: 'query', static_value: QUERY}, {key: 'ward', static_value: 'mikro'}]),
      {dataset: {object: '7', __identifier: '@mikro/arraydataset'}},
    );
    await act(async () => pressableWith(renderer, 'Pick a arraylens…').props.onPress());
    await settle();
    // A structure held there goes as its id.
    expect(asked.mock.calls.at(-1)?.[0].variables).toEqual({dataset: '7'});
    expect(shownTexts(renderer.root)).toContain('No arraylens here is narrowed by dataset.');

    await act(async () => pressableWith(renderer, 'Show all').props.onPress());
    await settle();
    expect(asked.mock.calls.at(-1)?.[0].variables).toEqual({dataset: null});
  });

  it('waits for a variable its query declares non-null', async () => {
    const asked = serve('mikro', () => ({options: []}));
    const strict = QUERY.replace('$dataset: ID,', '$dataset: ID!,');
    const {renderer} = await renderBlok(picker([{key: 'query', static_value: strict}, {key: 'ward', static_value: 'mikro'}]));
    expect(shownTexts(renderer.root)).toContain('Waiting for: dataset');
    expect(asked).not.toHaveBeenCalled();
  });

  it('refuses a document that is not one query, without sending it', async () => {
    const asked = serve('mikro', () => ({options: []}));
    const mutation = 'mutation Wipe($search: String) { options: wipe(search: $search) { value: id label: name } }';
    const {renderer} = await renderBlok(picker([{key: 'query', static_value: mutation}, {key: 'ward', static_value: 'mikro'}]));
    await act(async () => pressableWith(renderer, 'Pick a arraylens…').props.onPress());
    await settle();
    expect(asked).not.toHaveBeenCalled();
    expect(shownTexts(renderer.root)).toContain('A blok reads, it never runs a mutation: a change goes through a task.');
  });

  it('asks the source that lists the structure when it names no query', async () => {
    const asked = serve('lok', operation => ({
      options: operation.variables.search === 'ann' ? [{value: 'u1', label: 'anna'}] : [{value: 'u1', label: 'anna'}, {value: 'u2', label: 'bob'}],
    }));
    const {renderer} = await renderBlok(picker([], '@lok/user'));
    await act(async () => pressableWith(renderer, 'Pick a user…').props.onPress());
    await settle();
    expect(asked.mock.calls[0][0].operationName).toBe('UserOptions');
    expect(shownTexts(renderer.root)).toEqual(expect.arrayContaining(['anna', 'bob']));

    const search = renderer.root.find(node => typeof node.props.onChangeText === 'function' && typeof node.type !== 'string');
    await act(async () => search.props.onChangeText('ann'));
    await settle();
    expect(asked.mock.calls.at(-1)?.[0].variables).toEqual({search: 'ann'});
    expect(shownTexts(renderer.root)).not.toContain('bob');
  });

  it('says so for a structure nothing lists and no query names', async () => {
    const {renderer} = await renderBlok(picker([]));
    expect(shownTexts(renderer.root)).toContain('No picker available for @mikro/arraylens.');
  });
});

const single = (component: string, props: Record<string, unknown>[]) => [
  {id: 'root', component: 'Html', children: [{id: 'it', component, props}]},
];

describe('StructureDisplay', () => {
  it('names the object as the source that lists it does, and opens its page', async () => {
    serve('mikro', () => ({arrayDatasets: [{__typename: 'ArrayDataset', id: '7', name: 'Cells'}]}));
    const value = {object: '7', __identifier: '@mikro/arraydataset'};
    const {renderer} = await renderBlok(
      single('StructureDisplay', [{key: 'value', static_value: value}, {key: 'link', static_value: true}]),
    );
    await settle();
    expect(shownTexts(renderer.root)).toEqual(expect.arrayContaining(['Cells', 'Dataset']));
    await act(async () => renderer.root.findByProps({accessibilityRole: 'link'}).props.onPress());
    expect(mockShowDetail).toHaveBeenCalledWith('/mikro/arraydatasets/7');
  });

  it('shows its kind and id for what nothing lists, inline as one line', async () => {
    const value = {object: '3', __identifier: '@kabinet/release'};
    const {renderer} = await renderBlok(single('StructureDisplay', [{key: 'value', static_value: value}, {key: 'variant', static_value: 'inline'}]));
    expect(renderer.root.findAllByType(RNText).map(node => shownTexts(node)[0])).toContain('release 3');
  });

  it('shows its emptyText while there is none', async () => {
    const {renderer} = await renderBlok(single('StructureDisplay', [{key: 'emptyText', static_value: 'Pick one first'}]));
    expect(shownTexts(renderer.root)).toContain('Pick one first');
  });
});

describe('StructureViewer', () => {
  it("opens a mikro dataset as its last picture, filling the viewer's box", async () => {
    serve('mikro', () => ({}));
    const value = {object: '7', __identifier: '@mikro/arraydataset'};
    const {renderer} = await renderBlok(single('StructureViewer', [{key: 'value', static_value: value}, {key: 'height', static_value: '10rem'}]));
    const box = renderer.root.find(node => typeof node.props.onLayout === 'function' && typeof node.type !== 'string');
    await act(async () => box.props.onLayout({nativeEvent: {layout: {x: 0, y: 0, width: 300, height: 160}}}));
    expect(shownTexts(renderer.root)).toContain('picture pictures/7.png');
  });

  it('says so for a structure the phone cannot open', async () => {
    const value = {object: '1', __identifier: '@kraph/graph'};
    const {renderer} = await renderBlok(single('StructureViewer', [{key: 'value', static_value: value}]));
    expect(shownTexts(renderer.root)).toContain('No viewer available for @kraph/graph.');
  });
});
