import {describe, expect, it, jest} from '@jest/globals';
import * as React from 'react';
import {act} from 'react-test-renderer';

jest.mock('sonner-native', () => ({toast: {error: jest.fn(), success: jest.fn(), info: jest.fn()}}));

// eslint-disable-next-line @typescript-eslint/no-require-imports -- after the mocks, on purpose
const {renderInSession} = require('@/components/rekuest/testing') as typeof import('@/components/rekuest/testing');
// eslint-disable-next-line @typescript-eslint/no-require-imports -- after the mocks, on purpose
const {createFakeSession} = require('../session/testing') as typeof import('../session/testing');
// eslint-disable-next-line @typescript-eslint/no-require-imports -- after the mocks, on purpose
const {useTaskStreamListener} = require('../useTaskStream') as typeof import('../useTaskStream');

type Change = import('../useTaskStream').TaskStreamChange;

const row = (id: string, done: boolean) => ({
  id,
  reference: `ref-${id}`,
  is_done: done,
  latest_event_kind: done ? 'DONE' : 'STARTED',
  latest_instruct_kind: 'ASSIGN',
  action: '1',
  created_at: '2026-11-25T10:00:00Z',
  updated_at: '2026-11-25T10:01:00Z',
  finished_at: done ? '2026-11-25T10:01:00Z' : null,
  revision: 2,
});

function Listener({heard}: {heard: Change[]}) {
  useTaskStreamListener(change => heard.push(change));
  return null;
}

describe("this user's task stream", () => {
  it("follows tasks:mine, and tells a follower the tasks as they are on every snapshot, a first one too", async () => {
    const {session, feeds} = createFakeSession();
    const heard: Change[] = [];
    await renderInSession(<Listener heard={heard} />, session);
    expect(feeds.map(feed => feed.topic)).toEqual(['tasks:mine']);

    // A new session (the connection was rebuilt while a run ended): its first snapshot.
    await act(async () => feeds[0].resync({rows: [row('7', true), row('8', false)]}, 'new'));
    expect(heard.map(change => [change.update?.id, change.update?.isDone])).toEqual([
      ['7', true],
      ['8', false],
    ]);

    // Then live: a task started, and one of its events.
    await act(async () => feeds[0].data({create: row('9', false)}));
    await act(async () =>
      feeds[0].data({event: {id: 'e1', task: '9', kind: 'PROGRESS', progress: 50, created_at: '2026-11-25T10:02:00Z', task_seq: 1}}),
    );
    expect(heard.at(-2)?.create).toMatchObject({id: '9', reference: 'ref-9'});
    expect(heard.at(-1)?.event).toMatchObject({task: '9', progress: 50, taskSeq: 1});
  });
});
