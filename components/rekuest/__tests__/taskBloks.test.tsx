import {describe, expect, it, jest} from '@jest/globals';
import * as React from 'react';
import {act, type ReactTestInstance, type ReactTestRenderer} from 'react-test-renderer';
import {shownTexts} from '@/components/blok/testing';
import {
  ComponentContext,
  TaskBlokRole,
  TaskBlokStatus,
  type MaterializedBlokFragment,
  type TaskBlokFragment,
} from '@/lib/rekuest/api/graphql';
import {HoldCard, type HoldDecisionInput} from '../run/HoldCard';
import {TaskBlokList} from '../run/TaskBloks';
import {renderInSession} from '../testing';

jest.mock('sonner-native', () => ({toast: {info: jest.fn(), error: jest.fn(), success: jest.fn()}}));
// Ships untranspiled JSX; `asChild` is never used by bloks.
jest.mock('@rn-primitives/slot', () => {
  const {Pressable, Text, View} = jest.requireActual<typeof import('react-native')>('react-native');
  return {Pressable, Text, View};
});

/**
 * A task's bloks on its screen: an ask answered through its blok goes to the
 * task (`task.answer`), a settled one is frozen with what was answered, and a
 * hold without a blok is approved or denied on its card.
 */

const render = renderInSession;

const pressable = (renderer: ReactTestRenderer, label: string): ReactTestInstance => {
  const [found] = renderer.root.findAll(
    node => typeof node.props.onPress === 'function' && shownTexts(node).some(shown => shown.includes(label)),
  );
  if (!found) throw new Error(`Nothing to press shows "${label}".`);
  return found;
};

/** `<Text>{task.status}</Text><Button onClick={task.answer({slide: "S1"})}>Use S1</Button>`. */
const askTree = [
  {id: 'status', component: 'Text', props: [{key: 'text', dynamic_value: {path: 'task.status'}}]},
  {
    id: 'use',
    component: 'Button',
    props: [
      {key: 'label', static_value: 'Use S1'},
      {
        key: 'onClick',
        util_call: {operation: 'task.answer', arguments: [{key: 'values', value_dict: [{key: 'slide', value_literal: 'S1'}]}]},
      },
    ],
  },
];

const materialized: MaterializedBlokFragment = {
  id: 'm1',
  name: 'Pick a slide',
  description: null,
  isDefault: false,
  createdAt: '2026-10-27T10:00:00Z',
  unboundDependencies: [],
  args: null,
  revision: null,
  agentMappings: [],
  blok: {
    id: 'b1',
    name: 'Pick a slide',
    description: null,
    context: ComponentContext.Html,
    hash: 'h',
    componentTree: askTree,
    vocab: 2,
    catalogs: [],
    dependencies: [],
    args: [],
    diagnostics: [],
    module: {id: 'mod', name: 'tasks'},
    locals: [],
    resolvedLocals: [],
    demo: null,
    queries: [],
    subscriptions: [],
  },
};

const ask = (status: TaskBlokStatus, values: Record<string, unknown> | null = null): TaskBlokFragment => ({
  role: TaskBlokRole.Ask,
  status,
  message: null,
  values,
  decidedBy: null,
  createdAt: '2026-10-27T10:00:01Z',
  materializedBlok: materialized,
});

const running = {isDone: false, events: []};

describe("a task's bloks", () => {
  it('answers a waiting ask through its blok, and the blok reads it as asking', async () => {
    const onAnswer = jest.fn(() => undefined);
    const renderer = await render(
      <TaskBlokList taskId="t1" task={running} bloks={[ask(TaskBlokStatus.Waiting)]} onAnswer={onAnswer} />,
    );
    expect(shownTexts(renderer.root)).toContain('asking');

    await act(async () => pressable(renderer, 'Use S1').props.onPress());
    expect(onAnswer).toHaveBeenCalledWith({slide: 'S1'});
    act(() => renderer.unmount());
  });

  it('freezes an answered ask, with what was answered under it', async () => {
    const onAnswer = jest.fn(() => undefined);
    const renderer = await render(
      <TaskBlokList taskId="t1" task={running} bloks={[ask(TaskBlokStatus.Answered, {slide: 'S2'})]} onAnswer={onAnswer} />,
    );
    const shown = shownTexts(renderer.root);
    expect(shown).toContain('done');
    expect(shown).toContain('Answered by someone: S2');
    expect(renderer.root.findAll(node => node.props.pointerEvents === 'none' && node.props['aria-disabled'] === true)).not.toHaveLength(0);
    act(() => renderer.unmount());
  });
});

describe('a hold on its card', () => {
  const hold = {
    task: 't9',
    kind: 'assign' as const,
    title: 'Run stain',
    action: {id: 'a1', name: 'stain'},
    agent: {id: 'r1', name: 'arm'},
    args: {slide: 'S1'},
  };

  it('says what would run, and approves or denies it', async () => {
    const onDecide = jest.fn(async (_decision: HoldDecisionInput) => undefined);
    const renderer = await render(<HoldCard hold={hold} onDecide={onDecide} />);
    expect(shownTexts(renderer.root).join(' ')).toContain('asks to run stain on arm');
    expect(shownTexts(renderer.root)).toContain('S1');

    await act(async () => pressable(renderer, 'Approve').props.onPress());
    expect(onDecide).toHaveBeenCalledWith({approved: true, answer: null, values: null});
    act(() => renderer.unmount());

    const denying = await render(<HoldCard hold={hold} onDecide={onDecide} />);
    await act(async () => pressable(denying, 'Deny').props.onPress());
    expect(onDecide).toHaveBeenLastCalledWith({approved: false, answer: null, values: null});
    act(() => denying.unmount());
  });
});
