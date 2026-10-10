import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { App } from '@/lib/app/App';
import { profileTitle } from '@/lib/arkitekt/fakts/profileStorageSchema';
import { useAvailableModules } from '@/lib/modules/useAvailableModules';
import { showPage } from '@/lib/navigation';
import { disablePush, enablePush, PushStatus, pushUnavailableReason, reregisterPush, usePush } from '@/lib/push/push';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { TimelineSettings } from '@/components/timeline/TimelineSettings';
import { Bell, Bug, ChevronRight, MapPinned, RefreshCw } from 'lucide-react-native';
import { useUpdateInfo } from '@/lib/updates/useUpdateInfo';
import * as React from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Switch, View } from 'react-native';

const describe = (status: PushStatus, org: string): { text: string; tone: 'muted' | 'ok' | 'warn' | 'error' } => {
  switch (status.kind) {
    case 'off':
      return { text: 'Off. This device receives no notifications.', tone: 'muted' };
    case 'working':
      return { text: `${status.step}…`, tone: 'muted' };
    case 'on':
      return {
        text: status.registeredAt
          ? `On. ${org} knows this device since ${new Date(status.registeredAt).toLocaleDateString()}.`
          : 'On.',
        tone: 'ok',
      };
    case 'denied':
      return { text: 'Notifications are turned off for Orkestrator in the system settings.', tone: 'warn' };
    case 'unavailable':
      return { text: status.reason, tone: 'warn' };
    case 'error':
      return { text: `Could not register: ${status.message}`, tone: 'error' };
  }
};

function PushSetting() {
  const colors = useThemeColors();
  const { record, loaded, status } = usePush();
  const active = App.useActiveProfile();
  const [busy, setBusy] = React.useState(false);
  const unavailable = pushUnavailableReason();
  const org = active ? profileTitle(active) : 'This organization';
  const { text, tone } = describe(status, org);

  const toggle = async (on: boolean) => {
    setBusy(true);
    try {
      if (on) await enablePush();
      else await disablePush();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardContent className="gap-3 py-4">
        <View className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Bell size={18} color={colors.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-medium text-card-foreground">Push notifications</Text>
            <Text className="text-xs text-muted-foreground">For this device, in every organization you use here.</Text>
          </View>
          {busy || status.kind === 'working' ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Switch
              value={record.enabled}
              disabled={!loaded || !!unavailable}
              onValueChange={(on) => void toggle(on)}
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
        {record.enabled && active && (status.kind === 'on' || status.kind === 'error') ? (
          // For when lok lost the channel (a reset server, a changed token it never heard of).
          <Pressable onPress={() => void reregisterPush(active.id)} className="self-start rounded-lg bg-muted px-3 py-2 active:opacity-70">
            <Text className="text-sm text-foreground">Register this device again</Text>
          </Pressable>
        ) : null}
        {record.enabled ? (
          <Text className="text-xs text-muted-foreground">
            Turning this off stops delivery to this device. {org} keeps its record of the device until it
            next tries to reach it.
          </Text>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View className="flex-row justify-between gap-4 border-b border-border py-2">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text selectable numberOfLines={1} className="shrink text-right text-sm text-card-foreground">
        {value}
      </Text>
    </View>
  );
}

/** Which Pokket this is, and whether a newer one is out. */
function About() {
  const colors = useThemeColors();
  const { info, check, checkNow, restart } = useUpdateInfo();
  const status =
    check.kind === 'checking'
      ? 'Checking…'
      : check.kind === 'current'
        ? 'You have the latest version.'
        : check.kind === 'downloaded'
          ? 'A new version is ready.'
          : check.kind === 'unavailable'
            ? check.reason
            : check.kind === 'error'
              ? `Could not check: ${check.message}`
              : null;

  return (
    <Card className="border-border bg-card">
      <CardContent className="gap-3 py-3">
        <View>
          <Fact label="Version" value={info.version} />
          <Fact label="Channel" value={info.channel} />
          <Fact
            label="Running"
            value={info.updateId ? `update ${info.updateId.slice(0, 8)}` : 'the version it was installed with'}
          />
          <Fact label="Updated" value={info.updatedAt ? info.updatedAt.toLocaleString() : null} />
        </View>
        {status ? <Text className="text-sm text-muted-foreground">{status}</Text> : null}
        {check.kind === 'downloaded' ? (
          <Pressable onPress={() => void restart()} className="self-start rounded-lg bg-primary px-3 py-2 active:opacity-80">
            <Text className="text-sm font-medium text-primary-foreground">Restart to update</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => void checkNow()}
            disabled={check.kind === 'checking'}
            className="flex-row items-center gap-2 self-start rounded-lg bg-muted px-3 py-2 active:opacity-70"
          >
            {check.kind === 'checking' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <RefreshCw size={14} color={colors.foreground} />
            )}
            <Text className="text-sm text-foreground">Check for updates</Text>
          </Pressable>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ icon: Icon, label, onPress }: { icon: typeof Bug; label: string; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 px-4 py-3.5 active:bg-muted">
      <Icon size={18} color={colors.mutedForeground} />
      <Text className="flex-1 text-base text-foreground">{label}</Text>
      <ChevronRight size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

/** The backup lives with its service now; from here, a way there when this organization has it. */
function LokateLink() {
  const lokate = useAvailableModules().some((m) => m.key === 'lokate');
  if (!lokate) return null;
  return (
    <Card className="overflow-hidden border-border bg-card">
      <Row icon={MapPinned} label="Backup to your organization: Lokate" onPress={() => showPage('/lokate')} />
    </Card>
  );
}

export default function SettingsScreen() {
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-6 px-4 py-6">
        <View className="gap-2">
          <Text className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notifications</Text>
          <PushSetting />
        </View>
        <View className="gap-2">
          <Text className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Location timeline</Text>
          <TimelineSettings />
          <LokateLink />
        </View>
        <View className="gap-2">
          <Text className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">About</Text>
          <About />
        </View>
        <View className="gap-2">
          <Text className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Advanced</Text>
          <Card className="overflow-hidden border-border bg-card">
            <Row icon={Bug} label="Debug" onPress={() => showPage('/debug')} />
          </Card>
        </View>
      </View>
    </ScrollView>
  );
}
