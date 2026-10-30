import {describe, expect, it, jest} from '@jest/globals';
import {act, type ReactTestInstance, type ReactTestRenderer} from 'react-test-renderer';
import type {BlokReadExecutor, BlokResolvedAgentCall, BlokTaskObserver} from '@arkitektio/bsx/runtime';
import {renderBlok, shownTexts, text, textAt} from '../testing';

jest.mock('sonner-native', () => ({toast: {info: jest.fn(), error: jest.fn(), success: jest.fn()}}));
// Ships untranspiled JSX; `asChild` is never used by bloks.
jest.mock('@rn-primitives/slot', () => {
  const {Pressable, Text, View} = jest.requireActual<typeof import('react-native')>('react-native');
  return {Pressable, Text, View};
});

/**
 * The renderer end to end on v2 trees, after orkestrator's
 * `BlokRenderer.test.tsx`, `bloks/events.test.tsx` and `runtime/reads.test.tsx`:
 * the roots, a task call's `into` record, the effects a callback may hold, the
 * declared reads, `viewer`, and a component pokket lacks.
 */

const path = (value: string) => ({dynamic_value: {path: value}});

/** The outermost pressable showing `label`. */
const pressable = (renderer: ReactTestRenderer, label: string): ReactTestInstance => {
  const [found] = renderer.root.findAll(
    node => typeof node.props.onPress === 'function' && shownTexts(node).some(shown => shown.includes(label)),
  );
  if (!found) throw new Error(`Nothing to press shows "${label}".`);
  return found;
};

/** `<Html><Heading>{self.stage.name}</Heading><foreach .../><Button onClick={self.home(speed: 2) into home}>…</Button><Chart/></Html>`. */
const tree = [
  {
    id: 'root',
    component: 'Html',
    children: [
      {id: 'title', component: 'Heading', props: [{key: 'text', ...path('self.stage.name')}]},
      {
        id: 'list',
        component: 'foreach',
        props: [{key: 'items', ...path('items')}, {key: 'let', static_value: 'item', declares_value: 'item'}],
        children: [textAt('item', 'item.label')],
      },
      {
        id: 'run',
        component: 'Button',
        props: [
          {key: 'label', static_value: 'Home stage'},
          {
            key: 'onClick',
            agent_call: {dependency: 'self', operation: 'home', arguments: [{key: 'speed', value_literal: 2}]},
            declares_value: 'home',
          },
        ],
      },
      textAt('status', 'home.status'),
      {id: 'chart', component: 'Chart', props: []},
    ],
  },
];

// `self` reads `deps.self`.
const state = {deps: {self: {stage: {name: 'Stage 1'}}}, items: [{label: 'first'}, {label: 'second'}]};

describe('BlokRenderer', () => {
  it('renders a tree from its data, and a card for a component the phone lacks', async () => {
    const {renderer} = await renderBlok(tree, state);
    const shown = shownTexts(renderer.root).join(' ');
    expect(shown).toContain('Stage 1');
    expect(shown).toContain('first');
    expect(shown).toContain('second');
    expect(shown).toContain('Home stage');
    expect(shown).toContain('Unknown component');
  });

  it('dispatches a task call and writes its into record as the task moves', async () => {
    let observe: BlokTaskObserver | undefined;
    let settle: () => void = () => undefined;
    const dispatchAction = jest.fn((_action: BlokResolvedAgentCall, _component: unknown, observer?: BlokTaskObserver) => {
      observe = observer;
      return new Promise<void>(resolve => (settle = resolve));
    });
    const {renderer, store} = await renderBlok(tree, state, {dispatchAction});

    await act(async () => pressable(renderer, 'Home stage').props.onPress());
    expect(dispatchAction).toHaveBeenCalledTimes(1);
    const [action] = dispatchAction.mock.calls[0];
    expect(action).toEqual({dependency: 'self', operation: 'home', arguments: {speed: 2}});
    expect(store.getState().runtimePathValues.home).toMatchObject({status: 'queued', running: true, args: {speed: 2}});
    // Busy while its task runs: `data-[busy]:` styles it through its `dataSet`.
    expect(pressable(renderer, 'Home stage').props.dataSet).toEqual({busy: ''});

    await act(async () => observe?.({id: 't1', status: 'running', progress: 40}));
    expect(shownTexts(renderer.root)).toContain('running');
    await act(async () => {
      observe?.({end: 'done'});
      settle();
    });
    expect(pressable(renderer, 'Home stage').props.dataSet).toBeUndefined();
    expect(store.getState().runtimePathValues.home).toMatchObject({id: 't1', status: 'done', done: true, progress: 100});
  });

  it('answers the open ask of task through task.answer', async () => {
    const answerTask = jest.fn((_answer: unknown) => undefined);
    const answer = [
      {
        id: 'ok',
        component: 'Button',
        props: [
          {key: 'label', static_value: 'Approve'},
          {
            key: 'onClick',
            util_call: {
              operation: 'task.answer',
              arguments: [{key: 'values', value_dict: [{key: 'approved', value_literal: true}]}],
            },
          },
        ],
      },
    ];
    const {renderer} = await renderBlok(answer, {}, {answerTask});
    await act(async () => pressable(renderer, 'Approve').props.onPress());
    expect(answerTask).toHaveBeenCalledWith({approved: true});
  });

  it('runs its declared queries, and refetches one from a callback', async () => {
    const query = jest.fn<BlokReadExecutor['query']>(async () => ({stats: {mean: 4}}));
    const executor: BlokReadExecutor = {query, subscribe: () => () => undefined};
    const reads = [
      {
        id: 'box',
        component: 'Column',
        children: [
          textAt('mean', 'queries.stats.value.stats.mean'),
          {
            id: 'again',
            component: 'Button',
            props: [
              {key: 'label', static_value: 'Again'},
              {key: 'onClick', util_call: {operation: 'query.refetch', arguments: [{key: 'query', value_literal: 'stats'}]}},
            ],
          },
        ],
      },
    ];
    const {renderer} = await renderBlok(
      reads,
      {},
      {
        queries: [{key: 'stats', service: 'mikro', document: 'query Stats { stats { mean } }', variables: []}],
        readExecutor: executor,
      },
    );
    await act(async () => undefined);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toBe('mikro');
    expect(shownTexts(renderer.root)).toContain('4');

    await act(async () => pressable(renderer, 'Again').props.onPress());
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('refuses a mutation as a declared read, without sending it', async () => {
    const query = jest.fn<BlokReadExecutor['query']>(async () => ({}));
    const {store} = await renderBlok([text('t', 'x')], {}, {
      queries: [{key: 'bad', service: 'mikro', document: 'mutation Bad { delete }', variables: []}],
      readExecutor: {query, subscribe: () => () => undefined},
    });
    await act(async () => undefined);
    expect(query).not.toHaveBeenCalled();
    expect(store.getState().runtimePathValues['queries.bad']).toMatchObject({status: 'failed'});
  });

  it('reads who is looking as viewer', async () => {
    const {renderer} = await renderBlok([textAt('who', 'viewer.user.username')], {}, {
      viewer: {user: {id: 'u1', username: 'ada'}, org: {id: 'o1'}, roles: []},
    });
    expect(shownTexts(renderer.root)).toEqual(['ada']);
  });
});
