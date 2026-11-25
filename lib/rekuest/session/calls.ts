import { useCallback, useMemo, useState } from "react";
import type { AssignInput, DecideInput } from "../api/graphql";
import type { RekuestSession } from "./client";
import { toWireAssignInput, type AssignedAnswer } from "./frames";
import { useRekuestSession } from "./hooks";

/**
 * What a person asks of a task, over the app's caller session (takt
 * `/session`, orkestrator's `rekuest/session/calls.ts`): the answer comes back
 * on the same socket, and a call re-sent after a drop is applied once. A
 * refusal rejects with the server's sentence (`SessionRefusal`); the caller
 * shows it: nothing here toasts. A call made while the socket is down goes out
 * once it is back.
 */

export type TaskControlKind = "CANCEL" | "INTERRUPT" | "PAUSE" | "RESUME";

/** How long a window may be gone before a run tied to it is cancelled, unless chosen. */
export const DEFAULT_DEADMAN_SECONDS = 60;

/** Cancel, interrupt, pause or resume (`step`: to the next pausepoint) a task. */
export const controlTask = async (
  session: RekuestSession,
  kind: TaskControlKind,
  task: string,
  step = false,
): Promise<void> => {
  await session.call(kind === "RESUME" ? { type: kind, task, step } : { type: kind, task });
};

/** Start a task: the answer names it (`task`), and an assign re-sent after a drop finds the same one. */
export const assignTask = async (
  session: RekuestSession,
  input: AssignInput,
  deadman: number | null = null,
): Promise<AssignedAnswer> =>
  session.call<AssignedAnswer>({ type: "ASSIGN", input: toWireAssignInput(input), deadman });

/** Answer a held task. */
export const decideTask = async (session: RekuestSession, input: DecideInput): Promise<void> => {
  await session.call({
    type: "DECIDE",
    task: input.task,
    approved: input.approved,
    answer: input.answer ?? null,
    values: (input.values as Record<string, unknown> | null | undefined) ?? null,
    remember: input.remember ?? null,
  });
};

/**
 * Tie a task to this window (the dead man switch: cancelled once the window has been gone
 * `seconds`), or untie it (`null`).
 */
export const setDeadman = async (
  session: RekuestSession,
  task: string,
  seconds: number | null,
): Promise<void> => {
  await session.call({ type: "DEADMAN", task, seconds });
};

/** The calls above, bound to this window's session. */
export const useTaskCalls = () => {
  const session = useRekuestSession();
  return useMemo(
    () => ({
      assign: (input: AssignInput, deadman: number | null = null) => assignTask(session, input, deadman),
      control: (kind: TaskControlKind, task: string, step = false) =>
        controlTask(session, kind, task, step),
      decide: (input: DecideInput) => decideTask(session, input),
      deadman: (task: string, seconds: number | null) => setDeadman(session, task, seconds),
      session,
    }),
    [session],
  );
};

/** `[cancel, { loading }]` for one task. A refusal rejects. */
export const useCancelCall = (task: string): [() => Promise<void>, { loading: boolean }] => {
  const calls = useTaskCalls();
  const [loading, setLoading] = useState(false);
  const cancel = useCallback(async () => {
    setLoading(true);
    try {
      await calls.control("CANCEL", task);
    } finally {
      setLoading(false);
    }
  }, [calls, task]);
  return [cancel, { loading }];
};

/** What to show for a call that failed: the server's sentence for a refusal, else `fallback`. */
export const callFailure = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;
