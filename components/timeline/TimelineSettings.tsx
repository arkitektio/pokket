import { useAlertDialog } from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { deleteEverything, timelineStats } from '@/lib/timeline/db';
import { exportTimeline } from '@/lib/timeline/export';
import {
  ACCURACIES,
  AccuracyLevel,
  ACTIVITY_TYPES,
  ActivityKind,
  DEFAULT_STYLE_URL,
  defaultTimelineSettings,
  Preset,
  PRESETS,
  presetOf,
  RECORDING_KEYS,
  SEGMENTATION_KEYS,
  TimelineSettings as Settings,
  TrackingStatus,
  useTimelineSettings,
} from '@/lib/timeline/settings';
import { applyTimelineSettings, deniedHint, disableTimeline, enableTimeline } from '@/lib/timeline/tracking';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { ChevronDown, ChevronRight, MapPin } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, Switch, TextInput, View } from 'react-native';

const DEFAULTS = defaultTimelineSettings();

const RETENTION: { value: number; label: string }[] = [
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 365, label: '1 year' },
  { value: 0, label: 'Forever' },
];

const ACCURACY_LABELS: Record<AccuracyLevel, string> = {
  lowest: 'Lowest',
  low: 'Low',
  balanced: 'Balanced',
  high: 'High',
  highest: 'Highest',
  navigation: 'Navigation',
};

const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  other: 'Anything',
  automotive: 'Driving',
  fitness: 'On foot / bike',
  otherNavigation: 'Boat / train',
  airborne: 'Flying',
};

const describe = (status: TrackingStatus): { text: string; tone: 'muted' | 'ok' | 'warn' | 'error' } => {
  switch (status.kind) {
    case 'off':
      return { text: 'Off. Nothing is recorded.', tone: 'muted' };
    case 'working':
      return { text: `${status.step}…`, tone: 'muted' };
    case 'on':
      return { text: 'On. Recorded to an encrypted database on this phone only.', tone: 'ok' };
    case 'denied':
      return { text: deniedHint(status.background), tone: 'warn' };
    case 'error':
      return { text: `Could not start: ${status.message}`, tone: 'error' };
  }
};

function Chips<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((o) => (
        <Pressable
          key={String(o.value)}
          onPress={() => onChange(o.value)}
          className={`rounded-full px-3 py-1.5 ${o.value === value ? 'bg-primary' : 'bg-muted'}`}
        >
          <Text className={`text-sm ${o.value === value ? 'text-primary-foreground' : 'text-foreground'}`}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-card-foreground">{label}</Text>
      {children}
      {hint ? <Text className="text-xs text-muted-foreground">{hint}</Text> : null}
    </View>
  );
}

/** A text setting, saved when the field is left. Keyed by its value, so a saved change resets the draft. */
function UrlField({ label, hint, value, placeholder, onSave }: { label: string; hint: string; value: string; placeholder: string; onSave: (value: string) => void }) {
  const colors = useThemeColors();
  const [draft, setDraft] = React.useState(value);
  return (
    <Field label={label} hint={hint}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onEndEditing={() => draft.trim() !== value && onSave(draft.trim())}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
      />
    </Field>
  );
}

type NumberKey = { [K in keyof Settings]: Settings[K] extends number ? K : never }[keyof Settings];

/**
 * A number setting on one row: label, field, unit. Saved when the field is
 * left, clamped to its bounds; anything unreadable snaps back. Keyed by its
 * value by the caller, so a saved or reset value shows at once.
 */
function NumberRow({
  label,
  unit,
  value,
  fallback,
  min,
  max,
  onSave,
}: {
  label: string;
  unit: string;
  value: number;
  fallback: number;
  min: number;
  max: number;
  onSave: (value: number) => void;
}) {
  const colors = useThemeColors();
  const [draft, setDraft] = React.useState(String(value));
  const commit = () => {
    const parsed = Number(draft.replace(',', '.'));
    if (!draft.trim() || Number.isNaN(parsed)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, parsed));
    setDraft(String(clamped));
    if (clamped !== value) onSave(clamped);
  };
  return (
    <View className="flex-row items-center gap-3 py-1">
      <View className="flex-1">
        <Text className="text-sm text-card-foreground">{label}</Text>
        <Text className="text-xs text-muted-foreground">
          Default {fallback} {unit}
          {value !== fallback ? ' · changed' : ''}
        </Text>
      </View>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onEndEditing={commit}
        keyboardType="decimal-pad"
        selectTextOnFocus
        placeholderTextColor={colors.mutedForeground}
        className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-right text-sm text-foreground"
      />
      <Text className="w-10 text-xs text-muted-foreground">{unit}</Text>
    </View>
  );
}

function SwitchRow({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (value: boolean) => void }) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center gap-3 py-1">
      <View className="flex-1">
        <Text className="text-sm text-card-foreground">{label}</Text>
        <Text className="text-xs text-muted-foreground">{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.muted }} />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2 border-t border-border pt-3">
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</Text>
      {children}
    </View>
  );
}

/** Every knob, with its default beside it. */
function Advanced({ settings, apply }: { settings: Settings; apply: (patch: Partial<Settings>) => void }) {
  const num = (key: NumberKey, label: string, unit: string, min: number, max: number) => (
    <NumberRow
      key={`${key}:${settings[key]}`}
      label={label}
      unit={unit}
      value={settings[key]}
      fallback={DEFAULTS[key]}
      min={min}
      max={max}
      onSave={(value) => apply({ [key]: value })}
    />
  );
  const reset = (keys: readonly (keyof Settings)[]) =>
    apply(Object.fromEntries(keys.map((k) => [k, DEFAULTS[k]])) as Partial<Settings>);
  const differs = (keys: readonly (keyof Settings)[]) => keys.some((k) => settings[k] !== DEFAULTS[k]);

  return (
    <View className="gap-4">
      <Section title="Recording">
        <Field label="Accuracy" hint="How hard the phone tries for an exact position. Higher costs battery.">
          <Chips<AccuracyLevel>
            options={ACCURACIES.map((a) => ({ value: a, label: ACCURACY_LABELS[a] }))}
            value={settings.accuracy}
            onChange={(accuracy) => apply({ accuracy })}
          />
        </Field>
        {num('distanceIntervalM', 'New location every', 'm', 0, 5000)}
        {num('deferredDistanceM', 'Deliver in batches every', 'm', 0, 50_000)}
        {num('deferredIntervalMin', '…or at least every', 'min', 0, 120)}
        {Platform.OS === 'ios' ? (
          <>
            <Field label="Optimise for">
              <Chips<ActivityKind>
                options={ACTIVITY_TYPES.map((a) => ({ value: a, label: ACTIVITY_LABELS[a] }))}
                value={settings.activityType}
                onChange={(activityType) => apply({ activityType })}
              />
            </Field>
            <SwitchRow
              label="Pause when still"
              hint="Lets iOS stop updates when you seem not to move. Saves battery; may miss when you leave."
              value={settings.pauseAutomatically}
              onChange={(pauseAutomatically) => apply({ pauseAutomatically })}
            />
            <SwitchRow
              label="Show status-bar indicator"
              hint="The blue pill while recording in the background."
              value={settings.showIndicator}
              onChange={(showIndicator) => apply({ showIndicator })}
            />
          </>
        ) : null}
        {differs(RECORDING_KEYS) ? <ResetLink onPress={() => reset(RECORDING_KEYS)} /> : null}
      </Section>

      <Section title="Visits and trips">
        {num('stayRadiusM', 'A place spans up to', 'm', 20, 2000)}
        {num('minStayMin', 'A visit lasts at least', 'min', 1, 240)}
        {num('maxAccuracyM', 'Ignore locations worse than', 'm', 10, 5000)}
        {num('maxSpeedKmh', 'Ignore jumps faster than', 'km/h', 10, 1200)}
        {num('walkMaxKmh', 'Walking up to', 'km/h', 1, 50)}
        {num('bikeMaxKmh', 'Cycling up to', 'km/h', 2, 100)}
        <Text className="text-xs text-muted-foreground">Changing these redoes the visits and trips from every location still kept.</Text>
        {differs(SEGMENTATION_KEYS) ? <ResetLink onPress={() => reset(SEGMENTATION_KEYS)} /> : null}
      </Section>

      <Section title="Places and storage">
        {num('placeRadiusM', 'New named places reach', 'm', 20, 2000)}
        {num('retentionDays', 'Keep raw locations for', 'days', 0, 36_500)}
        <Text className="text-xs text-muted-foreground">0 days keeps them forever.</Text>
      </Section>
    </View>
  );
}

function ResetLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="self-start py-1 active:opacity-70">
      <Text className="text-sm text-primary">Reset to defaults</Text>
    </Pressable>
  );
}

export function TimelineSettings() {
  const colors = useThemeColors();
  const dialog = useAlertDialog();
  const { settings, loaded, status } = useTimelineSettings();
  const [busy, setBusy] = React.useState(false);
  const [advanced, setAdvanced] = React.useState(false);
  const [stats, setStats] = React.useState<{ points: number; since: number | null; visits: number } | null>(null);
  const { text, tone } = describe(status);

  const refreshStats = React.useCallback(() => {
    if (Platform.OS === 'web') return;
    void timelineStats().then(setStats).catch(() => setStats(null));
  }, []);
  React.useEffect(refreshStats, [refreshStats, settings.enabled]);

  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await task();
    } catch (error) {
      dialog.show('Something went wrong', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
      refreshStats();
    }
  };
  const apply = (patch: Partial<Settings>) => void run(() => applyTimelineSettings(patch));

  if (Platform.OS === 'web') return null;

  const preset = presetOf(settings);

  return (
    <Card className="border-border bg-card">
      <CardContent className="gap-4 py-4">
        <View className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <MapPin size={18} color={colors.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-medium text-card-foreground">Record my timeline</Text>
            <Text className="text-xs text-muted-foreground">Where you stayed and how you got there. Never uploaded.</Text>
          </View>
          {busy || status.kind === 'working' ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Switch
              value={settings.enabled}
              disabled={!loaded}
              onValueChange={(on) => void run(on ? enableTimeline : disableTimeline)}
              trackColor={{ true: colors.primary, false: colors.muted }}
            />
          )}
        </View>
        <Text
          className={`text-sm ${
            tone === 'ok' ? 'text-emerald-500' : tone === 'warn' ? 'text-amber-500' : tone === 'error' ? 'text-destructive' : 'text-muted-foreground'
          }`}
        >
          {text}
        </Text>
        {status.kind === 'denied' ? (
          <Pressable onPress={() => void Linking.openSettings()} className="self-start rounded-lg bg-muted px-3 py-2 active:opacity-70">
            <Text className="text-sm text-foreground">Open system settings</Text>
          </Pressable>
        ) : null}
        {stats && stats.points > 0 ? (
          <Text className="text-xs text-muted-foreground">
            {stats.points.toLocaleString()} locations, {stats.visits.toLocaleString()} visits
            {stats.since ? ` since ${new Date(stats.since).toLocaleDateString()}` : ''}.
          </Text>
        ) : null}

        <Field
          label="Detail"
          hint={
            preset
              ? 'More detail draws finer routes and uses more battery.'
              : 'Custom recording settings (see Advanced). Pick a preset to replace them.'
          }
        >
          <Chips<Preset>
            options={(Object.keys(PRESETS) as Preset[]).map((key) => ({ value: key, label: PRESETS[key].label }))}
            value={preset}
            onChange={(key) => apply({ ...PRESETS[key].values })}
          />
        </Field>

        <Field label="Keep raw locations for" hint="Visits and trips are kept; only the fine-grained route is deleted.">
          <Chips<number> options={RETENTION} value={settings.retentionDays} onChange={(retentionDays) => apply({ retentionDays })} />
        </Field>

        <UrlField
          key={`style:${settings.styleUrl}`}
          label="Map tiles"
          value={settings.styleUrl}
          placeholder={DEFAULT_STYLE_URL}
          onSave={(styleUrl) => apply({ styleUrl: styleUrl || DEFAULT_STYLE_URL })}
          hint="A MapLibre style URL. Whoever serves the tiles can see which area you look at, never your recorded data. Point this at your own tile server to keep even that private."
        />
        <UrlField
          key={`geocoder:${settings.geocoderUrl}`}
          label="Place names (optional)"
          value={settings.geocoderUrl}
          placeholder="https://photon.example.org"
          onSave={(geocoderUrl) => apply({ geocoderUrl })}
          hint="A Photon server to suggest names for places, asked only when you tap Suggest. Empty: names are yours alone."
        />

        <Pressable onPress={() => setAdvanced((open) => !open)} className="flex-row items-center gap-2 active:opacity-70">
          {advanced ? (
            <ChevronDown size={16} color={colors.mutedForeground} />
          ) : (
            <ChevronRight size={16} color={colors.mutedForeground} />
          )}
          <Text className="text-sm font-medium text-card-foreground">Advanced</Text>
        </Pressable>
        {advanced ? <Advanced settings={settings} apply={apply} /> : null}

        <View className="flex-row flex-wrap gap-2">
          <Pressable onPress={() => void run(() => exportTimeline('gpx'))} className="rounded-lg bg-muted px-3 py-2 active:opacity-70">
            <Text className="text-sm text-foreground">Export GPX</Text>
          </Pressable>
          <Pressable onPress={() => void run(() => exportTimeline('json'))} className="rounded-lg bg-muted px-3 py-2 active:opacity-70">
            <Text className="text-sm text-foreground">Export JSON</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              dialog.show('Delete your whole timeline?', 'Every location, visit, trip and named place on this phone is deleted. This cannot be undone.', [
                { label: 'Cancel', variant: 'cancel' },
                { label: 'Delete everything', variant: 'destructive', onPress: () => void run(deleteEverything) },
              ])
            }
            className="rounded-lg bg-muted px-3 py-2 active:opacity-70"
          >
            <Text className="text-sm text-destructive">Delete everything</Text>
          </Pressable>
        </View>
      </CardContent>
    </Card>
  );
}
