import * as React from 'react';
import {Pressable, View} from 'react-native';
import {Box, History} from 'lucide-react-native';
import {router} from 'expo-router';
import {Text} from '@/components/ui/text';
import {ComponentContext, type RunTaskFragment} from '@/lib/rekuest/api/graphql';
import {openAsks} from '@/lib/rekuest/run/taskRoot';
import {useRunOfTask, useRunSpace, useRunTask, useTaskActionBlok} from '@/lib/rekuest/run/useRun';
import {BlokTravelProvider, useBlokTravelMoment} from '@/lib/rekuest/travel/context';
import {useBlokTravel, type BlokTravel} from '@/lib/rekuest/travel/useBlokTravel';
import {TravelBar} from '../travel/TravelBar';
import {useThemeColors} from '@/lib/theme/BrandProvider';
import {ActionBlokRenderer, RunAsk} from './ActionBlokRenderer';
import {TaskBlokList, useTaskBloks} from './TaskBloks';

/** "Open in space": the run drawn into its space, for an action with an overlay. */
const OpenRunInSpace = ({task}: {task: RunTaskFragment}) => {
  const colors = useThemeColors();
  const overlay = useTaskActionBlok(task, ComponentContext.Overlay);
  const space = useRunSpace(overlay ? task : null);
  if (!overlay || !space) return null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({pathname: '/spaces/[id]', params: {id: space, task: task.id}})}
      className="flex-row items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-2.5 active:bg-muted"
    >
      <Box size={16} color={colors.primary} />
      <Text className="text-sm font-medium text-primary">Open in space</Text>
    </Pressable>
  );
};

/** Opens the history bar, or closes it and goes back to live. */
const HistoryToggle = ({travel}: {travel: BlokTravel}) => {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={travel.open ? 'Back to live, and hide the history bar' : 'Show the bloks as they were at an earlier time'}
      onPress={travel.toggle}
      className="flex-row items-center gap-1.5 self-end rounded-lg border border-border px-2.5 py-1.5 active:bg-muted"
    >
      <History size={14} color={travel.open ? '#f59e0b' : colors.foreground} />
      <Text className="text-xs font-medium text-foreground">History</Text>
    </Pressable>
  );
};

/**
 * What a task shows of itself as bloks, on its screen (orkestrator's task
 * panel): its open asks, answered (or dismissed) in place; the html blok its
 * action declared, drawn for this run; the bloks it showed (asks and
 * informs); and the way to its space when its action draws an overlay.
 * Nothing for a task with none of these.
 *
 * `follow` polls while it runs, for a task the task stream does not carry (a child).
 */
export const TaskRun = ({taskId, follow}: {taskId: string; follow?: boolean}) => {
  const {task} = useRunTask(taskId, {follow});
  const travel = useBlokTravel();
  return (
    <BlokTravelProvider source={travel.source}>
      <TaskRunBloks taskId={taskId} task={task} travel={travel} />
    </BlokTravelProvider>
  );
};

/**
 * The bloks, at the moment the history bar stands on: the run reads as it was
 * then, and nothing is answered.
 */
const TaskRunBloks = ({taskId, task, travel}: {taskId: string; task: RunTaskFragment | null; travel: BlokTravel}) => {
  const panel = useTaskActionBlok(task, ComponentContext.Html);
  const live = useBlokTravelMoment() === null;
  // An ask through a blok is answered on its hold card, not again in the list of bloks.
  const onCards = React.useMemo(
    () => new Set(live && task && !task.isDone ? openAsks(task).flatMap(ask => (ask.blok ? [ask.blok] : [])) : []),
    [live, task],
  );
  const bloks = useTaskBloks(taskId, task, onCards);
  const run = useRunOfTask(task);
  const names = React.useMemo(
    () => new Map(run ? [...(run.self ? [run.self] : []), ...run.binding.map(({agent}) => agent)].map(agent => [agent.id, agent.name] as const) : []),
    [run],
  );
  if (!task) return null;
  const drawn = panel !== null || bloks.length > 0;
  return (
    <View className="gap-3">
      {live ? <RunAsk task={task} /> : null}
      {drawn ? <HistoryToggle travel={travel} /> : null}
      {drawn && travel.open ? <TravelBar travel={travel} names={names} className="rounded-xl border" /> : null}
      {panel ? (
        // The screen shows the run's asks above, as cards of their own.
        <ActionBlokRenderer actionBlok={panel.actionBlok} run={panel.run} showAsk={false} />
      ) : null}
      {bloks.length > 0 ? <TaskBlokList taskId={taskId} task={task} bloks={bloks} /> : null}
      <OpenRunInSpace task={task} />
    </View>
  );
};
