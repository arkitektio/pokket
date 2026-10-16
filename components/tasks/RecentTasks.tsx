import { TaskRow } from '@/components/tasks/TaskRow';
import { Text } from '@/components/ui/text';
import { Ordering, type TaskFilter, useListTasksQuery } from '@/lib/rekuest/api/graphql';
import { useTaskStream } from '@/lib/rekuest/useTaskStream';
import { ActivityIndicator, View } from 'react-native';

/**
 * The last few tasks matching `filter` (an agent's, an implementation's),
 * newest first, moving with the task stream. Nothing when there are none.
 */
export function RecentTasks({ filter, title = 'Recent tasks', limit = 5 }: { filter: TaskFilter; title?: string; limit?: number }) {
  useTaskStream();
  const { data, loading } = useListTasksQuery({
    variables: { filter, ordering: [{ createdAt: Ordering.Desc }], pagination: { limit, offset: 0 } },
    fetchPolicy: 'cache-and-network',
  });
  const tasks = data?.tasks ?? [];
  if (!loading && tasks.length === 0) return null;

  return (
    <View className="gap-2">
      <Text className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</Text>
      {loading && tasks.length === 0 ? (
        <ActivityIndicator className="py-4" />
      ) : (
        <View className="overflow-hidden rounded-xl border border-border">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </View>
      )}
    </View>
  );
}
