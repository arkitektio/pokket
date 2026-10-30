import * as React from 'react';
import {ActivityIndicator, View} from 'react-native';
import {LayoutDashboard} from 'lucide-react-native';
import {Link} from 'expo-router';
import {MaterializedBlokRenderer} from '@/components/blok/MaterializedBlokRenderer';
import {Text} from '@/components/ui/text';
import {idleTaskRecord, withTaskStatus, type BlokTaskRecord} from '@arkitektio/bsx/runtime';
import {
  ComponentContext,
  TaskBlokStatus,
  useMaterializedBlokQuery,
  type MaterializedBlokFragment,
} from '@/lib/rekuest/api/graphql';
import {useThemeColors} from '@/lib/theme/BrandProvider';
import {cn} from '@/lib/utils';

/** Where an ask through a blok stands, and its answer once there is one. */
export type BlokAsk = {
  status: TaskBlokStatus;
  values?: Record<string, unknown> | null;
  /** The user (sub) who answered or dismissed it. */
  decidedBy?: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** An ask through a blok as the `task` record its tree reads: asking while it waits, then settled with the answer. */
export const askRecord = (status: TaskBlokStatus, values: unknown): BlokTaskRecord => {
  const answer = isRecord(values) ? values : null;
  if (status === TaskBlokStatus.Waiting) {
    return {...withTaskStatus(idleTaskRecord(), 'asking'), ask: {question: '', form: {}}};
  }
  // Shown: an inform blok, beside a task that goes on.
  if (status === TaskBlokStatus.Shown) return withTaskStatus(idleTaskRecord(), 'running');
  const settled = status === TaskBlokStatus.Dismissed || status === TaskBlokStatus.Gone ? 'cancelled' : 'done';
  return {...withTaskStatus(idleTaskRecord(), settled), answer};
};

const formatValue = (value: unknown): string =>
  typeof value === 'string' ? value : value === null || value === undefined ? '—' : JSON.stringify(value);

/** What became of the ask, under the blok once it is settled. Who answered is a lok sub, not a name, so it stays unnamed. */
export const answerLine = (ask: BlokAsk): string => {
  const by = 'someone';
  if (ask.status === TaskBlokStatus.Dismissed) return `Dismissed by ${by}`;
  if (ask.status === TaskBlokStatus.Gone) return 'Nobody answered before the task ended';
  const values = Object.entries(ask.values ?? {});
  return values.length === 0
    ? `Answered by ${by}`
    : `Answered by ${by}: ${values.map(([key, value]) => (values.length > 1 ? `${key} ${formatValue(value)}` : formatValue(value))).join(', ')}`;
};

/**
 * A materialization shown in the flow of a task (orkestrator's
 * `MaterializedBlokEmbed`): its name and a link to its own screen over the blok
 * itself. With an `ask`, its tree reads it as `task` (`task.ask` while it
 * waits, `task.answer` once answered); while the ask waits `task.answer(...)`
 * goes to `onReturn`, and once settled the blok is frozen with the answer
 * under it.
 */
export const TaskBlokEmbed = ({
  materialized,
  ask,
  onReturn,
  className,
}: {
  materialized: MaterializedBlokFragment;
  ask?: BlokAsk;
  onReturn?: (values: Record<string, unknown>) => unknown;
  className?: string;
}) => {
  const colors = useThemeColors();
  const waiting = ask?.status === TaskBlokStatus.Waiting;
  const frozen = ask !== undefined && !waiting;
  const status = ask?.status;
  const values = ask?.values;
  const task = React.useMemo<BlokTaskRecord | undefined>(
    () => (status === undefined ? undefined : askRecord(status, values)),
    [status, values],
  );
  // A 3D view gets a box of its own; a panel takes the height it needs.
  const scene = materialized.blok.context === ComponentContext.Scene;

  return (
    <View className={cn('gap-1.5', className)}>
      <View className="flex-row items-center gap-2 px-1">
        <LayoutDashboard size={14} color={colors.mutedForeground} />
        <Text numberOfLines={1} className="flex-1 text-xs text-muted-foreground">
          {materialized.name || materialized.blok.name}
        </Text>
        <Link href={`/bloks/${materialized.id}`}>
          <Text className="text-xs text-primary">Open</Text>
        </Link>
      </View>
      <View
        pointerEvents={frozen ? 'none' : 'auto'}
        aria-disabled={frozen || undefined}
        className={cn(scene ? 'h-72 overflow-hidden rounded-xl' : undefined, frozen && 'opacity-80')}
      >
        <MaterializedBlokRenderer
          materializedBlok={materialized}
          task={task}
          onAnswer={waiting ? onReturn : undefined}
          fill={scene}
        />
      </View>
      {frozen && ask ? <Text className="px-1 text-[11px] text-muted-foreground">{answerLine(ask)}</Text> : null}
    </View>
  );
};

/** {@link TaskBlokEmbed}, for a materialization known by its id. */
export const TaskBlokEmbedById = ({id, ...props}: Omit<React.ComponentProps<typeof TaskBlokEmbed>, 'materialized'> & {id: string}) => {
  const {data, loading, error} = useMaterializedBlokQuery({variables: {id}});
  const materialized = data?.materializedBlok;
  if (materialized) return <TaskBlokEmbed materialized={materialized} {...props} />;
  return (
    <View className="py-1">
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Text className="text-xs text-muted-foreground">{error?.message ?? 'This blok was not found.'}</Text>
      )}
    </View>
  );
};
