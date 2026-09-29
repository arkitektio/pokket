import { NamePlaceDialog } from '@/components/timeline/NamePlaceDialog';
import { TimelineMap } from '@/components/timeline/TimelineMap';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { showDetail, showPage } from '@/lib/navigation';
import { createPlace, VisitRow } from '@/lib/timeline/db';
import { formatDay, formatDistance, formatDuration, formatTime } from '@/lib/timeline/format';
import type { TripMode } from '@/lib/timeline/segment';
import { useTimelineSettings } from '@/lib/timeline/settings';
import { recordNow } from '@/lib/timeline/tracking';
import { DayEntry, nextDay, previousDay, startOfDay, useTimelineDay } from '@/lib/timeline/useTimelineDay';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Bike, Car, ChevronLeft, ChevronRight, Footprints, LocateFixed, MapPin, Route } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, View } from 'react-native';
import { toast } from 'sonner-native';

const MODE_ICONS: Record<TripMode, typeof Route> = { walk: Footprints, bike: Bike, vehicle: Car, unknown: Route };
const MODE_LABELS: Record<TripMode, string> = { walk: 'Walking', bike: 'Cycling', vehicle: 'Driving', unknown: 'Moving' };

function Entry({ entry, onVisit }: { entry: DayEntry; onVisit: (visit: VisitRow, placeId: string | null) => void }) {
  const colors = useThemeColors();
  if (entry.kind === 'visit') {
    const { visit, place } = entry;
    return (
      <Pressable onPress={() => onVisit(visit, place?.id ?? null)} className="flex-row items-center gap-3 px-4 py-3 active:bg-muted">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
          <MapPin size={18} color={colors.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-medium text-card-foreground">{place?.name ?? 'Unnamed place'}</Text>
          <Text className="text-xs text-muted-foreground">
            {formatTime(visit.start_ts)} – {formatTime(visit.end_ts)} · {formatDuration(visit.end_ts - visit.start_ts)}
          </Text>
        </View>
        {!place ? <Text className="text-xs text-primary">Name</Text> : <ChevronRight size={16} color={colors.mutedForeground} />}
      </Pressable>
    );
  }
  const { trip } = entry;
  const Icon = MODE_ICONS[trip.mode];
  return (
    <View className="flex-row items-center gap-3 px-4 py-2.5">
      <View className="h-9 w-9 items-center justify-center">
        <Icon size={16} color={colors.mutedForeground} />
      </View>
      <Text className="flex-1 text-sm text-muted-foreground">
        {MODE_LABELS[trip.mode]} · {formatDistance(trip.distance_m)} · {formatDuration(trip.end_ts - trip.start_ts)}
      </Text>
    </View>
  );
}

export default function TimelineScreen() {
  const colors = useThemeColors();
  const { settings, loaded } = useTimelineSettings();
  const [today] = React.useState(() => startOfDay(Date.now()));
  const [dayStart, setDayStart] = React.useState(today);
  const { day, error, reload } = useTimelineDay(dayStart);
  const [naming, setNaming] = React.useState<VisitRow | null>(null);
  const isToday = dayStart >= today;
  const [recording, setRecording] = React.useState(false);

  const onRecordNow = async () => {
    setRecording(true);
    try {
      const result = await recordNow();
      if (result.kind === 'denied') {
        toast.error('Location is turned off for pokket', {
          action: { label: 'Settings', onClick: () => void Linking.openSettings() },
        });
        return;
      }
      toast.success(result.accuracy != null ? `Recorded (±${Math.round(result.accuracy)} m)` : 'Recorded');
      setDayStart(startOfDay(Date.now()));
      reload();
    } catch (e) {
      toast.error(`Could not get a location: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRecording(false);
    }
  };

  const onVisit = (visit: VisitRow, placeId: string | null) => {
    if (placeId) showDetail(`/timeline/place/${placeId}`);
    else setNaming(visit);
  };

  const visits = React.useMemo(
    () => day?.entries.flatMap((e) => (e.kind === 'visit' ? [e.visit] : [])) ?? [],
    [day],
  );

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-4 px-4 py-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => setDayStart(previousDay(dayStart))} className="rounded-lg p-2 active:bg-muted">
            <ChevronLeft size={20} color={colors.foreground} />
          </Pressable>
          <Pressable onPress={() => setDayStart(today)}>
            <Text className="text-base font-semibold text-foreground">{isToday ? 'Today' : formatDay(dayStart)}</Text>
          </Pressable>
          <Pressable
            onPress={() => setDayStart(nextDay(dayStart))}
            disabled={isToday}
            className={`rounded-lg p-2 active:bg-muted ${isToday ? 'opacity-30' : ''}`}
          >
            <ChevronRight size={20} color={colors.foreground} />
          </Pressable>
        </View>

        {loaded && !settings.enabled ? (
          <Card className="border-border bg-card">
            <CardContent className="gap-2 py-4">
              <Text className="text-base font-medium text-card-foreground">Recording is off</Text>
              <Text className="text-sm text-muted-foreground">
                Switch on the location timeline in Settings to remember where you have been. It stays on this phone.
              </Text>
              <Pressable onPress={() => showPage('/settings')} className="self-start rounded-lg bg-primary px-3 py-2 active:opacity-80">
                <Text className="text-sm font-medium text-primary-foreground">Open Settings</Text>
              </Pressable>
            </CardContent>
          </Card>
        ) : null}

        <Pressable
          onPress={() => void onRecordNow()}
          disabled={recording}
          className={`flex-row items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 active:opacity-80 ${recording ? 'opacity-70' : ''}`}
        >
          {recording ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <LocateFixed size={18} color={colors.primaryForeground} />
          )}
          <Text className="text-sm font-medium text-primary-foreground">{recording ? 'Locating…' : 'Record now'}</Text>
        </Pressable>

        {error ? <Text className="text-sm text-destructive">Could not read the timeline: {error}</Text> : null}

        {!day ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <TimelineMap styleUrl={settings.styleUrl} points={day.points} visits={visits} />
            {day.entries.length === 0 ? (
              <Text className="py-8 text-center text-sm text-muted-foreground">Nothing recorded on this day.</Text>
            ) : (
              <Card className="overflow-hidden border-border bg-card">
                {day.entries.map((entry) => (
                  <Entry key={entry.kind === 'visit' ? entry.visit.id : entry.trip.id} entry={entry} onVisit={onVisit} />
                ))}
              </Card>
            )}
          </>
        )}
      </View>
      <NamePlaceDialog
        visible={!!naming}
        at={naming}
        onCancel={() => setNaming(null)}
        onSave={(name) => {
          const visit = naming;
          setNaming(null);
          if (visit) void createPlace(name, visit, Math.max(settings.placeRadiusM, visit.radius)).then(() => reload());
        }}
      />
    </ScrollView>
  );
}
