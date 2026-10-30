import * as React from 'react';
import {Pressable, View, type GestureResponderEvent, type LayoutChangeEvent} from 'react-native';
import {Pause, Play, Radio, SkipBack, SkipForward} from 'lucide-react-native';
import {Text} from '@/components/ui/text';
import {cn} from '@/lib/utils';
import {useThemeColors} from '@/lib/theme/BrandProvider';
import type {BlokTravel} from '@/lib/rekuest/travel/useBlokTravel';
import type {TravelRevision} from '@/lib/rekuest/travel/travelSource';

/**
 * The controls of travelling back, for a thumb (orkestrator's `TravelBar`):
 * step to the change before or after, play on from the moment, drag through
 * the last while, and go back to live. It is also what says that the past is
 * shown. With `names`, a second way through the past: one revision of one
 * agent at a time.
 */

const MINUTE = 60_000;

/** How far back the slider reaches; it reaches further by itself once the moment lies before it. */
export const TRAVEL_WINDOWS = [
  {ms: 15 * MINUTE, label: '15 min'},
  {ms: 60 * MINUTE, label: '1 h'},
  {ms: 6 * 60 * MINUTE, label: '6 h'},
  {ms: 24 * 60 * MINUTE, label: '24 h'},
] as const;

const RATES = [1, 4, 16] as const;

/** The wall clock, once a second: the slider's right end is the present. */
const useWallClock = (): number => {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  return now;
};

const two = (value: number) => String(value).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The time of day, with the day in front when it is not today. */
export const formatMoment = (at: number, now: number): string => {
  const moment = new Date(at);
  const today = new Date(now);
  const time = `${two(moment.getHours())}:${two(moment.getMinutes())}:${two(moment.getSeconds())}`;
  const sameDay =
    moment.getFullYear() === today.getFullYear() &&
    moment.getMonth() === today.getMonth() &&
    moment.getDate() === today.getDate();
  return sameDay ? time : `${moment.getDate()} ${MONTHS[moment.getMonth()]} ${time}`;
};

/** How long ago, in its largest whole unit. */
export const formatAgo = (at: number, now: number): string => {
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 60) return `${seconds} s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
};

/** Where along `[min, max]` a finger at `x` of a track `width` wide stands, rounded to whole seconds. */
export const sliderValueAt = (x: number, width: number, min: number, max: number): number => {
  if (width <= 0 || max <= min) return max;
  const fraction = Math.min(1, Math.max(0, x / width));
  return Math.round((min + fraction * (max - min)) / 1000) * 1000;
};

/**
 * A slider over a stretch of time, drawn in JS: the phone has no native one.
 * It keeps the finger once it has it, so a scroll view around it cannot take
 * the drag away.
 */
export const TimeSlider = ({
  value,
  min,
  max,
  onChange,
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
}) => {
  const width = React.useRef(0);
  const last = React.useRef(value);
  // Where the track starts on the screen: `locationX` is measured against whatever is under the finger.
  const origin = React.useRef(0);
  const valueAt = (event: GestureResponderEvent) =>
    sliderValueAt(event.nativeEvent.pageX - origin.current, width.current, min, max);
  const move = (event: GestureResponderEvent) => {
    const next = valueAt(event);
    if (next === last.current) return;
    last.current = next;
    onChange(next);
  };
  const release = () => onCommit(last.current);

  const fraction = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 1;
  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel="Moment shown"
      className="h-8 flex-1 justify-center"
      onLayout={(event: LayoutChangeEvent) => {
        width.current = event.nativeEvent.layout.width;
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={event => {
        origin.current = event.nativeEvent.pageX - event.nativeEvent.locationX;
        last.current = valueAt(event);
        onChange(last.current);
      }}
      onResponderMove={move}
      onResponderRelease={release}
      onResponderTerminate={release}
    >
      <View pointerEvents="none" className="h-1 rounded-full bg-muted">
        <View className="h-1 rounded-full bg-amber-500" style={{width: `${fraction * 100}%`}} />
      </View>
      <View
        pointerEvents="none"
        className="absolute h-4 w-4 rounded-full border-2 border-background bg-amber-500"
        style={{left: `${fraction * 100}%`, marginLeft: -8}}
      />
    </View>
  );
};

const IconButton = ({
  label,
  disabled,
  onPress,
  children,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    disabled={disabled}
    onPress={onPress}
    hitSlop={6}
    className={cn('h-9 w-9 items-center justify-center rounded-lg active:bg-muted', disabled && 'opacity-40')}
  >
    {children}
  </Pressable>
);

const Chip = ({label, active, onPress}: {label: string; active: boolean; onPress: () => void}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{selected: active}}
    onPress={onPress}
    className={cn('rounded-full border px-2.5 py-1', active ? 'border-primary bg-primary' : 'border-border bg-card')}
  >
    <Text className={cn('text-xs font-medium', active ? 'text-primary-foreground' : 'text-foreground')}>{label}</Text>
  </Pressable>
);

/** What the revision shown changed: stepping an agent also passes states this blok does not show. */
const revisionLine = (standing: TravelRevision): string => {
  if (standing.revision === null) return 'Finding the revision…';
  const head = `Revision ${standing.revision}${standing.last !== null ? ` of ${standing.last}` : ''}`;
  const first = standing.changes[0];
  if (!first) return `${head} · start of the session`;
  const more = standing.changes.length > 1 ? ` +${standing.changes.length - 1}` : '';
  return `${head} · ${first.interface} ${first.op} ${first.path}${more}`;
};

export const TravelBar = ({
  travel,
  names,
  className,
}: {
  travel: BlokTravel;
  /** Puts a name to the agents shown, and offers stepping through their revisions. */
  names?: ReadonlyMap<string, string>;
  className?: string;
}) => {
  const colors = useThemeColors();
  const now = useWallClock();
  const [windowMs, setWindowMs] = React.useState<number>(TRAVEL_WINDOWS[1].ms);
  const {clock, travelling} = travel;

  const at = travelling ? Math.min(clock.at, now) : now;
  const start = Math.min(now - windowMs, at);
  const missing = travelling ? clock.missing.map(id => names?.get(id) ?? id) : [];

  const agents = names ? [...names] : [];
  const byRevision = agents.length > 0 && travel.mode === 'revisions';
  const agentId =
    travel.revisionAgent !== null && names?.has(travel.revisionAgent) ? travel.revisionAgent : agents[0]?.[0];
  // Only while the past is shown: the source keeps its last revision when the screen goes live.
  const standing = byRevision && travelling ? clock.revision : null;
  const icon = (enabled: boolean) => (enabled ? colors.foreground : colors.mutedForeground);

  return (
    <View
      className={cn(
        'gap-2 border-t bg-background px-3 pb-3 pt-2',
        travelling ? 'border-amber-500/50' : 'border-border',
        className,
      )}
    >
      <View className="flex-row items-center gap-2">
        {travelling ? (
          <View className="rounded-md border border-amber-500/60 bg-amber-500/10 px-2 py-0.5">
            <Text className="text-xs font-semibold text-amber-500">PAST</Text>
          </View>
        ) : (
          <View className="rounded-md border border-emerald-500/60 bg-emerald-500/10 px-2 py-0.5">
            <Text className="text-xs font-semibold text-emerald-500">LIVE</Text>
          </View>
        )}
        <View className="flex-1">
          {travelling ? (
            <Text className={cn('text-xs text-foreground', clock.phase === 'loading' && 'opacity-60')}>
              <Text className="text-xs font-semibold text-foreground">{formatMoment(at, now)}</Text>{' '}
              <Text className="text-xs text-muted-foreground">{formatAgo(at, now)}</Text>
            </Text>
          ) : (
            <Text className="text-xs text-muted-foreground">Step or drag back to see an earlier moment.</Text>
          )}
        </View>
        {travelling ? (
          <Pressable
            accessibilityRole="button"
            onPress={travel.goLive}
            className="flex-row items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 active:bg-muted"
          >
            <Radio size={14} color={colors.foreground} />
            <Text className="text-xs font-medium text-foreground">Go live</Text>
          </Pressable>
        ) : null}
      </View>

      {agents.length > 0 ? (
        <View className="flex-row flex-wrap items-center gap-1.5">
          <Chip label="Time" active={!byRevision} onPress={() => travel.setMode('time', agentId)} />
          <Chip label="Revisions" active={byRevision} onPress={() => travel.setMode('revisions', agentId)} />
          {byRevision && agents.length > 1
            ? agents.map(([id, name]) => (
                <Chip key={id} label={name} active={id === agentId} onPress={() => travel.setMode('revisions', id)} />
              ))
            : null}
        </View>
      ) : null}

      {byRevision ? (
        <View className="flex-row items-center gap-1">
          <IconButton
            label="To the revision before"
            disabled={travelling && !standing?.hasPrev}
            onPress={() => travel.step(-1)}
          >
            <SkipBack size={18} color={icon(!travelling || !!standing?.hasPrev)} />
          </IconButton>
          <IconButton
            label="To the next revision"
            disabled={!travelling || !standing?.hasNext}
            onPress={() => travel.step(1)}
          >
            <SkipForward size={18} color={icon(travelling && !!standing?.hasNext)} />
          </IconButton>
          <Text numberOfLines={1} className="flex-1 font-mono text-xs text-muted-foreground">
            {standing ? revisionLine(standing) : 'Step back to the revision before the latest.'}
          </Text>
        </View>
      ) : (
        <>
          <View className="flex-row items-center gap-1">
            <IconButton
              label="To before the previous change"
              disabled={travelling && clock.prevChangeAt === null}
              onPress={() => travel.step(-1)}
            >
              <SkipBack size={18} color={icon(!travelling || clock.prevChangeAt !== null)} />
            </IconButton>
            <IconButton
              label={clock.playing ? 'Pause' : 'Play on from here'}
              disabled={!travelling}
              onPress={() => (clock.playing ? travel.pause() : travel.play())}
            >
              {clock.playing ? <Pause size={18} color={icon(travelling)} /> : <Play size={18} color={icon(travelling)} />}
            </IconButton>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Playback speed"
              onPress={() =>
                travel.setRate(RATES[(RATES.indexOf(clock.rate as (typeof RATES)[number]) + 1) % RATES.length])
              }
              className="h-9 w-9 items-center justify-center rounded-lg active:bg-muted"
            >
              <Text className="text-xs font-medium text-foreground">{clock.rate}×</Text>
            </Pressable>
            <IconButton
              label="To the next change"
              disabled={!travelling || clock.nextChangeAt === null}
              onPress={() => travel.step(1)}
            >
              <SkipForward size={18} color={icon(travelling && clock.nextChangeAt !== null)} />
            </IconButton>
            <View className="mx-1 flex-1">
              <TimeSlider value={at} min={start} max={now} onChange={travel.scrub} onCommit={travel.commit} />
            </View>
          </View>
          <View className="flex-row flex-wrap gap-1.5">
            {TRAVEL_WINDOWS.map(option => (
              <Chip
                key={option.ms}
                label={option.label}
                active={option.ms === windowMs}
                onPress={() => setWindowMs(option.ms)}
              />
            ))}
          </View>
        </>
      )}

      {missing.length > 0 ? (
        <Text numberOfLines={2} className="text-xs text-amber-500">
          Nothing recorded for {missing.join(', ')}
        </Text>
      ) : null}
    </View>
  );
};
