import * as React from 'react';
import {View} from 'react-native';
import {BlokRunHostProvider, type BlokRunAgent, type BlokRunHost} from '@/components/blok/catalog/run/host';
import {Text} from '@/components/ui/text';
import {
  TaskBlokRole,
  TaskBlokStatus,
  useDecideMutation,
  useTaskBloksQuery,
  type TaskBlokFragment,
} from '@/lib/rekuest/api/graphql';
import {openAsks, type TaskRootSource} from '@/lib/rekuest/run/taskRoot';
import {useBlokTravelMoment} from '@/lib/rekuest/travel/context';
import {HoldCard} from './HoldCard';
import {TaskBlokEmbed} from './TaskBlokEmbed';

/** The task as a task blok reads it: its events (for its open asks), and whether it is over. */
type AskingTask = (Pick<TaskRootSource, 'events'> & {isDone: boolean}) | null | undefined;

/**
 * `<ask>` in a blok a task showed: the task's open ask, newest, answered in
 * place, as under a run. A hold that asks through this very blok is not drawn
 * again inside it: the blok is its form.
 */
export const TaskOpenAsk = ({task, blok}: {task: AskingTask; blok: string}) => {
  const hold = React.useMemo(
    () => (task && !task.isDone ? openAsks(task).filter(open => open.blok !== blok).at(-1) : undefined),
    [task, blok],
  );
  return hold ? <HoldCard key={hold.task} hold={hold} /> : null;
};

/** The run host a task blok's tree reads: its agents by key, and `<ask>` drawing the task's open ask. */
export const useTaskBlokHost = (
  task: AskingTask,
  materialized: Pick<TaskBlokFragment['materializedBlok'], 'id' | 'agentMappings'>,
): BlokRunHost => {
  const byKey = React.useMemo(() => {
    const agents = new Map<string, BlokRunAgent[]>();
    for (const mapping of materialized.agentMappings) {
      agents.set(mapping.key, [...(agents.get(mapping.key) ?? []), {id: mapping.agent.id, name: mapping.agent.name}]);
    }
    return agents;
  }, [materialized.agentMappings]);
  return React.useMemo<BlokRunHost>(
    () => ({
      agentsFor: key => byKey.get(key) ?? [],
      renderAsk: () => <TaskOpenAsk task={task} blok={materialized.id} />,
    }),
    [byKey, materialized.id, task],
  );
};

/**
 * One blok a task showed: an ask answered through it while it waits, frozen
 * once settled; an inform, live. `onAnswer` sends what `task.answer(values)`
 * returns; by default it approves the task's hold with them (`decide`).
 */
export const TaskBlokView = ({
  taskId,
  task,
  blok,
  onAnswer,
}: {
  taskId: string;
  task: AskingTask;
  blok: TaskBlokFragment;
  onAnswer?: (values: Record<string, unknown>) => unknown;
}) => {
  const [decide] = useDecideMutation();
  const host = useTaskBlokHost(task, blok.materializedBlok);
  const asks = blok.role === TaskBlokRole.Ask;
  // The past is not answered.
  const live = useBlokTravelMoment() === null;
  const onReturn = React.useCallback(
    (values: Record<string, unknown>) =>
      onAnswer ? onAnswer(values) : decide({variables: {input: {task: taskId, approved: true, values}}}),
    [decide, onAnswer, taskId],
  );
  return (
    <BlokRunHostProvider value={host}>
      <TaskBlokEmbed
        materialized={blok.materializedBlok}
        ask={
          asks
            ? {
                status: blok.status,
                values: (blok.values as Record<string, unknown> | null) ?? null,
                decidedBy: blok.decidedBy,
              }
            : undefined
        }
        onReturn={live && asks && blok.status === TaskBlokStatus.Waiting ? onReturn : undefined}
      />
    </BlokRunHostProvider>
  );
};

/** The bloks a task showed, in order: the latest inform live, older ones gone to their line. */
export const TaskBlokList = ({
  taskId,
  task,
  bloks,
  onAnswer,
}: {
  taskId: string;
  task: AskingTask;
  bloks: readonly TaskBlokFragment[];
  onAnswer?: (values: Record<string, unknown>) => unknown;
}) => {
  const lastInform = bloks.findLastIndex(blok => blok.role === TaskBlokRole.Inform);
  return (
    <View className="gap-3">
      {bloks.map((blok, index) =>
        blok.role === TaskBlokRole.Inform && index !== lastInform ? (
          <Text key={blok.materializedBlok.id} className="px-1 text-xs text-muted-foreground">
            {blok.message || blok.materializedBlok.name || blok.materializedBlok.blok.name}
          </Text>
        ) : (
          <TaskBlokView key={blok.materializedBlok.id} taskId={taskId} task={task} blok={blok} onAnswer={onAnswer} />
        ),
      )}
    </View>
  );
};

/**
 * The bloks a task showed (orkestrator's `TaskBloks`), oldest first. Follows
 * the task: a blok it shows later, or an answer given elsewhere, appears
 * without a reload. `answeredElsewhere`: the waiting asks a hold card answers
 * already, left out.
 */
export const useTaskBloks = (
  taskId: string,
  task: (AskingTask & {latestEventKind: string}) | null,
  answeredElsewhere: ReadonlySet<string>,
): readonly TaskBlokFragment[] => {
  const {data, refetch} = useTaskBloksQuery({variables: {id: taskId}, fetchPolicy: 'cache-and-network'});
  // The run moves with every event: read the bloks again then.
  const moved = task ? `${task.latestEventKind}:${task.events.length}:${task.isDone}` : null;
  React.useEffect(() => {
    if (moved) void refetch();
  }, [moved, refetch]);

  const all = data?.task.bloks;
  return React.useMemo(
    () =>
      (all ?? []).filter(
        blok =>
          !(blok.role === TaskBlokRole.Ask && blok.status === TaskBlokStatus.Waiting && answeredElsewhere.has(blok.materializedBlok.id)),
      ),
    [all, answeredElsewhere],
  );
};
