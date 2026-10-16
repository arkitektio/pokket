import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useActiveProfileId, useProfiles } from '@/lib/arkitekt/hooks';
import { profileTitle } from '@/lib/arkitekt/fakts/profileStorageSchema';
import { finishRedirect } from '@/lib/authflow/inflight';
import { findPending, forgetPending, PendingAuth } from '@/lib/authflow/pending';
import { redirectError } from '@/lib/authflow/redirect';
import { AUTH_FLOWS, useServiceClient } from '@/lib/authflow/registry';
import { replacePage, showPage } from '@/lib/navigation';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { useLocalSearchParams } from 'expo-router';
import { Check, KeyRound, ShieldQuestion, TriangleAlert } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { toast } from 'sonner-native';

type Params = { namespace?: string; code?: string; state?: string; error?: string; error_description?: string };
type Outcome = { kind: 'working' } | { kind: 'done'; label?: string | null } | { kind: 'failed'; text: string };
type Tone = 'neutral' | 'warning' | 'destructive';

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : typeof error === 'string' ? error : 'Something went wrong';

function Status({
  icon: Icon,
  tone = 'neutral',
  busy,
  eyebrow,
  title,
  description,
  actions,
}: {
  icon: typeof Check;
  tone?: Tone;
  busy?: boolean;
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  const colors = useThemeColors();
  const color = tone === 'destructive' ? colors.destructive : tone === 'warning' ? '#f59e0b' : colors.primary;
  return (
    <View className="flex-1 bg-background">
      <Card className="m-4 border-border bg-card">
        <CardContent className="items-center gap-3 py-8">
          <View className="rounded-full bg-primary/10 p-4">
            {busy ? <ActivityIndicator color={color} /> : <Icon size={24} color={color} />}
          </View>
          <Text className="text-xs uppercase text-muted-foreground">{eyebrow}</Text>
          <Text className="text-center text-lg font-semibold text-card-foreground">{title}</Text>
          {description ? <Text className="text-center text-sm text-muted-foreground">{description}</Text> : null}
          {actions ? <View className="mt-2 flex-row flex-wrap justify-center gap-2">{actions}</View> : null}
        </CardContent>
      </Card>
    </View>
  );
}

/**
 * Where a REDIRECT login comes back when no sheet took it
 * (`/auth/callback/<namespace>`): after Android killed the app while the
 * user was in the browser, or when the sheet was closed. The relay opened
 * `orkestrator://<namespace>/auth/callback?code&state`, and the gate
 * brought it here. This page finishes the login with the service's
 * handler (`AUTH_FLOWS`) and goes back to the service's page.
 *
 * Any app or web page can open an `orkestrator://` link, so only a login
 * this phone started (`pending.ts`) is ever exchanged. One started on
 * another profile is not submitted.
 */
export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<Params>();
  const namespace = params.namespace ?? '';
  const { code, state } = params;
  const refusal = redirectError(params as Record<string, string>);
  const handler = AUTH_FLOWS[namespace];
  const client = useServiceClient(handler?.service);
  const activeProfile = useActiveProfileId();
  const profiles = useProfiles();

  // undefined: still looking it up.
  const [lookedUp, setLookedUp] = React.useState<PendingAuth | null | undefined>(undefined);
  React.useEffect(() => {
    if (!state) return;
    let live = true;
    void findPending(state).then((found) => live && setLookedUp(found));
    return () => {
      live = false;
    };
  }, [state]);
  const pending = state ? lookedUp : null;

  const elsewhere = pending?.profile && pending.profile !== activeProfile ? pending.profile : null;
  const [outcome, setOutcome] = React.useState<Outcome>({ kind: 'working' });
  const ran = React.useRef(false);
  const ready = !!handler && !!client && !!state && !!pending && !elsewhere && (!!code || !!refusal);

  React.useEffect(() => {
    if (!ready || ran.current || !handler || !client || !state) return;
    ran.current = true;
    // The provider said no: the server records it, so the login ends as FAILED everywhere.
    const completion = refusal
      ? { state, error: params.error || 'access_denied', errorDescription: params.error_description || undefined }
      : { state, code: code! };
    finishRedirect(completion, (input) => handler.complete(client, input))
      .then((update) => {
        void forgetPending(state);
        if (update.status !== 'DONE') {
          setOutcome({ kind: 'failed', text: update.errorMessage || refusal || 'The login was not finished.' });
          return;
        }
        const label = update.result?.label;
        toast.success(`${label ?? handler.title} linked`);
        setOutcome({ kind: 'done', label });
        // The code is spent; the tab should not keep it in its path.
        if (handler.home) replacePage(handler.home);
      })
      .catch((e) => setOutcome({ kind: 'failed', text: handler.describeError?.(e) ?? messageOf(e) }));
  }, [ready, handler, client, state, code, params.error, params.error_description, refusal]);

  const title = handler?.title ?? 'Login';
  const home = handler?.home;
  const leave = (
    <>
      {home ? (
        <Button onPress={() => replacePage(home)}>
          <Text>{outcome.kind === 'done' ? 'Continue' : 'Start again'}</Text>
        </Button>
      ) : null}
      <Button variant="outline" onPress={() => showPage('/')}>
        <Text>Go home</Text>
      </Button>
    </>
  );

  if (!handler) {
    return (
      <Status
        icon={TriangleAlert}
        tone="warning"
        eyebrow="Login"
        title="Nothing here handles this login"
        description={`The phone does not finish logins for “${namespace}”.`}
        actions={leave}
      />
    );
  }
  if (!state || (!code && !refusal)) {
    return (
      <Status
        icon={TriangleAlert}
        tone="warning"
        eyebrow={title}
        title="This link has no login code in it"
        description="It should carry the code and state the provider sent back. Start the login again."
        actions={leave}
      />
    );
  }
  if (pending === undefined) return <Status icon={KeyRound} busy eyebrow={title} title="Finishing the login…" />;
  if (elsewhere) {
    const profile = profiles.find((p) => p.id === elsewhere);
    return (
      <Status
        icon={ShieldQuestion}
        tone="warning"
        eyebrow={title}
        title="This login was started in another organization"
        description={
          profile
            ? `Switch to ${profileTitle(profile)} and open the link again.`
            : 'Switch to the organization it was started in and open the link again.'
        }
        actions={leave}
      />
    );
  }
  if (!pending && refusal) {
    return (
      <Status
        icon={TriangleAlert}
        tone="warning"
        eyebrow={title}
        title="The provider stopped the login"
        description={refusal}
        actions={leave}
      />
    );
  }
  if (!pending) {
    return (
      <Status
        icon={ShieldQuestion}
        tone="warning"
        eyebrow={title}
        title="This login was not started here"
        description="Only a login started on this phone is finished from a link. Start it again from the app."
        actions={leave}
      />
    );
  }
  if (!client) {
    return (
      <Status
        icon={KeyRound}
        busy
        eyebrow={title}
        title={`Waiting for ${handler.service}`}
        description="The login is finished as soon as the service is reachable."
        actions={leave}
      />
    );
  }
  if (outcome.kind === 'failed') {
    return (
      <Status
        icon={TriangleAlert}
        tone="destructive"
        eyebrow={title}
        title={refusal ? 'The provider stopped the login' : 'The login could not be finished'}
        description={outcome.text}
        actions={leave}
      />
    );
  }
  if (outcome.kind === 'done') {
    return (
      <Status
        icon={Check}
        eyebrow={title}
        title={outcome.label ? `${outcome.label} linked` : 'Linked'}
        actions={leave}
      />
    );
  }
  return <Status icon={KeyRound} busy eyebrow={title} title="Finishing the login…" />;
}
