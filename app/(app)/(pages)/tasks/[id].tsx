import { PortValues } from '@/components/tasks/PortValues';
import { RekuestUnavailable, TasksLoadingState } from '@/components/tasks/states';
import { ProgressBar, TaskStatusBadge, useNow } from '@/components/tasks/status';
import { TaskTimeline } from '@/components/tasks/TaskTimeline';
import { Card, CardContent } from '@/components/ui/card';
import { useAlertDialog } from '@/components/ui/alert-dialog';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { showDetail } from '@/lib/navigation';
import { actionRoute } from '@/lib/rekuest/assign/runOrAsk';
import {
  DetailTaskFragment,
  useCancelTaskMutation,
  useDetailTaskQuery,
  useInterruptTaskMutation,
  usePauseTaskMutation,
  useResumeTaskMutation,
} from '@/lib/rekuest/api/graphql';
import {
  bucketColor,
  formatDuration,
  formatTaskTime,
  isCancelable,
  isInterruptable,
  isLive,
  isPausable,
  isResumable,
  liveState,
} from '@/lib/rekuest/taskStatus';
import { useChildTaskStream, useTaskStream } from '@/lib/rekuest/useTaskStream';
import { useTabTitle } from '@/lib/tabs/TabsProvider';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Link, useLocalSearchParams } from 'expo-router';
import { Ban, CornerLeftUp, LucideIcon, OctagonX, Pause, Play, RotateCw } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

/** Descendants get no events on the root stream; poll them while they run. */
const CHILD_POLL_MS = 3000;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2 px-4 pb-4">
      <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</Text>
      {children}
    </View>
  );
}

function ActionButton({
  label,
  icon: Icon,
  destructive,
  onPress,
}: {
  label: string;
  icon: LucideIcon;
  destructive?: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const color = destructive ? colors.destructive : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-2.5 active:bg-muted"
    >
      <Icon size={16} color={color} />
      <Text style={{ color }} className="text-sm font-medium">
        {label}
      </Text>
    </Pressable>
  );
}

/** Pause/resume, cancel and interrupt — as the task's state allows. */
function TaskActions({ task }: { task: DetailTaskFragment }) {
  const dialog = useAlertDialog();
  const variables = { task: task.id };
  const [cancel] = useCancelTaskMutation({ variables });
  const [interrupt] = useInterruptTaskMutation({ variables });
  const [pause] = usePauseTaskMutation({ variables });
  const [resume] = useResumeTaskMutation({ variables });

  const confirm = (title: string, message: string, label: string, run: () => unknown) =>
    dialog.show(title, message, [
      { label: 'Keep running', variant: 'cancel' },
      { label, variant: 'destructive', onPress: () => void run() },
    ]);

  const buttons = [
    isResumable(task) && <ActionButton key="resume" label="Resume" icon={Play} onPress={() => void resume()} />,
    isPausable(task) && <ActionButton key="pause" label="Pause" icon={Pause} onPress={() => void pause()} />,
    isCancelable(task) && (
      <ActionButton
        key="cancel"
        label="Cancel"
        icon={Ban}
        destructive
        onPress={() => confirm('Cancel this task?', 'The agent is asked to stop it cleanly.', 'Cancel task', cancel)}
      />
    ),
    isInterruptable(task) && (
      <ActionButton
        key="interrupt"
        label="Interrupt"
        icon={OctagonX}
        destructive
        onPress={() =>
          confirm('Interrupt this task?', 'The agent stops it at once, without cleaning up.', 'Interrupt', interrupt)
        }
      />
    ),
  ].filter(Boolean);

  // Always there: the same action, starting from this task's inputs.
  buttons.push(
    <ActionButton
      key="again"
      label="Run again"
      icon={RotateCw}
      onPress={() => showDetail(actionRoute(task.action.id, { task: task.id }))}
    />,
  );
  return <View className="flex-row gap-2 px-4 pb-4">{buttons}</View>;
}

/** orkestrator's status hero: what, who, how long, how far. */
function TaskHero({ task }: { task: DetailTaskFragment }) {
  const colors = useThemeColors();
  const live = isLive(task);
  const now = useNow(live);
  const state = liveState(task.events, live);
  const color = bucketColor(task.latestEventKind, task.isDone);
  const started = new Date(task.createdAt).getTime();
  const ended = task.finishedAt ? new Date(task.finishedAt).getTime() : live ? now : null;
  const who = [task.agent?.name, task.implementation?.interface].filter(Boolean).join(' · ');

  return (
    <View className="gap-3 px-4 pb-4 pt-5">
      <View className="flex-row items-center justify-between gap-2">
        <TaskStatusBadge kind={task.latestEventKind} isDone={task.isDone} />
        {ended != null ? (
          <Text className="font-mono text-sm text-muted-foreground">{formatDuration(ended - started)}</Text>
        ) : null}
      </View>
      <View>
        <Text selectable className="text-2xl font-bold text-foreground">
          {task.action.name}
        </Text>
        {task.action.description ? (
          <Text numberOfLines={3} className="mt-1 text-sm text-muted-foreground">
            {task.action.description}
          </Text>
        ) : null}
      </View>
      <Text className="text-xs text-muted-foreground">
        {[who || 'Unassigned', `started ${formatTaskTime(task.createdAt)}`].join(' · ')}
      </Text>
      {task.parent ? (
        <Link href={`/tasks/${task.parent.id}`} asChild>
          <Pressable className="flex-row items-center gap-1.5 self-start">
            <CornerLeftUp size={14} color={colors.primary} />
            <Text className="text-sm text-primary">Called by {task.parent.action.name}</Text>
          </Pressable>
        </Link>
      ) : null}
      {live ? (
        <View className="gap-1">
          <ProgressBar value={state.progress} color={color} />
          {state.progress != null || state.message ? (
            <Text className="text-xs text-muted-foreground">
              {state.progress != null ? `${state.progress}%` : ''}
              {state.progress != null && state.message ? ' · ' : ''}
              {state.message ?? ''}
            </Text>
          ) : null}
        </View>
      ) : state.error ? (
        <Text selectable style={{ color }} className="text-sm">
          {state.error}
        </Text>
      ) : null}
    </View>
  );
}

function TaskContent({ id }: { id: string }) {
  const colors = useThemeColors();
  const [refreshing, setRefreshing] = React.useState(false);
  const { data, loading, error, refetch, startPolling, stopPolling } = useDetailTaskQuery({
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const task = data?.task;
  useTabTitle(task?.action.name ?? null);
  useTaskStream();
  useChildTaskStream(id);

  const pollChild = !!task?.parent && isLive(task);
  React.useEffect(() => {
    if (!pollChild) return;
    startPolling(CHILD_POLL_MS);
    return () => stopPolling();
  }, [pollChild, startPolling, stopPolling]);

  if (!task) {
    if (loading) return <TasksLoadingState message="Loading task…" />;
    return <Text className="p-4 text-sm text-destructive">{error?.message ?? 'Task not found.'}</Text>;
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.primary}
          onRefresh={async () => {
            setRefreshing(true);
            try {
              await refetch();
            } finally {
              setRefreshing(false);
            }
          }}
        />
      }
    >
      <TaskHero task={task} />
      <TaskActions task={task} />
      <Section title="Inputs">
        <Card className="border-border bg-card">
          <CardContent className="px-3 py-1">
            <PortValues ports={task.action.args} values={task.args} />
          </CardContent>
        </Card>
      </Section>
      <Section title="Progress">
        <TaskTimeline task={task} />
      </Section>
      <View className="h-10" />
    </ScrollView>
  );
}

export default function TaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View className="flex-1 bg-background">
      <Guard.Lok connectingFallback={<TasksLoadingState message="Connecting…" />}>
        <Guard.Rekuest fallback={<RekuestUnavailable />}>
          <TaskContent key={id} id={id} />
        </Guard.Rekuest>
      </Guard.Lok>
    </View>
  );
}
