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
import { chooseReplyer, NO_REPLYER, Replyer, replyerArgs, replyerBlocker } from "./replyer";
import { loadChoice, saveChoice } from "./replyerChoice";

/** A message landing while a pill still spins may mean its replyer is done: ask once, a moment later. */
const RECHECK_AFTER_MESSAGE_MS = 5000;

export type ReplyerController = {
  /** The replyers and this room's choice are known: before that, `run` has nothing to run. */
  ready: boolean;
  replyers: readonly Replyer[];
  /** The replyer this room runs after each message; null for none. */
  chosen: Replyer | null;
  /** Why the chosen replyer cannot run from here, if it cannot. */
  blocker: string | null;
  choose: (id: string) => void;
  tasks: readonly ActiveTask[];
  /** Assign the chosen replyer to a message. Does nothing without a runnable replyer. */
  run: (messageId: string) => Promise<void>;
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
  const replyers: readonly Replyer[] = React.useMemo(() => data?.actions ?? [], [data]);

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
  const chosen = React.useMemo(() => chooseReplyer(replyers, chosenId), [replyers, chosenId]);
  const blocker = chosen ? replyerBlocker(chosen) : null;

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
    async (messageId: string) => {
      if (!chosen || replyerBlocker(chosen)) return;
      const reference = Crypto.randomUUID();
      setTasks((prev) => startTask(prev, reference, chosen.name));
      try {
        const result = await assign({
          variables: {
            input: { action: chosen.id, args: replyerArgs(chosen, messageId), reference, capture: false },
          },
        });
        const task = result.data?.assign;
        if (task) setTasks((prev) => bindTask(prev, reference, task));
        else setTasks((prev) => failTask(prev, reference, "The replyer was not assigned"));
      } catch (e) {
        setTasks((prev) => failTask(prev, reference, e instanceof Error ? e.message : String(e)));
      }
    },
    [chosen, assign],
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

  const ready = (!!data || !!error) && choice?.room === roomId;
  return { ready, replyers, chosen, blocker, choose, tasks, run, cancel, recheckSoon, dismiss };
};

export { NO_REPLYER };
