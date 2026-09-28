import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { App } from '@/lib/app/App';
import { profileTitle } from '@/lib/arkitekt/fakts/profileStorageSchema';
import { showPage } from '@/lib/navigation';
import { disablePush, enablePush, PushStatus, pushUnavailableReason, reregisterPush, usePush } from '@/lib/push/push';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Bell, Bug, ChevronRight } from 'lucide-react-native';
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
      return { text: 'Notifications are turned off for pokket in the system settings.', tone: 'warn' };
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

export default function SettingsScreen() {
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-6 px-4 py-6">
        <View className="gap-2">
          <Text className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notifications</Text>
          <PushSetting />
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
