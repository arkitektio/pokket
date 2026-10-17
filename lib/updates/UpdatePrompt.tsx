import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Sparkles } from 'lucide-react-native';
import * as React from 'react';
import { AppState, Pressable, View } from 'react-native';
import { toast } from 'sonner-native';

/** Checking more often than this on resume only costs requests. */
const RESUME_CHECK_EVERY_MS = 30 * 60 * 1000;

const TOAST_ID = 'update-ready';

/**
 * The version the downloaded update carries. The publish script puts the
 * app's public config in the manifest (scripts/ci/publish-update.sh), so it
 * is extra.expoClient.version; null for a manifest without it.
 */
const versionOf = (update: Updates.UpdateInfo | undefined): string | null => {
  const manifest = update?.manifest as { extra?: { expoClient?: { version?: string } } } | undefined;
  return manifest?.extra?.expoClient?.version ?? null;
};

/**
 * Brings releases to running apps. expo-updates already checks at launch and
 * applies what it found on the next launch; this also checks when the app
 * comes back to the foreground, and once an update is downloaded offers to
 * restart into it now rather than at some later cold start.
 *
 * Inert in development (Metro serves the JS) and in builds without updates.
 */
export function UpdatePrompt() {
  const { isUpdatePending, downloadedUpdate } = Updates.useUpdates();
  const lastCheck = React.useRef(0);

  React.useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    // expo-updates has just checked, at launch.
    lastCheck.current = Date.now();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || Date.now() - lastCheck.current < RESUME_CHECK_EVERY_MS) return;
      lastCheck.current = Date.now();
      void Updates.checkForUpdateAsync()
        .then((result) => (result.isAvailable ? Updates.fetchUpdateAsync() : undefined))
        .catch((error) => console.warn('[updates] check failed:', error));
    });
    return () => subscription.remove();
  }, []);

  const next = versionOf(downloadedUpdate);
  React.useEffect(() => {
    if (!isUpdatePending) return;
    // One card, whatever downloads while it is up: a newer update replaces it.
    toast.custom(<UpdateReady next={next} />, { id: TOAST_ID, duration: Infinity });
  }, [isUpdatePending, next]);

  return null;
}

/** The card itself: what is ready, and Restart or Later (it applies on the next launch anyway). */
function UpdateReady({ next }: { next: string | null }) {
  const colors = useThemeColors();
  const current = Constants.expoConfig?.version;
  const versions = next && current && next !== current ? `${current} → ${next}` : next ? `Version ${next}` : null;

  return (
    <View className="mx-4 flex-row gap-3 rounded-2xl border border-border bg-card p-4 shadow-lg">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <Sparkles size={20} color={colors.primary} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-base font-semibold text-foreground">Update ready</Text>
        {versions ? <Text className="text-xs font-medium text-primary">{versions}</Text> : null}
        <Text className="text-sm text-muted-foreground">
          A new version of Orkestrator has downloaded. Restart now, or it applies the next time you open the app.
        </Text>
        <View className="mt-2 flex-row justify-end gap-2">
          <Pressable onPress={() => toast.dismiss(TOAST_ID)} className="rounded-lg px-3 py-2 active:bg-muted">
            <Text className="text-sm font-medium text-muted-foreground">Later</Text>
          </Pressable>
          <Pressable onPress={() => void Updates.reloadAsync()} className="rounded-lg bg-primary px-4 py-2 active:opacity-80">
            <Text className="text-sm font-semibold text-primary-foreground">Restart</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
