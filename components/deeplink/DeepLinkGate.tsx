import { Text } from '@/components/ui/text';
import { App } from '@/lib/app/App';
import { discover } from '@/lib/arkitekt/fakts/discover';
import {
  isProvisionalProfileId,
  normalizeBaseUrl,
  profileTitle,
  StoredProfile,
} from '@/lib/arkitekt/fakts/profileStorageSchema';
import { scopeDigest } from '@/lib/deeplink/digest';
import { clearPendingLink, usePendingLink } from '@/lib/deeplink/pending';
import { matchScope, profileScope, ShareRequest } from '@/lib/deeplink/shareScope';
import { afterReturningToApp } from '@/lib/navigation';
import { useTabActions, useTabsBootedFor } from '@/lib/tabs/TabsProvider';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { usePathname } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, Modal, Pressable, View } from 'react-native';

/** Where a link belongs: the live organization, a kept login, or nowhere on this phone. */
type Home = { kind: 'here' } | { kind: 'profile'; profile: StoredProfile } | { kind: 'unknown' };

const findHome = async (
  request: ShareRequest,
  active: StoredProfile | null,
  profiles: StoredProfile[],
): Promise<Home> => {
  if (!request.scope && !request.digest) return { kind: 'here' };
  // The live login first, then the others: two logins can share a deployment
  // and an organization (two users), and the live one needs no switch.
  const ordered = active ? [active, ...profiles.filter((p) => p.id !== active.id)] : profiles;
  for (const profile of ordered) {
    const scope = profileScope(profile);
    const matches = request.scope ? matchScope(request.scope, scope) : (await scopeDigest(scope)) === request.digest;
    if (matches) return profile.id === active?.id ? { kind: 'here' } : { kind: 'profile', profile };
  }
  return { kind: 'unknown' };
};

/** How to name a login in the prompt: the organization, then the deployment. */
const describe = (profile: StoredProfile): string => {
  const title = profileTitle(profile);
  const where = profile.label.endpointName ?? profile.label.deploymentName;
  return where && where !== title ? `${title} @ ${where}` : title;
};

/**
 * Where a link lands before it is allowed to become a page — orkestrator's
 * `ShareGatePage`, as an overlay.
 *
 * A link that belongs to the live organization opens in a new tab without a
 * word, once that organization's tabs are up (at launch, that is after the
 * login is restored). One that belongs to another kept login asks before
 * switching; one that names a deployment this phone has no login for offers
 * to connect; a private link to somewhere unknown can only be refused.
 *
 * An overlay rather than a screen, because the cases it exists for are the
 * ones where the navigator underneath is about to be replaced: a restore, a
 * switch, a sign-in.
 */
export function DeepLinkGate() {
  const colors = useThemeColors();
  const request = usePendingLink();
  const profiles = App.useProfiles();
  const active = App.useActiveProfile();
  const connected = App.useIsConnected();
  const bootedFor = useTabsBootedFor();
  const pathname = usePathname();
  const { open } = useTabActions();
  const { switchProfile } = App.useProfileActions();
  const connect = App.useConnect();

  const [resolved, setResolved] = React.useState<{ request: ShareRequest; home: Home } | null>(null);
  const [busy, setBusy] = React.useState(false);
  // Kept with the link it was about, so the next link starts without it.
  const [failure, setFailure] = React.useState<{ request: ShareRequest; message: string } | null>(null);

  React.useEffect(() => {
    if (!request) return;
    let cancelled = false;
    void findHome(request, active, profiles).then((home) => {
      if (!cancelled) setResolved({ request, home });
    });
    return () => {
      cancelled = true;
    };
  }, [request, active, profiles]);

  const home = request && resolved?.request === request ? resolved.home : null;

  // The link's organization is live and its tabs are loaded: open the page.
  const ready = home?.kind === 'here' && !!active && connected && bootedFor === active.id;
  React.useEffect(() => {
    if (!request || !ready) return;
    clearPendingLink();
    // From a screen over the app frame (search), a navigation would land in
    // the root stack; leave it first.
    if (pathname === '/search') afterReturningToApp(() => open(request.path));
    else open(request.path);
  }, [request, ready, pathname, open]);

  const run = async (work: () => Promise<void>) => {
    if (!request) return;
    setFailure(null);
    setBusy(true);
    try {
      await work();
    } catch (cause) {
      setFailure({ request, message: cause instanceof Error ? cause.message : String(cause) });
    } finally {
      setBusy(false);
    }
  };

  // The link stays pending through the switch: it opens once the other
  // organization's tabs have booted.
  const switchTo = (profile: StoredProfile) =>
    run(() =>
      profile.status === 'stale'
        ? connect({ endpoint: profile.session.endpoint, controller: new AbortController(), replaceProfileId: profile.id })
        : switchProfile(profile.id),
    );

  const connectTo = (baseUrl: string) =>
    run(async () => {
      const controller = new AbortController();
      const endpoint = await discover({ url: baseUrl, controller, timeout: 3000 });
      await connect({ endpoint, controller });
    });

  if (!request || !home || home.kind === 'here') return null;

  // A fresh sign-in to the link's deployment has no organization until lok
  // answers; until then it is not a mismatch, just not known yet.
  const identifying =
    !!request.scope &&
    !!active &&
    isProvisionalProfileId(active.id) &&
    normalizeBaseUrl(active.identity.baseUrl) === request.scope.baseUrl;

  let title: string;
  let body: string;
  let action: { label: string; onPress: () => void } | null = null;
  if (identifying) {
    title = 'Opening…';
    body = 'Checking which organization you signed in to.';
  } else if (home.kind === 'profile') {
    const where = describe(home.profile);
    const stale = home.profile.status === 'stale';
    title = `Open in ${where}?`;
    body = `This link belongs to ${where}. ${active ? `You are on ${describe(active)}.` : 'You are not signed in.'}${stale ? ' That organization signed you out, so you will sign in again.' : ''}`;
    action = { label: stale ? 'Sign in and open' : 'Switch and open', onPress: () => void switchTo(home.profile) };
  } else if (request.scope) {
    const baseUrl = request.scope.baseUrl;
    title = 'You are not connected to this organization';
    body = `This link opens a page on ${baseUrl.replace(/^https?:\/\//, '')}. Connect to it to follow the link — you will choose the organization in your browser.`;
    action = { label: 'Connect…', onPress: () => void connectTo(baseUrl) };
  } else {
    title = 'You do not have access to this organization';
    body = 'This is a private link. It names its organization only to apps already signed in to it, so there is nothing here to connect to.';
  }

  const waiting = busy || identifying;
  const error = failure?.request === request ? failure.message : null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={clearPendingLink} statusBarTranslucent>
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full max-w-sm gap-3 rounded-xl border border-border bg-card p-4">
          <View className="flex-row items-center gap-2">
            {waiting ? <ActivityIndicator size="small" color={colors.primary} /> : null}
            <Text className="shrink text-lg font-semibold text-card-foreground">{title}</Text>
          </View>
          <Text className="text-sm text-muted-foreground">{body}</Text>
          <Text numberOfLines={1} className="text-xs text-muted-foreground">
            {request.path}
          </Text>
          {busy && home.kind === 'unknown' ? (
            <Text className="text-xs text-muted-foreground">Waiting for approval in your browser…</Text>
          ) : null}
          {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
          <View className="flex-row items-center justify-end gap-2">
            <Pressable onPress={clearPendingLink} className="rounded-lg px-3 py-2 active:opacity-70">
              <Text className="text-sm text-muted-foreground">{action ? 'Cancel' : 'Close'}</Text>
            </Pressable>
            {action && !identifying ? (
              <Pressable
                onPress={action.onPress}
                disabled={busy}
                className={`rounded-lg bg-primary px-3 py-2 active:opacity-80 ${busy ? 'opacity-50' : ''}`}
              >
                <Text className="text-sm font-medium text-primary-foreground">{action.label}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
