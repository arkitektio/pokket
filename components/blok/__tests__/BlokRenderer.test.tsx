import {describe, expect, it, jest} from '@jest/globals';
import * as React from 'react';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import BlokRenderer from '../BlokRenderer';

jest.mock('sonner-native', () => ({toast: {info: jest.fn(), error: jest.fn()}}));
// Ships untranspiled JSX; `asChild` is never used by bloks.
jest.mock('@rn-primitives/slot', () => {
  const {Pressable, Text, View} = jest.requireActual<typeof import('react-native')>('react-native');
  return {Pressable, Text, View};
});

/** A small blok: a card with a heading bound to state, a list, a button and a component pokket lacks. */
const tree = [
  {
    id: 'root',
    component: 'Card',
    props: [{key: 'children', static_value: ['title', 'list', 'run', 'chart']}],
  },
  {id: 'title', component: 'Heading', props: [{key: 'children', dynamic_value: {path: 'self/stage/name'}}]},
  {
    id: 'list',
    component: 'foreach',
    props: [{key: 'items', dynamic_value: {path: 'items'}}, {key: 'let', static_value: 'item'}],
    children: [{id: 'item', component: 'Text', props: [{key: 'children', dynamic_value: {path: 'item/label'}}]}],
  },
  {
    id: 'run',
    component: 'Button',
    props: [
      {key: 'children', static_value: 'Home stage'},
      {key: 'onClick', agent_call: {dependency: 'self', operation: 'home', arguments: [{key: 'speed', value_literal: '2'}]}},
    ],
  },
  {id: 'chart', component: 'Chart', props: []},
];

const demoState = {self: {stage: {name: 'Stage 1'}}, items: [{label: 'first'}, {label: 'second'}]};

const texts = (renderer: ReactTestRenderer): string[] =>
  renderer.root
    .findAll(node => (node.type as unknown) === 'Text')
    .flatMap(node => node.children.filter((child): child is string => typeof child === 'string'));

describe('BlokRenderer', () => {
  it('renders a tree from its demo state and dispatches agent calls', async () => {
    const dispatchAction = jest.fn(() => undefined);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<BlokRenderer uiComponents={tree} initialState={demoState} dispatchAction={dispatchAction} />);
    });

    const shown = texts(renderer).join(' ');
    expect(shown).toContain('Stage 1');
    expect(shown).toContain('first');
    expect(shown).toContain('second');
    expect(shown).toContain('Home stage');
    // A component the phone has no rendering for degrades to a card, not a crash.
    expect(shown).toContain('Unknown component');

    // The pressable and the host view under it both carry `onPress`: the outermost is the button.
    const [button] = renderer.root.findAll(
      node => typeof node.props.onPress === 'function' && texts({root: node} as never).includes('Home stage'),
    );
    await act(async () => {
      button.props.onPress();
    });

    expect(dispatchAction).toHaveBeenCalledTimes(1);
    const [action] = dispatchAction.mock.calls[0] as unknown as [{dependency: string; operation: string; arguments?: Record<string, unknown>}];
    expect(action.dependency).toBe('self');
    expect(action.operation).toBe('home');
  });
});
