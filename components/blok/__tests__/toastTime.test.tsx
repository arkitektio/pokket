import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import * as React from 'react';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {idleTaskRecord, useBlokRuntimeStoreApi, withTaskStatus, type BlokRuntimeStore} from '@arkitektio/bsx/runtime';
import {BlokToastSinkContext, type BlokToastSink} from '../catalog/toast';
import BlokRenderer from '../BlokRenderer';
import {renderBlok, shownTexts} from '../testing';

jest.mock('sonner-native', () => ({toast: {info: jest.fn(), error: jest.fn(), success: jest.fn()}}));
jest.mock('@rn-primitives/slot', () => {
  const {Pressable, Text, View} = jest.requireActual<typeof import('react-native')>('react-native');
  return {Pressable, Text, View};
});

/** orkestrator's `bloks/toast.test.tsx` and `bloks/time.test.tsx`, on v2 trees. */

/** `<Toast task={move}><done>Arrived at {move.args.position}</done><failed>…</failed></Toast>`. */
const toastTree = [
  {
    id: 'toast',
    component: 'Toast',
    props: [{key: 'task', dynamic_value: {path: 'move'}}],
    children: [
      {
        id: 'done',
        component: 'done',
        props: [
          {
            key: 'text',
            util_call: {
              operation: 'str.template',
              arguments: [
                {key: 'template', value_literal: 'Arrived at {0}'},
                {key: 'values', value_list: [{value_path: 'move.args.position'}]},
              ],
            },
          },
        ],
      },
      {id: 'failed', component: 'failed', props: [{key: 'text', static_value: 'Move failed'}]},
    ],
  },
];

const record = (status: 'running' | 'done' | 'failed', id = 't1') => ({
  ...withTaskStatus(idleTaskRecord(), status),
  id,
  args: {position: 'dock'},
});

const renderToast = async (move: unknown, sink: BlokToastSink) => {
  let store: BlokRuntimeStore | undefined;
  let renderer: ReactTestRenderer | undefined;
  const Probe = () => {
    store = useBlokRuntimeStoreApi();
    return null;
  };
  await act(async () => {
    renderer = create(
      <BlokToastSinkContext.Provider value={sink}>
        <BlokRenderer uiComponents={toastTree} initialState={{move}}>
          <Probe />
        </BlokRenderer>
      </BlokToastSinkContext.Provider>,
    );
  });
  if (!store || !renderer) throw new Error('The blok did not render.');
  return store;
};

describe('Toast', () => {
  it('fires once when a task it saw run settles, with its outcome slot', async () => {
    const sink = jest.fn<BlokToastSink>();
    const store = await renderToast(record('running'), sink);
    act(() => store.getState().setRuntimeValue('move', record('done')));
    act(() => store.getState().setRuntimeValue('move', {...record('done'), progress: 100}));
    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink).toHaveBeenCalledWith({id: 't1', outcome: 'done', text: 'Arrived at dock'});
  });

  it('never fires on mount for a task already settled', async () => {
    const sink = jest.fn<BlokToastSink>();
    await renderToast(record('failed'), sink);
    expect(sink).not.toHaveBeenCalled();
  });
});

describe('Time', () => {
  const NOW = Date.parse('2026-10-27T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers({now: NOW});
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows a moment relative to now, and ticks', async () => {
    const tree = [
      {
        id: 'when',
        component: 'Time',
        props: [
          {key: 'value', static_value: '2026-10-27T11:59:50Z'},
          {key: 'relative', static_value: true},
        ],
      },
    ];
    const {renderer} = await renderBlok(tree);
    act(() => {
      jest.advanceTimersByTime(0);
    });
    const before = shownTexts(renderer.root)[0];
    act(() => {
      jest.advanceTimersByTime(3_600_000);
    });
    const after = shownTexts(renderer.root)[0];
    expect(before).toMatch(/second/);
    expect(after).toMatch(/hour/);
  });

  it('renders nothing for a value that is no moment', async () => {
    const {renderer} = await renderBlok([{id: 'when', component: 'Time', props: [{key: 'value', static_value: 'soon'}]}]);
    expect(shownTexts(renderer.root)).toEqual([]);
  });
});
