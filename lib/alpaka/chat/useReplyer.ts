import * as Crypto from "expo-crypto";
import * as React from "react";
import { toast } from "sonner-native";
import {
  DetailTaskDocument,
  DetailTaskQuery,
  DetailTaskQueryVariables,
  useAssignMutation,
  useCancelTaskMutation,
  useReplyerActionsQuery,
} from "@/lib/rekuest/api/graphql";
import { useRekuestClient, useTaskStreamListener } from "@/lib/rekuest/useTaskStream";
import {
  ActiveTask,
  applyTaskEvent,
  bindTask,
  DISMISS_AFTER_MS,
  failTask,
  isSettled,
  settleFromTasks,
  startTask,
} from "./activeTasks";
import { argsFor, useRememberedArgs } from "@/lib/rekuest/assign/rememberedArgs";
import type { ReplyerActionFragment } from "@/lib/rekuest/api/graphql";
import type { StructureInput } from "../api/graphql";
import { bySubject, chooseReplyer, isSpecific, NO_REPLYER, replyerArgs, replyerBlocker } from "./replyer";
import { loadChoice, saveChoice } from "./replyerChoice";
import { sameSubject } from "./replyerSubject";

/** A message landing while a pill still spins may mean its replyer is done: ask once, a moment later. */
const RECHECK_AFTER_MESSAGE_MS = 5000;

export type ReplyerController = {
  /** The replyers and this room's choice are known: before that, `run` has nothing to run. */
  ready: boolean;
  /** The specific replyers first: those that take the subject beside the message. */
  replyers: readonly ReplyerActionFragment[];
  /** What the room's replies are about, if anything: the room sets it from its messages. */
  subject: StructureInput | null;
  setSubject: (subject: StructureInput | null) => void;
  /** Does it take the subject: one made for this kind of structure? */
  isSpecific: (replyer: ReplyerActionFragment) => boolean;
  /** The replyer this room runs after each message; null for none. */
  chosen: ReplyerActionFragment | null;
  /** Why the chosen replyer cannot run as it stands, if it cannot. */
  blocker: string | null;
  choose: (id: string) => void;
  /** Why a replyer cannot run as it stands: it needs settings it has none of. */
  blockerOf: (replyer: ReplyerActionFragment) => string | null;
  /** A replyer's settings as saved on this phone, if any. */
  settingsOf: (replyer: ReplyerActionFragment) => Record<string, unknown> | null;
  saveSettings: (replyer: ReplyerActionFragment, args: Record<string, unknown>) => void;
  tasks: readonly ActiveTask[];
  /**
   * Assign the chosen replyer to a message, about `about` (what the message
   * carried) or else the subject. Does nothing without a runnable replyer.
   */
  run: (messageId: string, about?: StructureInput | null) => Promise<void>;
  cancel: (task: ActiveTask) => void;
  /** Ask the server about the tasks still running, a moment from now: call it when a message lands. */
  recheckSoon: () => void;
  dismiss: (reference: string) => void;
};

/**
 * A room's replyer and the tasks it is running: orkestrator's `Chat` state
 * for the replyer control and the pills. Needs rekuest, so it lives in its
 * own hook and the room works as a message board without it.
 */
export const useReplyer = (roomId: string): ReplyerController => {
  const client = useRekuestClient();
  const { data, error } = useReplyerActionsQuery({ fetchPolicy: "cache-and-network" });
  const [subject, setSubjectState] = React.useState<StructureInput | null>(null);
  const setSubject = React.useCallback(
    (next: StructureInput | null) => setSubjectState((current) => (sameSubject(current, next) ? current : next)),
    [],
  );
  // The specific ones are among them: they take a message too. Listed first, so with
  // nothing chosen for the room the first that runs is made for what it is about.
  const replyers: readonly ReplyerActionFragment[] = React.useMemo(() => bySubject(data?.actions ?? [], subject), [data, subject]);
  const specific = React.useCallback((replyer: ReplyerActionFragment) => isSpecific(replyer, subject), [subject]);
  const { all: remembered, remember } = useRememberedArgs();
  const settingsOf = React.useCallback((replyer: ReplyerActionFragment) => argsFor(remembered, replyer.id), [remembered]);
  const blockerOf = React.useCallback(
    (replyer: ReplyerActionFragment) => replyerBlocker(replyer, settingsOf(replyer), subject),
    [settingsOf, subject],
  );
  const saveSettings = React.useCallback(
    (replyer: ReplyerActionFragment, args: Record<string, unknown>) => remember(replyer.id, args),
    [remember],
  );

  const [choice, setChoice] = React.useState<{ room: string; id: string | null } | null>(null);
  React.useEffect(() => {
    let live = true;
    loadChoice(roomId).then(
      (id) => live && setChoice({ room: roomId, id }),
      () => live && setChoice({ room: roomId, id: null }),
    );
    return () => {
      live = false;
    };
  }, [roomId]);
  const chosenId = choice?.room === roomId ? choice.id : null;
  const chosen = React.useMemo(() => chooseReplyer(replyers, chosenId, blockerOf), [replyers, chosenId, blockerOf]);
  const blocker = chosen ? blockerOf(chosen) : null;

  const choose = React.useCallback(
    (id: string) => {
      setChoice({ room: roomId, id });
      void saveChoice(roomId, id).catch(() => undefined);
    },
    [roomId],
  );

  const [tasks, setTasks] = React.useState<ActiveTask[]>([]);
  const tasksRef = React.useRef(tasks);
  React.useEffect(() => {
    tasksRef.current = tasks;
  });

  useTaskStreamListener((change) => {
    const { create, event } = change;
    if (create?.reference) setTasks((prev) => bindTask(prev, create.reference!, create));
    if (event) setTasks((prev) => applyTaskEvent(prev, event));
  });

  // The stream can drop the one event that settles a pill; the task itself cannot be wrong.
  const recheck = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const recheckSoon = React.useCallback(() => {
    clearTimeout(recheck.current);
    recheck.current = setTimeout(() => {
      tasksRef.current
        .filter((pill) => pill.id && !isSettled(pill.status))
        .forEach((pill) => {
          client
            .query<DetailTaskQuery, DetailTaskQueryVariables>({
              query: DetailTaskDocument,
              variables: { id: pill.id },
              fetchPolicy: "network-only",
            })
            .then(({ data: result }) => {
              if (result?.task) setTasks((prev) => settleFromTasks(prev, [result.task]));
            })
            .catch(() => undefined);
        });
    }, RECHECK_AFTER_MESSAGE_MS);
  }, [client]);
  React.useEffect(() => () => clearTimeout(recheck.current), []);

  // Every settled pill leaves on its own: one timer per pill, started when it settles.
  const timers = React.useRef(new Map<string, ReturnType<typeof setTimeout>>());
  React.useEffect(() => {
    const running = timers.current;
    tasks.forEach((task) => {
      if (!isSettled(task.status) || running.has(task.reference)) return;
      running.set(
        task.reference,
        setTimeout(() => {
          running.delete(task.reference);
          setTasks((prev) => prev.filter((pill) => pill.reference !== task.reference));
        }, DISMISS_AFTER_MS[task.status]),
      );
    });
    running.forEach((timer, reference) => {
      if (tasks.some((task) => task.reference === reference)) return;
      clearTimeout(timer);
      running.delete(reference);
    });
  }, [tasks]);
  React.useEffect(() => {
    const running = timers.current;
    return () => {
      running.forEach((timer) => clearTimeout(timer));
      running.clear();
    };
  }, []);

  const [assign] = useAssignMutation();
  const [cancelTask] = useCancelTaskMutation();

  const run = React.useCallback(
    async (messageId: string, about?: StructureInput | null) => {
      if (!chosen || blockerOf(chosen)) return;
      const reference = Crypto.randomUUID();
      setTasks((prev) => startTask(prev, reference, chosen.name));
      try {
        const result = await assign({
          variables: {
            input: {
              action: chosen.id,
              args: replyerArgs(chosen, messageId, settingsOf(chosen), about ?? subject),
              reference,
              capture: false,
            },
          },
        });
        const task = result.data?.assign;
        if (task) setTasks((prev) => bindTask(prev, reference, task));
        else setTasks((prev) => failTask(prev, reference, "The replyer was not assigned"));
      } catch (e) {
        setTasks((prev) => failTask(prev, reference, e instanceof Error ? e.message : String(e)));
      }
    },
    [chosen, assign, blockerOf, settingsOf, subject],
  );

  const cancel = React.useCallback(
    (task: ActiveTask) => {
      if (!task.id) return;
      cancelTask({ variables: { task: task.id } }).then(
        () => toast.success("Cancellation requested"),
        () => undefined,
      );
    },
    [cancelTask],
  );

  const dismiss = React.useCallback(
    (reference: string) => setTasks((prev) => prev.filter((pill) => pill.reference !== reference)),
    [],
  );

  const ready = (!!data || !!error) && choice?.room === roomId && remembered !== null;
  return {
    ready,
    replyers,
    subject,
    setSubject,
    isSpecific: specific,
    chosen,
    blocker,
    choose,
    blockerOf,
    settingsOf,
    saveSettings,
    tasks,
    run,
    cancel,
    recheckSoon,
    dismiss,
  };
};

export { NO_REPLYER };
