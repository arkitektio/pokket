import {describe, expect, it, jest} from '@jest/globals';
import {act} from 'react-test-renderer';
import {foreachItemIds} from '@arkitektio/bsx/renderer/bloks/control';
import {renderBlok, shownTexts, text, textAt} from '../testing';

jest.mock('sonner-native', () => ({toast: {info: jest.fn(), error: jest.fn(), success: jest.fn()}}));
jest.mock('@rn-primitives/slot', () => {
  const {Pressable, Text, View} = jest.requireActual<typeof import('react-native')>('react-native');
  return {Pressable, Text, View};
});

/**
 * The language of base@2 rendered end to end, after orkestrator's
 * `bloks/flow.test.tsx`: branches, loops, the `when` guard, and the async
 * model (suspense, fallback, error, stale, unbound dependencies).
 */

const path = (value: string) => ({dynamic_value: {path: value}});

describe('if / else', () => {
  const tree = [
    {
      id: 'if',
      component: 'if',
      props: [{key: 'when', ...path('run.failed')}],
      children: [
        text('failed', 'Failed'),
        {id: 'else-done', component: 'else', props: [{key: 'when', ...path('run.done')}], children: [text('done', 'Done')]},
        {id: 'else', component: 'else', children: [text('running', 'Running')]},
      ],
    },
  ];

  it('renders the then-branch, an else-if, or the last else', async () => {
    const {renderer, store} = await renderBlok(tree, {run: {failed: false, done: false}});
    expect(shownTexts(renderer.root)).toEqual(['Running']);
    act(() => store.getState().setRuntimeValue('run.done', true));
    expect(shownTexts(renderer.root)).toEqual(['Done']);
    act(() => store.getState().setRuntimeValue('run.failed', true));
    expect(shownTexts(renderer.root)).toEqual(['Failed']);
  });

  it('never reads an inactive branch: a pending read there suspends nothing', async () => {
    const guarded = [
      {
        id: 'if',
        component: 'if',
        props: [{key: 'when', ...path('flag')}],
        children: [textAt('mode', 'deps.robot.arm.mode'), {id: 'else', component: 'else', children: [text('off', 'Off')]}],
      },
    ];
    const {renderer} = await renderBlok(guarded, {flag: false}, {statuses: {'deps.robot.arm': {status: 'pending'}}});
    expect(shownTexts(renderer.root)).toEqual(['Off']);
    expect(renderer.root.findAll(node => String(node.props.testID).startsWith('blok-pending-'))).toHaveLength(0);
  });
});

describe('the when guard', () => {
  it('guards the one component it is on', async () => {
    const tree = [
      {
        id: 'card',
        component: 'Column',
        children: [
          {id: 'failed', component: 'Text', props: [{key: 'text', static_value: 'Move failed'}, {key: 'when', ...path('move.failed')}]},
          text('always', 'Always'),
        ],
      },
    ];
    const {renderer, store} = await renderBlok(tree, {move: {failed: false}});
    expect(shownTexts(renderer.root)).toEqual(['Always']);
    act(() => store.getState().setRuntimeValue('move.failed', true));
    expect(shownTexts(renderer.root)).toEqual(['Move failed', 'Always']);
  });
});

describe('match', () => {
  const tree = [
    {
      id: 'match',
      component: 'match',
      props: [{key: 'value', ...path('job.status')}],
      children: [
        {id: 'running', component: 'case', props: [{key: 'is', static_value: 'running'}], children: [text('t-running', 'Running')]},
        {id: 'three', component: 'case', props: [{key: 'is', static_value: 3}], children: [text('t-three', 'Three')]},
        {id: 'default', component: 'default', children: [text('t-idle', 'Idle')]},
      ],
    },
  ];

  it('renders the first case equal to the value, else the default', async () => {
    const {renderer, store} = await renderBlok(tree, {job: {status: 'running'}});
    expect(shownTexts(renderer.root)).toEqual(['Running']);
    act(() => store.getState().setRuntimeValue('job.status', 3));
    expect(shownTexts(renderer.root)).toEqual(['Three']);
    // A literal is a literal: "3" is not 3.
    act(() => store.getState().setRuntimeValue('job.status', '3'));
    expect(shownTexts(renderer.root)).toEqual(['Idle']);
  });
});

describe('foreach', () => {
  it('renders once per item, keyed by key', async () => {
    const tree = [
      {
        id: 'loop',
        component: 'foreach',
        props: [
          {key: 'items', ...path('args.positions')},
          {key: 'let', static_value: 'p', declares_value: 'p'},
          {key: 'key', ...path('p.id')},
        ],
        children: [textAt('name', 'p.name')],
      },
    ];
    const {renderer} = await renderBlok(tree, {args: {positions: [{id: 'a', name: 'Home'}, {id: 'b', name: 'Dock'}]}});
    expect(shownTexts(renderer.root)).toEqual(['Home', 'Dock']);
  });

  it('iterates a computed list, its items read by value', async () => {
    const tree = [
      {
        id: 'loop',
        component: 'foreach',
        props: [
          {key: 'items', util_call: {operation: 'list.reverse', arguments: [{key: 'value', value_path: 'xs'}]}},
          {key: 'let', static_value: 'x', declares_value: 'x'},
        ],
        children: [textAt('x', 'x')],
      },
    ];
    const {renderer} = await renderBlok(tree, {xs: ['one', 'two']});
    expect(shownTexts(renderer.root)).toEqual(['two', 'one']);
  });

  it('takes its item ids from the key, or from the position without one', () => {
    expect(foreachItemIds('loop', 2, ['a', 'b'])).toEqual(['loop@a', 'loop@b']);
    expect(foreachItemIds('loop', 2, null)).toEqual(['loop@#0', 'loop@#1']);
    expect(foreachItemIds('loop', 2, ['a', 'a'])).toEqual(['loop@a', 'loop@a#1']);
  });
});

describe('suspense', () => {
  const tree = [
    {
      id: 'boundary',
      component: 'suspense',
      children: [
        {id: 'fallback', component: 'fallback', children: [text('loading', 'Loading')]},
        {id: 'error', component: 'error', children: [textAt('why', 'error.message')]},
        textAt('mode', 'deps.robot.arm.mode'),
      ],
    },
  ];

  it('shows its fallback while a read inside is pending, then the body', async () => {
    const {renderer, store} = await renderBlok(tree, {deps: {robot: {arm: {mode: 'idle'}}}}, {statuses: {'deps.robot.arm': {status: 'pending'}}});
    expect(shownTexts(renderer.root)).toContain('Loading');
    act(() => store.getState().setStatus('deps.robot.arm', {status: 'ready'}));
    expect(shownTexts(renderer.root)).toEqual(['idle']);
  });

  it('shows its error, with the error, when a read inside failed', async () => {
    const {renderer} = await renderBlok(tree, {}, {statuses: {'deps.robot.arm': {status: 'failed', error: 'No access'}}});
    expect(shownTexts(renderer.root)).toContain('No access');
    expect(shownTexts(renderer.root)).not.toContain('Loading');
  });

  it('never suspends on a stale value: it renders, marked stale', async () => {
    const {renderer} = await renderBlok(tree, {deps: {robot: {arm: {mode: 'idle'}}}}, {statuses: {'deps.robot.arm': {status: 'stale'}}});
    expect(shownTexts(renderer.root)).toEqual(['idle']);
  });

  it('keeps its body mounted while it suspends: a component inside keeps its own state', async () => {
    const tabs = [
      {
        id: 'boundary',
        component: 'suspense',
        children: [
          {
            id: 'tabs',
            component: 'Tabs',
            props: [{key: 'defaultValue', static_value: 'a'}],
            children: [
              {
                id: 'list',
                component: 'TabsList',
                children: [
                  {id: 'ta', component: 'TabsTrigger', props: [{key: 'value', static_value: 'a'}, {key: 'label', static_value: 'Tab A'}]},
                  {id: 'tb', component: 'TabsTrigger', props: [{key: 'value', static_value: 'b'}, {key: 'label', static_value: 'Tab B'}]},
                ],
              },
              {id: 'ca', component: 'TabsContent', props: [{key: 'value', static_value: 'a'}], children: [text('a', 'Content A')]},
              {id: 'cb', component: 'TabsContent', props: [{key: 'value', static_value: 'b'}], children: [textAt('b', 'deps.robot.arm.mode')]},
            ],
          },
        ],
      },
    ];
    const {renderer, store} = await renderBlok(tabs, {deps: {robot: {arm: {mode: 'idle'}}}});
    const [tabB] = renderer.root.findAll(
      node => typeof node.props.onPress === 'function' && shownTexts(node).includes('Tab B'),
    );
    await act(async () => tabB.props.onPress());
    expect(shownTexts(renderer.root)).toContain('idle');
    act(() => store.getState().setStatus('deps.robot.arm', {status: 'pending'}));
    act(() => store.getState().setStatus('deps.robot.arm', {status: 'ready'}));
    // Still on tab B: the body was hidden, never unmounted.
    expect(shownTexts(renderer.root)).toContain('idle');
    expect(shownTexts(renderer.root)).not.toContain('Content A');
  });

  it('without a boundary, a node shows its own skeleton', async () => {
    const {renderer} = await renderBlok([textAt('mode', 'deps.robot.arm.mode')], {}, {statuses: {'deps.robot.arm': {status: 'pending'}}});
    expect(renderer.root.findAll(node => node.props.testID === 'blok-pending-mode' && (node.type as unknown) === 'View')).toHaveLength(1);
  });
});

describe('unbound dependencies', () => {
  it('read as failed (deps.unbound), never as ready null', async () => {
    const tree = [
      {
        id: 'boundary',
        component: 'suspense',
        children: [
          {id: 'error', component: 'error', children: [textAt('code', 'error.code')]},
          textAt('mode', 'deps.robot.arm.mode'),
        ],
      },
    ];
    const {renderer} = await renderBlok(tree, {}, {unboundDependencies: ['robot']});
    expect(shownTexts(renderer.root)).toEqual(['deps.unbound']);
  });
});
