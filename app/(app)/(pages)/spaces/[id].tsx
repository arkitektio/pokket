import { SpaceScene } from '@/components/rekuest/space/SpaceScene';
import { TravelBar } from '@/components/rekuest/travel/TravelBar';
import { RekuestUnavailable, TasksLoadingState } from '@/components/tasks/states';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { CanvasVisibleContext } from '@/lib/gpu/FiberCanvas';
import { ComponentContext, useSpaceQuery } from '@/lib/rekuest/api/graphql';
import { useRunTask, useTaskActionBlok } from '@/lib/rekuest/run/useRun';
import { BlokTravelProvider } from '@/lib/rekuest/travel/context';
import { useBlokTravel } from '@/lib/rekuest/travel/useBlokTravel';
import { useTabTitle } from '@/lib/tabs/TabsProvider';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Link, router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { History, X } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

/** What `?task=` draws: which run, and a way back to the room on its own. */
function RunChip({ taskId, name, missing, onClose }: { taskId: string; name?: string; missing: boolean; onClose: () => void }) {
  const colors = useThemeColors();
  return (
    <View className="absolute left-2 top-2 flex-row items-center gap-2 rounded-lg border border-border bg-background/90 px-2 py-1">
      <Text className="text-xs text-muted-foreground">{missing ? 'This run has no overlay' : 'Showing the run'}</Text>
      <Link href={`/tasks/${taskId}`}>
        <Text className="text-xs font-medium text-foreground">{name ?? taskId}</Text>
      </Link>
      <Pressable accessibilityRole="button" accessibilityLabel="Show the room on its own" hitSlop={8} onPress={onClose}>
        <X size={14} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

function SpaceContent({ id, taskId }: { id: string; taskId: string | null }) {
  const colors = useThemeColors();
  const focused = useIsFocused();
  const travel = useBlokTravel();
  const { data, loading, error } = useSpaceQuery({ variables: { id }, fetchPolicy: 'cache-and-network' });
  const space = data?.space;
  useTabTitle(space?.name);
  // Followed here: the run may be someone else's, which no stream of ours carries.
  const { task } = useRunTask(taskId, { follow: true });
  const run = useTaskActionBlok(task, ComponentContext.Overlay);
  const agentNames = React.useMemo(
    () => new Map((space?.placements ?? []).map((placement) => [placement.agent.id, placement.agent.name] as const)),
    [space?.placements],
  );

  if (!space) {
    if (loading) return <TasksLoadingState message="Loading space…" />;
    return <Text className="p-4 text-sm text-destructive">{error?.message ?? 'This space was not found.'}</Text>;
  }

  return (
    <View className="flex-1 bg-background">
      <CanvasVisibleContext.Provider value={focused}>
        {/* Around the whole room: one clock for every device in it, and for the cards they open. */}
        <BlokTravelProvider source={travel.source}>
          <SpaceScene
            space={space}
            run={run}
            overlay={
              <>
                {taskId ? (
                  <RunChip
                    taskId={taskId}
                    name={task?.action.name}
                    missing={Boolean(task) && !run}
                    onClose={() => router.setParams({ task: '' })}
                  />
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={travel.open ? 'Back to live, and hide the history bar' : 'Show this space as it was at an earlier time'}
                  onPress={travel.toggle}
                  className={`absolute bottom-2 left-2 h-9 w-9 items-center justify-center rounded-lg border ${
                    travel.open ? 'border-amber-500/60 bg-amber-500/10' : 'border-border bg-background/90'
                  }`}
                >
                  <History size={18} color={travel.open ? '#f59e0b' : colors.foreground} />
                </Pressable>
              </>
            }
          />
        </BlokTravelProvider>
      </CanvasVisibleContext.Provider>
      {travel.open ? <TravelBar travel={travel} names={agentNames} /> : null}
    </View>
  );
}

export default function SpaceScreen() {
  const { id, task } = useLocalSearchParams<{ id: string; task?: string }>();
  return (
    <View className="flex-1 bg-background">
      <Guard.Lok connectingFallback={<TasksLoadingState message="Connecting…" />}>
        <Guard.Rekuest fallback={<RekuestUnavailable />}>
          <SpaceContent key={id} id={id} taskId={task ? task : null} />
        </Guard.Rekuest>
      </Guard.Lok>
    </View>
  );
}
