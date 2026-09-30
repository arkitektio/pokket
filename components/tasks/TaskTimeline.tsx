import { Text } from '@/components/ui/text';
import { ChildTaskFragment, DetailTaskFragment, TaskEventFragment, TaskEventKind } from '@/lib/rekuest/api/graphql';
import {
  bucketColor,
  eventColor,
  formatDuration,
  formatEventKind,
  formatTaskTime,
  isLive,
} from '@/lib/rekuest/taskStatus';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Link } from 'expo-router';
import { ChevronRight, GitBranch } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { PortValues } from './PortValues';
import { ProgressBar, TaskStatusIcon, useNow } from './status';

type Item =
  | { type: 'event'; at: number; event: TaskEventFragment }
  | { type: 'progress'; at: number; events: TaskEventFragment[] }
  | { type: 'child'; at: number; child: ChildTaskFragment }
  | { type: 'now'; at: number };

const time = (iso: string) => new Date(iso).getTime();

/**
 * The task's history, oldest first: its events, with runs of PROGRESS
 * collapsed into one step and child calls placed where they began.
 */
const buildItems = (task: DetailTaskFragment, live: boolean, now: number): Item[] => {
  const merged: Item[] = [
    ...task.events.map((event) => ({ type: 'event' as const, at: time(event.createdAt), event })),
    ...task.children.map((child) => ({ type: 'child' as const, at: time(child.createdAt), child })),
  ].sort((a, b) => a.at - b.at);

  const items: Item[] = [];
  for (const item of merged) {
    const last = items[items.length - 1];
    if (item.type === 'event' && item.event.kind === TaskEventKind.Progress) {
      if (last?.type === 'progress') {
        last.events.push(item.event);
        last.at = item.at;
      } else {
        items.push({ type: 'progress', at: item.at, events: [item.event] });
      }
      continue;
    }
    items.push(item);
  }
  if (live) items.push({ type: 'now', at: now });
  return items;
};

/** The rail: a dot on a line that joins the steps above and below. */
function Step({
  color,
  first,
  last,
  pulse,
  children,
}: {
  color: string;
  first: boolean;
  last: boolean;
  pulse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-row">
      <View className="w-7 items-center">
        <View className={`w-0.5 h-3 ${first ? '' : 'bg-border'}`} />
        <View style={{ borderColor: color, backgroundColor: pulse ? `${color}33` : color }} className="h-3 w-3 rounded-full border-2" />
        <View className={`w-0.5 flex-1 ${last ? '' : 'bg-border'}`} />
      </View>
      <View className="flex-1 pb-4 pl-1 pt-1.5">{children}</View>
    </View>
  );
}

function StepHeader({ title, at, color }: { title: string; at?: string; color?: string }) {
  return (
    <View className="flex-row items-baseline justify-between gap-2">
      <Text style={color ? { color } : undefined} className="shrink text-sm font-semibold text-foreground">
        {title}
      </Text>
      {at ? <Text className="text-xs text-muted-foreground">{formatTaskTime(at)}</Text> : null}
    </View>
  );
}

function EventStep({ event, task }: { event: TaskEventFragment; task: DetailTaskFragment }) {
  const color = eventColor(event.kind, event.level);
  const isYield = event.kind === TaskEventKind.Yield && event.returns != null;
  return (
    <>
      <StepHeader title={event.kind === TaskEventKind.Yield ? 'Result' : formatEventKind(event.kind)} at={event.createdAt} />
      {event.message ? (
        <Text
          selectable
          style={event.kind === TaskEventKind.Log ? undefined : { color }}
          className={`mt-0.5 text-sm ${event.kind === TaskEventKind.Log ? 'font-mono text-muted-foreground' : ''}`}
        >
          {event.message}
        </Text>
      ) : null}
      {isYield ? (
        <View className="mt-1.5 rounded-lg border border-border bg-card px-3">
          <PortValues ports={task.action.returns} values={event.returns} />
        </View>
      ) : null}
    </>
  );
}

function ProgressStep({ events, live }: { events: TaskEventFragment[]; live: boolean }) {
  const latest = events[events.length - 1];
  const message = [...events].reverse().find((e) => e.message)?.message;
  const value = latest.progress ?? null;
  return (
    <>
      <StepHeader title={value != null ? `Progress · ${value}%` : 'Progress'} at={latest.createdAt} />
      <ProgressBar value={value ?? (live ? null : 0)} color={eventColor(TaskEventKind.Progress)} className="mt-1.5" />
      {message ? <Text className="mt-1 text-sm text-muted-foreground">{message}</Text> : null}
      {events.length > 1 ? (
        <Text className="mt-0.5 text-[11px] text-muted-foreground/70">{events.length} updates</Text>
      ) : null}
    </>
  );
}

function ChildStep({ child }: { child: ChildTaskFragment }) {
  const colors = useThemeColors();
  return (
    <Link href={`/tasks/${child.id}`} asChild>
      <Pressable className="flex-row items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 active:bg-muted">
        <GitBranch size={14} color={colors.mutedForeground} />
        <View className="flex-1">
          <Text numberOfLines={1} className="text-sm font-medium text-card-foreground">
            {child.action.name}
          </Text>
          <Text numberOfLines={1} className="text-xs text-muted-foreground">
            {[child.callKey, formatTaskTime(child.createdAt)].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <TaskStatusIcon kind={child.latestEventKind} isDone={child.isDone} size={16} />
        <ChevronRight size={16} color={colors.mutedForeground} />
      </Pressable>
    </Link>
  );
}

/**
 * orkestrator's task lane, laid out for a phone: a vertical line of steps
 * from assignment to now. While the task runs, the last step ticks along.
 */
export function TaskTimeline({ task }: { task: DetailTaskFragment }) {
  const live = isLive(task);
  const now = useNow(live);
  const items = React.useMemo(() => buildItems(task, live, now), [task, live, now]);
  const started = time(task.createdAt);

  if (items.length === 0) {
    return <Text className="text-sm text-muted-foreground">No events yet.</Text>;
  }

  return (
    <View>
      {items.map((item, i) => {
        const first = i === 0;
        const last = i === items.length - 1;
        switch (item.type) {
          case 'event':
            return (
              <Step key={item.event.id} color={eventColor(item.event.kind, item.event.level)} first={first} last={last}>
                <EventStep event={item.event} task={task} />
              </Step>
            );
          case 'progress':
            return (
              <Step key={`p-${item.events[0].id}`} color={eventColor(TaskEventKind.Progress)} first={first} last={last}>
                <ProgressStep events={item.events} live={live && items[i + 1]?.type === 'now'} />
              </Step>
            );
          case 'child':
            return (
              <Step key={`c-${item.child.id}`} color={bucketColor(item.child.latestEventKind, item.child.isDone)} first={first} last={last}>
                <ChildStep child={item.child} />
              </Step>
            );
          case 'now':
            return (
              <Step key="now" color={bucketColor(task.latestEventKind, task.isDone)} first={first} last={last} pulse>
                <StepHeader title={`${formatEventKind(task.latestEventKind)} · ${formatDuration(now - started)}`} />
                <Text className="mt-0.5 text-xs text-muted-foreground">Live</Text>
              </Step>
            );
        }
      })}
    </View>
  );
}
