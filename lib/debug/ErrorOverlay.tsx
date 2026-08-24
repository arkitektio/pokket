import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { clearErrors, isFailure, LoggedError, useErrorLog } from './errorLog';

/**
 * The on-screen half of the error log.
 *
 * Collapsed it is a small badge that only exists once something has gone wrong,
 * so it costs nothing on a healthy screen. Tapping it opens the list; tapping an
 * entry opens its detail.
 */

const SOURCE_STYLE: Record<LoggedError['source'], string> = {
  graphql: 'bg-destructive',
  network: 'bg-destructive',
  websocket: 'bg-accent',
  js: 'bg-destructive',
  promise: 'bg-accent',
  console: 'bg-muted',
  request: 'bg-secondary',
};

const time = (at: number) => new Date(at).toLocaleTimeString();

const Entry = ({ entry }: { entry: LoggedError }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <Pressable
      onPress={() => setOpen((previous) => !previous)}
      className="border-b border-border px-4 py-3">
      <View className="flex-row items-center gap-2">
        <View className={`rounded px-1.5 py-0.5 ${SOURCE_STYLE[entry.source]}`}>
          <Text className="text-[10px] font-bold uppercase text-foreground">{entry.source}</Text>
        </View>
        <Text className="text-[10px] text-muted-foreground">{time(entry.at)}</Text>
        {entry.count > 1 ? (
          <Text className="text-[10px] font-bold text-muted-foreground">×{entry.count}</Text>
        ) : null}
      </View>

      <Text className="mt-1 text-sm text-foreground" numberOfLines={open ? undefined : 2}>
        {entry.title}
      </Text>

      {open && entry.detail ? (
        <Text className="mt-2 font-mono text-[11px] text-muted-foreground">{entry.detail}</Text>
      ) : null}

      {!open && entry.detail ? (
        <Text className="mt-1 text-[10px] text-muted-foreground">tap for detail</Text>
      ) : null}
    </Pressable>
  );
};

export const ErrorOverlay = ({ enabled = __DEV__ }: { enabled?: boolean }) => {
  const entries = useErrorLog();
  const [open, setOpen] = React.useState(false);
  const [failuresOnly, setFailuresOnly] = React.useState(true);

  const failures = React.useMemo(() => entries.filter(isFailure), [entries]);
  const shown = failuresOnly ? failures : entries;

  if (!enabled || entries.length === 0) return null;

  if (!open) {
    // Traffic alone is not worth a badge, but it is worth being able to open:
    // a muted badge when nothing has failed still gets you into the request log.
    const clean = failures.length === 0;
    return (
      <Pressable
        onPress={() => setOpen(true)}
        className={`absolute bottom-24 right-4 z-50 rounded-full px-3 py-2 ${
          clean ? 'bg-secondary' : 'bg-destructive'
        }`}>
        <Text className="text-xs font-bold text-foreground">
          {clean ? `· ${entries.length}` : `⚠ ${failures.length}`}
        </Text>
      </Pressable>
    );
  }

  return (
    /* Covers the app rather than reflowing it — this is a debugging aid and
       must not change the layout it is being used to inspect. */
    <View className="absolute inset-0 z-50 bg-background/95 pt-16">
      <View className="flex-row items-center justify-between border-b border-border px-4 pb-3">
        <Text className="text-base font-bold text-foreground">
          {failuresOnly ? 'Errors' : 'All'} ({shown.length})
        </Text>
        <View className="flex-row gap-4">
          <Pressable onPress={() => setFailuresOnly((previous) => !previous)}>
            <Text className="text-sm text-muted-foreground">
              {failuresOnly ? 'Show requests' : 'Errors only'}
            </Text>
          </Pressable>
          <Pressable onPress={clearErrors}>
            <Text className="text-sm text-muted-foreground">Clear</Text>
          </Pressable>
          <Pressable onPress={() => setOpen(false)}>
            <Text className="text-sm text-primary">Close</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1">
        {shown.map((entry) => (
          <Entry key={entry.id} entry={entry} />
        ))}
      </ScrollView>
    </View>
  );
};
