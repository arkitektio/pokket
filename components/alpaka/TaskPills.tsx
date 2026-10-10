import { Text } from '@/components/ui/text';
import { type ActiveTask, isSettled } from '@/lib/alpaka/chat/activeTasks';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Check, CircleAlert, CircleSlash, Square, X } from 'lucide-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';

/** The replyers at work on this room, above the composer: what each is doing, and a way to stop it. */
export function TaskPills({
  tasks,
  onCancel,
  onDismiss,
}: {
  tasks: readonly ActiveTask[];
  onCancel: (task: ActiveTask) => void;
  onDismiss: (reference: string) => void;
}) {
  const colors = useThemeColors();
  if (tasks.length === 0) return null;
  return (
    <View className="gap-1.5 px-3 pb-1.5">
      {tasks.map((task) => {
        const settled = isSettled(task.status);
        const progress = typeof task.progress === 'number' ? Math.max(0, Math.min(100, task.progress)) : null;
        return (
          <View key={task.reference} className="overflow-hidden rounded-xl border border-border bg-card">
            <View className="flex-row items-center gap-2 px-3 py-2">
              {task.status === 'DONE' ? (
                <Check size={16} color={colors.primary} />
              ) : task.status === 'ERROR' ? (
                <CircleAlert size={16} color={colors.destructive} />
              ) : task.status === 'CANCELLED' ? (
                <CircleSlash size={16} color={colors.mutedForeground} />
              ) : (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
              <View className="flex-1">
                <Text numberOfLines={1} className="text-sm font-medium text-card-foreground">
                  {task.actionName}
                  {progress != null && !settled ? ` · ${Math.round(progress)}%` : ''}
                </Text>
                {task.message ? (
                  <Text numberOfLines={task.status === 'ERROR' ? 3 : 1} className={`text-xs ${task.status === 'ERROR' ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {task.message}
                  </Text>
                ) : null}
              </View>
              {settled ? (
                <Pressable hitSlop={10} onPress={() => onDismiss(task.reference)} accessibilityLabel="Dismiss">
                  <X size={16} color={colors.mutedForeground} />
                </Pressable>
              ) : (
                <Pressable
                  hitSlop={10}
                  disabled={!task.id}
                  onPress={() => onCancel(task)}
                  accessibilityLabel="Stop the replyer"
                  className={task.id ? '' : 'opacity-40'}
                >
                  <Square size={14} color={colors.foreground} fill={colors.foreground} />
                </Pressable>
              )}
            </View>
            {progress != null && !settled ? (
              <View className="h-0.5 bg-muted">
                <View style={{ width: `${progress}%` }} className="h-0.5 bg-primary" />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
