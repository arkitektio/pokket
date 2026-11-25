import type { Answer, CallFrame } from "./frames";
import type { RekuestSession, SessionSync, TopicListener } from "./client";

/**
 * A caller session for tests: it watches nothing on a server, but remembers
 * every watch, so a test can play the server (`feed.resync`, `feed.data`) and
 * see what was asked (`calls`). Answers come from `answer` (default: accepted).
 */
export type FakeFeed = {
  topic: string;
  closed: boolean;
  resync: (snapshot: unknown, reason?: string) => void;
  data: (item: unknown) => void;
  refuse: (error: string) => void;
};

export const createFakeSession = (
  answer: (frame: CallFrame) => Promise<Answer> = async () => ({ type: "ACCEPTED", pos: 0, request: "r" }),
) => {
  const feeds: FakeFeed[] = [];
  const calls: CallFrame[] = [];
  const sync: SessionSync = { status: "open", since: null, catchingUp: false, error: null };
  const session = {
    watch: (topic: string, listener: TopicListener) => {
      const feed: FakeFeed = {
        topic,
        closed: false,
        resync: (snapshot, reason = "new") => listener.onResync(snapshot, reason),
        data: (item) => listener.onData(item),
        refuse: (error) => listener.onRefused?.(error),
      };
      feeds.push(feed);
      return () => {
        feed.closed = true;
      };
    },
    call: (frame: CallFrame) => {
      calls.push(frame);
      return answer(frame);
    },
    wake: () => undefined,
    getStatus: () => "open",
    getSync: () => sync,
    subscribeStatus: () => () => undefined,
    dispose: () => undefined,
  };
  return { session: session as unknown as RekuestSession, feeds, calls };
};
