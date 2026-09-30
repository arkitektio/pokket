import { Text } from '@/components/ui/text';
import { ListTaskFragment } from '@/lib/rekuest/api/graphql';
import { bucketColor, formatDuration, formatTaskTime, isLive, liveState } from '@/lib/rekuest/taskStatus';
import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';
import { ProgressBar, TaskStatusIcon, useNow } from './status';

/**
 * One task: status, action, who runs it and when; while it runs, its
 * progress and latest message, moving with the task stream.
 */
export function TaskRow({ task: t }: { task: ListTaskFragment }) {
  const live = isLive(t);
  const now = useNow(live);
  const state = liveState(t.events, live);
  const started = new Date(t.createdAt).getTime();
  const ended = t.finishedAt ? new Date(t.finishedAt).getTime() : live ? now : null;
  const duration = ended != null ? formatDuration(ended - started) : '';
  const detail = [t.agent?.name, formatTaskTime(t.createdAt), duration].filter(Boolean).join(' · ');
  const color = bucketColor(t.latestEventKind, t.isDone);

  return (
    <Link href={`/tasks/${t.id}`} asChild>
      <Pressable className="flex-row items-center gap-3 border-b border-border bg-background px-4 py-3 active:bg-muted">
        <TaskStatusIcon kind={t.latestEventKind} isDone={t.isDone} size={22} />
        <View className="flex-1 gap-0.5">
          <Text numberOfLines={1} className="text-base font-medium text-foreground">
            {t.action.name}
          </Text>
          <Text numberOfLines={1} className="text-xs text-muted-foreground">
            {detail}
          </Text>
          {live ? (
            <View className="mt-1 gap-1">
              <ProgressBar value={state.progress} color={color} />
              {state.message ? (
                <Text numberOfLines={1} className="text-xs text-muted-foreground">
                  {state.progress != null ? `${state.progress}% · ` : ''}
                  {state.message}
                </Text>
              ) : null}
            </View>
          ) : state.error ? (
            <Text numberOfLines={1} style={{ color }} className="text-xs">
              {state.error}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}
