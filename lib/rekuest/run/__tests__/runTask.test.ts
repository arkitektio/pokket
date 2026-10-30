import {describe, expect, it, jest} from '@jest/globals';
// The generated hooks pull in toasts; only the enums are needed here.
jest.mock('@/lib/rekuest/funcs', () => ({}));
import {ComponentContext, TaskEventKind, type RunTaskFragment, type TaskEventChangeFragment} from '../../api/graphql';
import {actionBlokFor, foldRunEvent, foldRunEvents, runOfTask} from '../runTask';
import {openAsks, taskRecordOf} from '../taskRoot';

const run = (overrides: Partial<RunTaskFragment> = {}): RunTaskFragment => ({
  id: 't1',
  args: {slide: 'S1'},
  latestEventKind: TaskEventKind.Started,
  latestProgress: null,
  latestMessage: null,
  latestReturns: null,
  isDone: false,
  events: [],
  action: {id: 'a1', name: 'stain'},
  implementation: {id: 'i1', agent: {id: 'w1', name: 'worker', connected: true}},
  actionBloks: [],
  dependencyAgents: [{key: 'robot', agent: {id: 'r1', name: 'arm', connected: true}}],
  space: null,
  ...overrides,
});

let serial = 0;
const event = (kind: TaskEventKind, rest: Partial<TaskEventChangeFragment> = {}): TaskEventChangeFragment => ({
  id: `e${(serial += 1)}`,
  task: 't1',
  kind,
  message: null,
  progress: null,
  returns: null,
  value: null,
  createdAt: '2026-10-27T10:00:00Z',
  ...rest,
});

describe('a run fed by the task stream', () => {
  it('moves task on as the run reports, and leaves other tasks alone', () => {
    const task = run();
    expect(foldRunEvent(task, event(TaskEventKind.Progress, {task: 't2', progress: 10}))).toBe(task);

    const moved = foldRunEvents(task, [
      event(TaskEventKind.Progress, {progress: 40, message: 'staining'}),
      event(TaskEventKind.Log, {message: 'a log line'}),
    ]);
    expect(moved.latestEventKind).toBe(TaskEventKind.Progress);
    expect(taskRecordOf(moved)).toMatchObject({status: 'running', progress: 40, message: 'a log line'});
    expect(moved.events.map(each => each.kind)).toEqual([TaskEventKind.Log, TaskEventKind.Progress]);
  });

  it('asks the moment a hold arrives, and stops once it is decided', () => {
    const held = event(TaskEventKind.Held, {value: {kind: 'self', prompt: {title: 'Is the slide in place?'}}, createdAt: '2026-10-27T10:00:01Z'});
    const asking = foldRunEvent(run(), held);
    expect(openAsks(asking).map(ask => ask.title)).toEqual(['Is the slide in place?']);
    expect(taskRecordOf(asking)).toMatchObject({status: 'asking', ask: {question: 'Is the slide in place?'}});

    const decided = foldRunEvent(asking, event(TaskEventKind.Decided, {value: {approved: true}, createdAt: '2026-10-27T10:00:02Z'}));
    expect(openAsks(decided)).toEqual([]);
  });

  it('ends once, with what it returned, and takes an event it holds already only once', () => {
    const completed = event(TaskEventKind.Completed, {returns: {slide: 'S1'}});
    const done = foldRunEvents(run(), [completed, completed, event(TaskEventKind.Progress, {progress: 5})]);
    expect(done.isDone).toBe(true);
    expect(done.latestEventKind).toBe(TaskEventKind.Completed);
    expect(done.events.filter(each => each.id === completed.id)).toHaveLength(1);
    expect(taskRecordOf(done)).toMatchObject({status: 'done', done: true, returns: {slide: 'S1'}});
  });

  it('binds its keys to the agents it got, self to the agent running it', () => {
    const bound = runOfTask(run());
    expect(bound.self?.id).toBe('w1');
    expect(bound.binding.map(({key, agent}) => [key, agent.id])).toEqual([['robot', 'r1']]);
    expect(actionBlokFor(run().actionBloks, ComponentContext.Overlay)).toBeNull();
  });
});
