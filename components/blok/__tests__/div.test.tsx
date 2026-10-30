import {describe, expect, it, jest} from '@jest/globals';
import * as React from 'react';
import {act, create, type ReactTestInstance, type ReactTestRenderer} from 'react-test-renderer';
import BlokRenderer from '../BlokRenderer';

jest.mock('sonner-native', () => ({toast: {info: jest.fn(), error: jest.fn()}}));
jest.mock('@rn-primitives/slot', () => {
  const {Pressable, Text, View} = jest.requireActual<typeof import('react-native')>('react-native');
  return {Pressable, Text, View};
});

/**
 * `<div className="italic">a<span>b</span><p>c</p></div>`, as the web lays it
 * out: the loose `a` arrives as an implicit `span` node.
 */
const tree = [
  {
    id: 'root',
    component: 'div',
    props: [{key: 'className', static_value: 'italic gap-2 md:font-bold'}],
    children: [
      {id: 'root.0', component: 'span', props: [{key: 'text', static_value: 'a'}]},
      {id: 'b', component: 'span', props: [{key: 'text', static_value: 'b'}]},
      {id: 'c', component: 'p', props: [{key: 'text', static_value: 'c'}]},
    ],
  },
];

const isText = (node: ReactTestInstance): boolean => (node.type as unknown) === 'Text';

/** The div's own host view. */
const divOf = (renderer: ReactTestRenderer): ReactTestInstance =>
  renderer.root.find(node => (node.type as unknown) === 'View' && String(node.props.className).includes('italic'));

const textOf = (node: ReactTestInstance): string =>
  node.children.map(child => (typeof child === 'string' ? child : textOf(child))).join('');

describe('div', () => {
  it('flows a run of inline children on one line and stacks the rest, as the web does', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<BlokRenderer uiComponents={tree} initialState={{}} dispatchAction={() => undefined} />);
    });

    // The outermost texts are the lines: the span run shares one, the paragraph has its own.
    const lines = divOf(renderer).findAll(node => isText(node) && !hasTextAncestor(node));
    expect(lines.map(textOf)).toEqual(['ab', 'c']);
  });

  it("hands its text classes to the text inside it, and nothing else", async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<BlokRenderer uiComponents={tree} initialState={{}} dispatchAction={() => undefined} />);
    });

    const paragraph = divOf(renderer).findAll(node => isText(node) && textOf(node) === 'c').at(-1);
    const className = String(paragraph?.props.className);
    expect(className).toContain('italic');
    expect(className).toContain('md:font-bold');
    expect(className).not.toContain('gap-2');
  });
});

const hasTextAncestor = (node: ReactTestInstance): boolean => {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (isText(parent)) return true;
  }
  return false;
};
