import { LogLevel, TaskEventKind } from "./api/graphql";

/**
 * How a task reads at a glance — a port of orkestrator's
 * `rekuest/lib/taskStatus.tsx`. The server has no status enum; it is derived
 * from the latest event kind and `isDone`.
 */
export type StatusBucket = "queued" | "running" | "paused" | "done" | "error" | "cancelled" | "lost";

/** Kinds after which a task does nothing more. */
export const TERMINAL_KINDS: readonly TaskEventKind[] = [
  TaskEventKind.Completed,
  TaskEventKind.Cancelled,
  TaskEventKind.Critical,
  TaskEventKind.Failed,
  TaskEventKind.Interrupted,
  TaskEventKind.Lost,
];

export const isTerminalKind = (kind?: TaskEventKind | null) => !!kind && TERMINAL_KINDS.includes(kind);

export const statusBucket = (kind: TaskEventKind, isDone: boolean): StatusBucket => {
  switch (kind) {
    case TaskEventKind.Completed:
      return "done";
    case TaskEventKind.Failed:
    case TaskEventKind.Critical:
      return "error";
    case TaskEventKind.Lost:
      return "lost";
    case TaskEventKind.Cancelled:
    case TaskEventKind.Cancelling:
    case TaskEventKind.Interrupted:
    case TaskEventKind.Interrupting:
      return "cancelled";
  }
  if (isDone) return "done";
  switch (kind) {
    case TaskEventKind.Queued:
      return "queued";
    case TaskEventKind.Paused:
      return "paused";
    default:
      return "running";
  }
};

/** Still going: not done and not stopped. */
export const isLive = (t: { isDone: boolean; latestEventKind: TaskEventKind }) =>
  !t.isDone && !isTerminalKind(t.latestEventKind);

/** `LATE_REPORT` → `Late report`. */
export const formatEventKind = (kind: string) => {
  const words = kind.toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export const statusLabel = (kind: TaskEventKind, isDone: boolean) =>
  statusBucket(kind, isDone) === "done" ? "Completed" : formatEventKind(kind);

/** Fixed hues, readable on light and dark: status is meaning, not brand. */
export const BUCKET_COLORS: Record<StatusBucket, string> = {
  queued: "#94a3b8",
  running: "#3b82f6",
  paused: "#f59e0b",
  done: "#22c55e",
  error: "#ef4444",
  cancelled: "#a1a1aa",
  lost: "#f97316",
};

export const bucketColor = (kind: TaskEventKind, isDone: boolean) => BUCKET_COLORS[statusBucket(kind, isDone)];

/** The colour of one event's dot on the timeline. */
export const eventColor = (kind: TaskEventKind, level?: LogLevel | null): string => {
  switch (kind) {
    case TaskEventKind.Completed:
    case TaskEventKind.Yield:
      return BUCKET_COLORS.done;
    case TaskEventKind.Failed:
    case TaskEventKind.Critical:
      return BUCKET_COLORS.error;
    case TaskEventKind.Lost:
    case TaskEventKind.LateReport:
      return BUCKET_COLORS.lost;
    case TaskEventKind.Cancelled:
    case TaskEventKind.Cancelling:
    case TaskEventKind.Interrupted:
    case TaskEventKind.Interrupting:
      return BUCKET_COLORS.cancelled;
    case TaskEventKind.Paused:
    case TaskEventKind.Pausing:
      return BUCKET_COLORS.paused;
    case TaskEventKind.Queued:
    case TaskEventKind.Bound:
      return BUCKET_COLORS.queued;
    case TaskEventKind.Log:
      if (level === LogLevel.Error || level === LogLevel.Critical) return BUCKET_COLORS.error;
      if (level === LogLevel.Warn) return BUCKET_COLORS.paused;
      return BUCKET_COLORS.queued;
    default:
      return BUCKET_COLORS.running;
  }
};

type Flags = { isDone: boolean; latestEventKind: TaskEventKind };

export const isCancelable = (t: Flags) => !t.isDone && !isTerminalKind(t.latestEventKind);
export const isInterruptable = isCancelable;
export const isResumable = (t: Flags) => !t.isDone && t.latestEventKind === TaskEventKind.Paused;
export const isPausable = (t: Flags) =>
  !t.isDone && statusBucket(t.latestEventKind, t.isDone) === "running" && t.latestEventKind !== TaskEventKind.Pausing;

type EventLike = { kind: TaskEventKind; progress?: number | null; message?: string | null };

/**
 * What the newest events say about a running task: its progress (from the
 * newest PROGRESS event) and its latest message. `events` newest first.
 */
export const liveState = (events: readonly EventLike[], live: boolean) => {
  const progressEvent = live ? events.find((e) => e.kind === TaskEventKind.Progress && e.progress != null) : undefined;
  const failure = events.find((e) => e.kind === TaskEventKind.Failed || e.kind === TaskEventKind.Critical);
  const message = events.find((e) => !!e.message)?.message ?? null;
  return {
    progress: progressEvent?.progress ?? null,
    error: failure?.message ?? null,
    message,
  };
};

/** `1h 2m`, `3m 4s`, `5.2s`. */
export const formatDuration = (ms: number): string => {
  if (!Number.isFinite(ms) || ms < 0) return "";
  if (ms < 10_000) return `${(ms / 1000).toFixed(1)}s`;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s % 60}s`;
  return `${s}s`;
};

export const formatTaskTime = (iso?: string | null): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  return date.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};
