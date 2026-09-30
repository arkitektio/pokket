import { Text } from '@/components/ui/text';
import { TaskEventKind } from '@/lib/rekuest/api/graphql';
import { BUCKET_COLORS, StatusBucket, statusBucket, statusLabel } from '@/lib/rekuest/taskStatus';
import { Ban, CircleCheck, CircleDashed, CircleX, Clock, LoaderCircle, LucideIcon, Pause, TriangleAlert } from 'lucide-react-native';
import * as React from 'react';
import { Animated, Easing, View } from 'react-native';

const BUCKET_ICONS: Record<StatusBucket, LucideIcon> = {
  queued: Clock,
  running: LoaderCircle,
  paused: Pause,
  done: CircleCheck,
  error: CircleX,
  cancelled: Ban,
  lost: TriangleAlert,
};

function Spinning({ children }: { children: React.ReactNode }) {
  const spin = React.useState(() => new Animated.Value(0))[0];
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <Animated.View style={{ transform: [{ rotate }] }}>{children}</Animated.View>;
}

export function TaskStatusIcon({ kind, isDone, size = 18 }: { kind: TaskEventKind; isDone: boolean; size?: number }) {
  const bucket = statusBucket(kind, isDone);
  const Icon = BUCKET_ICONS[bucket] ?? CircleDashed;
  const icon = <Icon size={size} color={BUCKET_COLORS[bucket]} />;
  return bucket === 'running' ? <Spinning>{icon}</Spinning> : icon;
}

/** Icon and label in the status colour, on a faint tint of it. */
export function TaskStatusBadge({ kind, isDone }: { kind: TaskEventKind; isDone: boolean }) {
  const color = BUCKET_COLORS[statusBucket(kind, isDone)];
  return (
    <View style={{ backgroundColor: `${color}22` }} className="flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1">
      <TaskStatusIcon kind={kind} isDone={isDone} size={14} />
      <Text style={{ color }} className="text-xs font-semibold">
        {statusLabel(kind, isDone)}
      </Text>
    </View>
  );
}

/**
 * A thin bar. With a value, how far along; without one, an indeterminate
 * sweep for "running, but no progress reported".
 */
export function ProgressBar({ value, color, className }: { value: number | null; color: string; className?: string }) {
  const sweep = React.useState(() => new Animated.Value(0))[0];
  const [width, setWidth] = React.useState(0);
  const indeterminate = value == null;

  React.useEffect(() => {
    if (!indeterminate) return;
    const loop = Animated.loop(
      Animated.timing(sweep, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [indeterminate, sweep]);

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      className={`h-1.5 overflow-hidden rounded-full bg-muted ${className ?? ''}`}
    >
      {indeterminate ? (
        <Animated.View
          style={{
            width: width / 3,
            backgroundColor: color,
            transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-width / 3, width] }) }],
          }}
          className="h-full rounded-full"
        />
      ) : (
        <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }} className="h-full rounded-full" />
      )}
    </View>
  );
}

/** Re-render every second while `active`, for elapsed clocks. */
export const useNow = (active: boolean) => {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
};
