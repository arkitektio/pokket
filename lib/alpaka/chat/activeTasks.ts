/**
 * The replyer pills above the chat composer, as plain state transitions: a
 * port of orkestrator's `alpaka/chat/activeTasks.ts` onto pokket's task
 * stream, whose events name their task by id and whose creates carry the
 * reference the pill was started with.
 *
 * A pill is settled by exactly one terminal event, so anything that drops or
 * overwrites that one update leaves a spinner forever. Everything here is
 * written against that: a settled pill never goes back, and a pill can also be
 * settled from the task itself (the assign result, a re-query).
 */
export type ActiveTaskStatus = "PENDING" | "RUNNING" | "DONE" | "ERROR" | "CANCELLED";

export interface ActiveTask {
  /** The task's id; empty until the assign came back or the stream named it. */
  id: string;
  reference: string;
  actionName: string;
  status: ActiveTaskStatus;
  progress?: number | null;
  message?: string | null;
}

type SettledStatus = Exclude<ActiveTaskStatus, "PENDING" | "RUNNING">;

/** How long a settled pill stays. A failure is read, so it stays longer. */
export const DISMISS_AFTER_MS: Record<SettledStatus, number> = {
  DONE: 3000,
  CANCELLED: 3000,
  ERROR: 10000,
};

export const isSettled = (status: ActiveTaskStatus): status is SettledStatus =>
  status === "DONE" || status === "ERROR" || status === "CANCELLED";

/** Kinds after which a task does nothing more (`lib/rekuest/taskStatus.ts`). */
const TERMINAL_KINDS = ["COMPLETED", "CANCELLED", "CRITICAL", "FAILED", "INTERRUPTED", "LOST"];

/** Every terminal kind settles; anything else is still running. */
export const statusForKind = (kind: string): ActiveTaskStatus => {
  if (!TERMINAL_KINDS.includes(kind)) return "RUNNING";
  if (kind === "COMPLETED") return "DONE";
  if (kind === "CANCELLED" || kind === "INTERRUPTED") return "CANCELLED";
  return "ERROR";
};

const update = (
  tasks: ActiveTask[],
  matches: (task: ActiveTask) => boolean,
  change: (task: ActiveTask) => ActiveTask,
): ActiveTask[] =>
  // Settled is final: a straggling log or the assign result must not put the
  // spinner back on a pill nothing will ever settle again.
  tasks.map((task) => (matches(task) && !isSettled(task.status) ? change(task) : task));

export const startTask = (tasks: ActiveTask[], reference: string, actionName: string): ActiveTask[] => [
  ...tasks,
  { id: "", reference, actionName, status: "PENDING", progress: null, message: "Assigning…" },
];

type TaskState = { isDone?: boolean | null; latestEventKind: string };

const settledStatusOf = (task: TaskState): SettledStatus | null => {
  const status = statusForKind(task.latestEventKind);
  if (isSettled(status)) return status;
  // Flagged done with no terminal kind on record is simply done.
  return task.isDone ? "DONE" : null;
};

/**
 * The task is known: from the assign mutation coming back, or from the stream
 * announcing it. The two race, and a fast replyer can finish before either, so
 * this only ever moves a pill forward: it gives it its id, and settles it if
 * the task has already ended.
 */
export const bindTask = (
  tasks: ActiveTask[],
  reference: string,
  task: { id: string } & TaskState,
): ActiveTask[] =>
  update(
    tasks,
    (pill) => pill.reference === reference,
    (pill) => ({ ...pill, id: task.id, status: settledStatusOf(task) ?? "RUNNING" }),
  );

/** One event of the task stream, onto the pill of that task. */
export const applyTaskEvent = (
  tasks: ActiveTask[],
  event: { task: string; kind: string; message?: string | null; progress?: number | null },
): ActiveTask[] =>
  update(
    tasks,
    (pill) => !!pill.id && pill.id === event.task,
    (pill) => ({
      ...pill,
      status: statusForKind(event.kind),
      progress: event.progress ?? pill.progress,
      message: event.message || pill.message,
    }),
  );

export const failTask = (tasks: ActiveTask[], reference: string, message: string): ActiveTask[] =>
  update(
    tasks,
    (pill) => pill.reference === reference,
    (pill) => ({ ...pill, status: "ERROR", message }),
  );

/**
 * Settle pills from what the tasks themselves say. Events are the fast path;
 * this is the one that cannot be missed. Returns the same array when nothing
 * changed.
 */
export const settleFromTasks = (
  tasks: ActiveTask[],
  known: readonly ({ id: string } & TaskState)[],
): ActiveTask[] => {
  let changed = false;
  const next = tasks.map((pill) => {
    if (!pill.id || isSettled(pill.status)) return pill;
    const task = known.find((candidate) => candidate.id === pill.id);
    const status = task && settledStatusOf(task);
    if (!status) return pill;
    changed = true;
    return { ...pill, status };
  });
  return changed ? next : tasks;
};
