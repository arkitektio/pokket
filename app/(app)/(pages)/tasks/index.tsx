import { TaskRow } from '@/components/tasks/TaskRow';
import { RekuestUnavailable, TasksEmptyState, TasksLoadingState } from '@/components/tasks/states';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { Ordering, TaskFilter, useListTasksQuery } from '@/lib/rekuest/api/graphql';
import { useTaskStream } from '@/lib/rekuest/useTaskStream';
import { useTabTitle } from '@/lib/tabs/TabsProvider';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';

const PAGE = 30;

const VIEWS = [
  { key: 'all', label: 'All', filter: {}, empty: 'No tasks yet.' },
  { key: 'running', label: 'Running', filter: { isDone: false }, empty: 'Nothing is running right now.' },
  { key: 'finished', label: 'Finished', filter: { isDone: true }, empty: 'No finished tasks yet.' },
] as const satisfies readonly { key: string; label: string; filter: TaskFilter; empty: string }[];

type View_ = (typeof VIEWS)[number];

/**
 * The one task stream. Lives on the list, which stays mounted under a pushed
 * task, so both move with it.
 */
function TaskStream() {
  useTaskStream();
  return null;
}

function ViewChips({ active, onSelect }: { active: View_['key']; onSelect: (key: View_['key']) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="grow-0 border-b border-border">
      <View className="flex-row gap-2 px-4 py-2">
        {VIEWS.map((view) => {
          const selected = view.key === active;
          return (
            <Pressable
              key={view.key}
              onPress={() => onSelect(view.key)}
              className={`rounded-full border px-4 py-1.5 ${selected ? 'border-primary bg-primary' : 'border-border bg-card'}`}
            >
              <Text className={`text-sm font-medium ${selected ? 'text-primary-foreground' : 'text-foreground'}`}>
                {view.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function TaskList({ view }: { view: View_ }) {
  const colors = useThemeColors();
  const [refreshing, setRefreshing] = React.useState(false);
  const [exhausted, setExhausted] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);

  // Root tasks only: children show on their parent, and the stream covers roots.
  const { data, loading, error, refetch, fetchMore } = useListTasksQuery({
    variables: {
      filter: { ...view.filter, rootIsnull: true },
      ordering: [{ createdAt: Ordering.Desc }],
      pagination: { limit: PAGE, offset: 0 },
    },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: false,
  });
  const tasks = data?.tasks ?? [];

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
      setExhausted(false);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const onEndReached = React.useCallback(async () => {
    if (exhausted || loadingMore || loading || tasks.length < PAGE) return;
    setLoadingMore(true);
    try {
      const result = await fetchMore({
        variables: { pagination: { limit: PAGE, offset: tasks.length } },
        updateQuery: (prev, { fetchMoreResult }) => {
          const known = new Set(prev.tasks.map((t) => t.id));
          return { ...prev, tasks: [...prev.tasks, ...fetchMoreResult.tasks.filter((t) => !known.has(t.id))] };
        },
      });
      if (result.data.tasks.length < PAGE) setExhausted(true);
    } finally {
      setLoadingMore(false);
    }
  }, [exhausted, loadingMore, loading, tasks.length, fetchMore]);

  if (loading && tasks.length === 0) return <TasksLoadingState message="Loading tasks…" />;

  return (
    <FlatList
      data={tasks}
      keyExtractor={(t) => t.id}
      renderItem={({ item }) => <TaskRow task={item} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        error ? <Text className="px-4 py-2 text-sm text-destructive">Could not load tasks: {error.message}</Text> : null
      }
      ListEmptyComponent={
        <TasksEmptyState title="No tasks" description={view.empty} />
      }
      ListFooterComponent={loadingMore ? <ActivityIndicator className="py-4" color={colors.primary} /> : null}
    />
  );
}

export default function TasksScreen() {
  // The view is in the URL, so the tab and these chips name the same page.
  const { view: key } = useLocalSearchParams<{ view?: string }>();
  const view = VIEWS.find((v) => v.key === key) ?? VIEWS[0];
  const setView = (next: View_['key']) => router.setParams({ view: next === 'all' ? undefined : next });
  useTabTitle(view.key === 'all' ? 'Tasks' : `Tasks · ${view.label}`);

  return (
    <View className="flex-1 bg-background">
      <Guard.Lok connectingFallback={<TasksLoadingState message="Connecting…" />}>
        <Guard.Rekuest fallback={<RekuestUnavailable />}>
          <TaskStream />
          <ViewChips active={view.key} onSelect={setView} />
          <TaskList key={view.key} view={view} />
        </Guard.Rekuest>
      </Guard.Lok>
    </View>
  );
}
