import {describe, expect, it, jest} from '@jest/globals';
import * as React from 'react';
import {act} from 'react-test-renderer';
import {shownTexts} from '@/components/blok/testing';
import {
  ComponentContext,
  TaskEventKind,
  type ActionBlokFragment,
  type RunTaskFragment,
} from '@/lib/rekuest/api/graphql';
import {runOfTask} from '@/lib/rekuest/run/runTask';
import {BlokTravelProvider} from '@/lib/rekuest/travel/context';
import {createTravelSource, type TravelSource} from '@/lib/rekuest/travel/travelSource';
import {ActionBlokRenderer} from '../run/ActionBlokRenderer';
import {renderInSession} from '../testing';

const mockDecide = jest.fn((_options: unknown) => Promise.resolve({}));
jest.mock('@/lib/rekuest/api/graphql', () => ({
  ...jest.requireActual<typeof import('@/lib/rekuest/api/graphql')>('@/lib/rekuest/api/graphql'),
  useDecideMutation: () => [mockDecide, {loading: false}],
}));
jest.mock('sonner-native', () => ({toast: {info: jest.fn(), error: jest.fn(), success: jest.fn()}}));
// Ships untranspiled JSX; `asChild` is never used by bloks.
jest.mock('@rn-primitives/slot', () => {
  const {Pressable, Text, View} = jest.requireActual<typeof import('react-native')>('react-native');
  return {Pressable, Text, View};
});

/**
 * An action's html blok drawn for a run, as the task screen shows it: `task`
 * is the run, `<ask>` its open ask, and travelling shows the run as it was.
 */

const text = (id: string, path: string) => ({id, component: 'Text', props: [{key: 'text', dynamic_value: {path}}]});

const panel: ActionBlokFragment = {
  id: 'ab1',
  context: ComponentContext.Html,
  blok: {
    id: 'b1',
    context: ComponentContext.Html,
    heldByAction: true,
    componentTree: [text('status', 'task.status'), text('slide', 'args.slide'), {id: 'ask', component: 'ask', props: []}],
    vocab: 2,
    catalogs: [],
    module: {id: 'mod', name: 'tasks'},
    locals: [],
    resolvedLocals: [],
    demo: null,
    queries: [],
    subscriptions: [],
  },
};

const at = (seconds: number) => `2026-10-27T10:00:0${seconds}Z`;
const event = (id: string, kind: TaskEventKind, seconds: number, value: unknown = null) => ({
  id,
  kind,
  message: null,
  progress: null,
  returns: null,
  value,
  createdAt: at(seconds),
  task: {id: 't1'},
});

// Newest first, as the run's events are read.
const asking: RunTaskFragment = {
  id: 't1',
  args: {slide: 'S1'},
  latestEventKind: TaskEventKind.Held,
  latestProgress: null,
  latestMessage: null,
  latestReturns: null,
  isDone: false,
  events: [
    event('e2', TaskEventKind.Held, 2, {kind: 'self', prompt: {title: 'Is the slide in place?'}}),
    event('e1', TaskEventKind.Started, 1),
  ],
  action: {id: 'a1', name: 'stain'},
  implementation: {id: 'i1', agent: {id: 'w1', name: 'worker', connected: true}},
  actionBloks: [panel],
  dependencyAgents: [],
  space: null,
};

/** A source standing at `moment` that knows of no agent state. */
const standingAt = (moment: string): TravelSource => {
  const source = createTravelSource({
    checkout: async () => ({values: {}, globalRevision: 0, forwardPatches: [], backwardPatches: []}),
    now: () => Date.parse(at(9)),
    schedule: () => 0,
    cancel: () => undefined,
    setTimer: () => 0,
    clearTimer: () => undefined,
  });
  source.seek(Date.parse(moment), true);
  return source;
};

describe("an action's html blok for a run", () => {
  it('reads the run as task, what it was started with as args, and draws its open ask', async () => {
    const renderer = await renderInSession(<ActionBlokRenderer actionBlok={panel} run={runOfTask(asking)} />);
    const shown = shownTexts(renderer.root);
    expect(shown).toContain('asking');
    expect(shown).toContain('S1');
    expect(shown).toContain('Is the slide in place?');
    act(() => renderer.unmount());
  });

  it('leaves ask empty where the screen shows the asks already', async () => {
    const renderer = await renderInSession(<ActionBlokRenderer actionBlok={panel} run={runOfTask(asking)} showAsk={false} />);
    expect(shownTexts(renderer.root)).not.toContain('Is the slide in place?');
    act(() => renderer.unmount());
  });

  it('shows the run as it was at the moment travelled to', async () => {
    const renderer = await renderInSession(
      <BlokTravelProvider source={standingAt('2026-10-27T10:00:01.500Z')}>
        <ActionBlokRenderer actionBlok={panel} run={runOfTask(asking)} />
      </BlokTravelProvider>,
    );
    const shown = shownTexts(renderer.root);
    expect(shown).toContain('running');
    expect(shown).not.toContain('asking');
    act(() => renderer.unmount());
  });
});

describe('task.answer in an action\'s html blok', () => {
  const answering: ActionBlokFragment = {
    ...panel,
    blok: {
      ...panel.blok,
      componentTree: [
        {
          id: 'yes',
          component: 'Button',
          props: [
            {key: 'label', static_value: 'In place'},
            {
              key: 'onClick',
              util_call: {operation: 'task.answer', arguments: [{key: 'values', value_dict: [{key: 'ok', value_literal: true}]}]},
            },
          ],
        },
      ],
    },
  };

  const press = async (run: RunTaskFragment) => {
    mockDecide.mockClear();
    const renderer = await renderInSession(<ActionBlokRenderer actionBlok={answering} run={runOfTask(run)} />);
    const [button] = renderer.root.findAll(
      node => typeof node.props.onPress === 'function' && shownTexts(node).includes('In place'),
    );
    await act(async () => {
      button.props.onPress();
    });
    act(() => renderer.unmount());
  };

  it('answers the ask task.ask shows', async () => {
    await press(asking);
    expect(mockDecide).toHaveBeenCalledWith({variables: {input: {task: 't1', approved: true, values: {ok: true}}}});
  });

  it('answers nothing once the run ended', async () => {
    await press({...asking, latestEventKind: TaskEventKind.Cancelled, isDone: true});
    expect(mockDecide).not.toHaveBeenCalled();
  });
});
