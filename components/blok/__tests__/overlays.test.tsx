import {afterEach, describe, expect, it, jest} from '@jest/globals';
import * as React from 'react';
import {Modal, View} from 'react-native';
import {act, create, type ReactTestInstance, type ReactTestRenderer} from 'react-test-renderer';
import type {BlokResolvedAgentCall} from '@arkitektio/bsx/runtime';
import BlokRenderer from '../BlokRenderer';
import {shownTexts, text} from '../testing';

jest.mock('sonner-native', () => ({toast: {info: jest.fn(), error: jest.fn()}}));

/**
 * Popover and Tooltip, anchored to their trigger (`@rn-primitives`): a press
 * on the trigger measures it and opens the content beside it, a press outside
 * closes it, and the root's open state and `onOpenChange` are the catalog's.
 */

/** Where every host view says it is: the trigger the content anchors to. */
const TRIGGER_AT = {x: 0, y: 0, width: 120, height: 40, pageX: 30, pageY: 200};

type Measure = (callback: (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void) => void;

// Under jest, React Native's views are mocks whose `measure` does nothing:
// here every view measures as the trigger does.
jest
  .spyOn(View.prototype as unknown as {measure: Measure}, 'measure')
  .mockImplementation(callback =>
    callback(TRIGGER_AT.x, TRIGGER_AT.y, TRIGGER_AT.width, TRIGGER_AT.height, TRIGGER_AT.pageX, TRIGGER_AT.pageY),
  );

const opened = (event: string) => ({
  key: 'onOpenChange',
  agent_call: {dependency: 'self', operation: event, arguments: [{key: 'open', value_path: 'event.value'}]},
});

const overlay = (kind: 'Popover' | 'Tooltip', props: Record<string, unknown>[] = []) => [
  {
    id: 'root',
    component: 'Html',
    children: [
      {
        id: 'overlay',
        component: kind,
        props: [opened('changed'), ...props],
        children: [
          {id: 'trigger', component: `${kind}Trigger`, props: [{key: 'label', static_value: 'More'}]},
          {
            id: 'content',
            component: `${kind}Content`,
            props: [{key: 'side', static_value: 'left'}, {key: 'className', static_value: 'w-40'}],
            children: [text('hint', 'The details')],
          },
        ],
      },
    ],
  },
];

// Unmounted after each test: the primitives move accessibility focus on a timer.
const mounted: ReactTestRenderer[] = [];
afterEach(() => {
  act(() => mounted.splice(0).forEach(renderer => renderer.unmount()));
});

const render = async (tree: unknown[], dispatchAction = jest.fn((_action: BlokResolvedAgentCall) => undefined)) => {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<BlokRenderer uiComponents={tree} initialState={{}} dispatchAction={dispatchAction} />);
  });
  mounted.push(renderer);
  return {renderer, dispatchAction};
};

const modalOf = (renderer: ReactTestRenderer): ReactTestInstance => renderer.root.findByType(Modal);

const pressableWith = (renderer: ReactTestRenderer, label: string): ReactTestInstance =>
  renderer.root.find(
    node => typeof node.props.onPress === 'function' && typeof node.type !== 'string' && shownTexts(node).includes(label),
  );

/** The press-anywhere-to-close layer the content sits on. */
const backdropOf = (renderer: ReactTestRenderer): ReactTestInstance =>
  modalOf(renderer).find(node => typeof node.props.onPress === 'function' && node.props.accessible === false);

describe.each(['Popover', 'Tooltip'] as const)('%s', kind => {
  it('opens beside its trigger on a press, and closes on a press outside', async () => {
    const {renderer, dispatchAction} = await render(overlay(kind));
    expect(modalOf(renderer).props.visible).toBe(false);
    expect(shownTexts(renderer.root)).not.toContain('The details');

    await act(async () => pressableWith(renderer, 'More').props.onPress());
    expect(modalOf(renderer).props.visible).toBe(true);
    expect(shownTexts(modalOf(renderer))).toContain('The details');
    expect(dispatchAction.mock.calls.map(([action]) => action.arguments)).toEqual([{open: true}]);

    await act(async () => backdropOf(renderer).props.onPress());
    expect(modalOf(renderer).props.visible).toBe(false);
    expect(dispatchAction.mock.calls.map(([action]) => action.arguments)).toEqual([{open: true}, {open: false}]);
  });

  it('places its content by the trigger it measured, with the catalog classes', async () => {
    const {renderer} = await render(overlay(kind));
    await act(async () => pressableWith(renderer, 'More').props.onPress());
    const content = modalOf(renderer).find(node => typeof node.props.onLayout === 'function' && typeof node.type !== 'string');
    // Laid out, the content is placed against the trigger (no longer parked off screen).
    await act(async () => content.props.onLayout({nativeEvent: {layout: {x: 0, y: 0, width: 160, height: 50}}}));
    const placed = modalOf(renderer).find(node => typeof node.props.onLayout === 'function' && typeof node.type !== 'string');
    const style = Object.assign({}, ...[placed.props.style].flat(3).filter(Boolean)) as {top?: number; opacity?: number};
    expect(style.opacity).not.toBe(0);
    // `left` is not a side the primitives place: a popover falls back below, a tooltip above.
    expect(style.top).toBe(kind === 'Popover' ? TRIGGER_AT.pageY + TRIGGER_AT.height + 4 : TRIGGER_AT.pageY - 50 - 4);
    expect(String(placed.props.className)).toContain('w-40');
  });

  it('opens on mount with defaultOpen, without reporting a change nobody made', async () => {
    const {renderer, dispatchAction} = await render(overlay(kind, [{key: 'defaultOpen', static_value: true}]));
    expect(modalOf(renderer).props.visible).toBe(true);
    expect(dispatchAction).not.toHaveBeenCalled();
  });

  it('stays as a controlled open says, and reports the press that would close it', async () => {
    const {renderer, dispatchAction} = await render(overlay(kind, [{key: 'open', static_value: true}]));
    expect(modalOf(renderer).props.visible).toBe(true);
    await act(async () => backdropOf(renderer).props.onPress());
    expect(modalOf(renderer).props.visible).toBe(true);
    expect(dispatchAction.mock.calls.map(([action]) => action.arguments)).toEqual([{open: false}]);
  });
});
