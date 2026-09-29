import { useAlertDialog } from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { App } from '@/lib/app/App';
import { profileTitle } from '@/lib/arkitekt/fakts/profileStorageSchema';
import { saveTimelineSettings, useTimelineSettings } from '@/lib/timeline/settings';
import { backupNow, BackupStatus, deleteServerCopy, startBackup, useBackupStatus } from '@/lib/timeline/sync';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { CloudUpload } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Platform, Pressable, Switch, View } from 'react-native';

const describe = (status: BackupStatus, org: string): { text: string; tone: 'muted' | 'ok' | 'error' } => {
  switch (status.kind) {
    case 'working':
      return { text: `${status.step}…`, tone: 'muted' };
    case 'error':
      return { text: `Backup failed: ${status.message}. It is tried again next time pokket opens.`, tone: 'error' };
    case 'idle':
      return status.lastAt
        ? { text: `Backed up to ${org} at ${new Date(status.lastAt).toLocaleString()}.`, tone: 'ok' }
        : { text: `On. Backs up to ${org} whenever pokket is open.`, tone: 'muted' };
  }
};

/**
 * The timeline's backup to the organization's lokate. Off by default; one
 * organization at a time; only while pokket is open and that organization is
 * the one connected.
 */
export function TimelineBackup() {
  const colors = useThemeColors();
  const dialog = useAlertDialog();
  const { settings, loaded } = useTimelineSettings();
  const status = useBackupStatus();
  const active = App.useActiveProfile();
  const profiles = App.useProfiles();
  const lokate = App.usePotentialService('lokate');
  const [busy, setBusy] = React.useState(false);

  if (Platform.OS === 'web') return null;

  const target = settings.backupProfileId ? profiles.find((p) => p.id === settings.backupProfileId) : undefined;
  const isActiveTarget = !!active && settings.backupProfileId === active.id;
  const elsewhere = settings.backupProfileId !== null && !isActiveTarget;
  // Nothing to offer: this organization runs no lokate, and no backup goes elsewhere.
  if (!lokate && !elsewhere) return null;

  const org = active ? profileTitle(active) : 'this organization';
  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await task();
    } catch (error) {
      dialog.show('Something went wrong', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const toggle = (on: boolean) =>
    void run(async () => {
      if (!on) {
        await saveTimelineSettings({ backupProfileId: null });
        return;
      }
      if (!active) return;
      await saveTimelineSettings({ backupProfileId: active.id });
      await startBackup();
    });

  const working = busy || status.kind === 'working';
  const { text, tone } = describe(status, org);

  return (
    <Card className="border-border bg-card">
      <CardContent className="gap-3 py-4">
        <View className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <CloudUpload size={18} color={colors.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-medium text-card-foreground">Back up to {org}</Text>
            <Text className="text-xs text-muted-foreground">A copy on your organization&apos;s server, readable by you alone.</Text>
          </View>
          {working ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Switch
              value={isActiveTarget}
              disabled={!loaded || !lokate}
              onValueChange={toggle}
              trackColor={{ true: colors.primary, false: colors.muted }}
            />
          )}
        </View>

        {elsewhere ? (
          <Text className="text-sm text-muted-foreground">
            Backing up to {target ? profileTitle(target) : 'another organization'}; it runs while that one is active. Switching on
            here moves the backup to {org}.
          </Text>
        ) : null}

        {isActiveTarget ? (
          <>
            <Text
              className={`text-sm ${tone === 'ok' ? 'text-emerald-500' : tone === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              {text}
            </Text>
            <Text className="text-xs text-muted-foreground">
              Locations are kept on this phone until they are backed up, whatever the retention setting. Switching the backup on for an
              empty phone (a new one, or after reinstalling) restores the timeline first.
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <Pressable
                onPress={() => void run(() => backupNow())}
                disabled={working}
                className="rounded-lg bg-muted px-3 py-2 active:opacity-70"
              >
                <Text className="text-sm text-foreground">Back up now</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  dialog.show(
                    `Delete the copy on ${org}?`,
                    'Everything of yours on the server is deleted and the backup is switched off. This phone keeps its timeline.',
                    [
                      { label: 'Cancel', variant: 'cancel' },
                      {
                        label: 'Delete server copy',
                        variant: 'destructive',
                        onPress: () => void run(deleteServerCopy),
                      },
                    ],
                  )
                }
                disabled={working}
                className="rounded-lg bg-muted px-3 py-2 active:opacity-70"
              >
                <Text className="text-sm text-destructive">Delete server copy</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
