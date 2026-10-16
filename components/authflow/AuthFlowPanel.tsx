import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { completionOf } from '@/lib/authflow/inflight';
import { parseRedirect } from '@/lib/authflow/redirect';
import type { AuthSession } from '@/lib/authflow/types';
import { AuthFlowState, useAuthFlow } from '@/lib/authflow/useAuthFlow';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Check, ChevronDown, ChevronRight, ExternalLink, Smartphone, TriangleAlert } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { toast } from 'sonner-native';

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** What the user is asked for at a step the server names; the name itself otherwise. */
const STEP_TEXT: Record<string, string> = {
  MFA: 'Approve the login in the app on your phone.',
};

function Steps({ labels, current }: { labels: string[]; current: number }) {
  return (
    <View className="flex-row flex-wrap items-center gap-2">
      {labels.map((label, i) => (
        <View key={label} className="flex-row items-center gap-2">
          <View
            className={`h-5 w-5 items-center justify-center rounded-full border ${
              i < current ? 'border-emerald-500 bg-emerald-500' : i === current ? 'border-foreground' : 'border-border'
            }`}
          >
            {i < current ? (
              <Check size={12} color="#fff" />
            ) : (
              <Text className="text-[10px] text-muted-foreground">{i + 1}</Text>
            )}
          </View>
          <Text className={`text-xs ${i === current ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</Text>
          {i < labels.length - 1 ? <View className="h-px w-4 bg-border" /> : null}
        </View>
      ))}
    </View>
  );
}

/** REDIRECT fallback: the browser did not come back, so paste where it ended up. */
function PasteFallback({ auth }: { auth: AuthFlowState }) {
  const colors = useThemeColors();
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState('');
  const parsed = parseRedirect(text);
  const finish = () => {
    const completion = completionOf(text);
    if (completion) void auth.completeRedirect(completion);
  };
  return (
    <View className="gap-2">
      <Pressable className="flex-row items-center gap-1 self-start" onPress={() => setOpen((o) => !o)}>
        {open ? (
          <ChevronDown size={14} color={colors.mutedForeground} />
        ) : (
          <ChevronRight size={14} color={colors.mutedForeground} />
        )}
        <Text className="text-xs text-muted-foreground">Browser didn&apos;t bring you back?</Text>
      </Pressable>
      {open ? (
        <View className="gap-2">
          <Text className="text-xs text-muted-foreground">
            Paste the address the browser ended up on. It has a code and a state in it.
          </Text>
          <View className="flex-row items-center gap-2">
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={`${auth.session?.redirectUrl ?? 'https://…/auth/callback'}?code=…&state=…`}
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              style={{ color: colors.foreground }}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs"
            />
            <Button size="sm" disabled={!parsed || auth.completing} onPress={finish}>
              <Text>Finish</Text>
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/**
 * A started login, from the provider's page to DONE: what the user sees is
 * picked by the session's `finish` (a code to approve, or the provider's page
 * in the browser). Renders nothing before there is a session. `onRestart`
 * starts a fresh one when it ran out.
 */
export function AuthFlowPanel({ auth, onRestart }: { auth: AuthFlowState; onRestart: () => void }) {
  const colors = useThemeColors();
  const session = auth.session;
  const phase = auth.phase;
  if (!session || !phase) return null;

  if (phase.kind === 'expired' || phase.kind === 'failed' || phase.kind === 'cancelled') {
    return (
      <View className="items-start gap-3 px-3">
        <View className="flex-row items-center gap-2">
          <TriangleAlert size={16} color={colors.destructive} />
          <Text className="shrink text-sm text-foreground">
            {phase.kind === 'expired'
              ? 'The login was not finished in time.'
              : phase.kind === 'cancelled'
                ? 'The login was cancelled.'
                : phase.message}
          </Text>
        </View>
        <Button size="sm" onPress={onRestart} disabled={auth.opening}>
          <Text>Start again</Text>
        </Button>
      </View>
    );
  }

  const poll = session.finish === 'POLL';
  const labels = poll ? ['Approve the code', 'Confirm', 'Linked'] : ['Sign in', 'Linked'];
  const current = phase.kind === 'done' ? labels.length - 1 : phase.kind === 'step' ? 1 : 0;

  return (
    <View className="gap-5 px-3">
      <Steps labels={labels} current={current} />

      {poll && phase.kind === 'approve' && session.userCode ? (
        <View className="items-center gap-3 rounded-2xl border border-border p-5">
          <Text className="text-center text-xs text-muted-foreground">
            Check that the page shows this code, then approve it
          </Text>
          <Text selectable className="font-mono text-3xl font-semibold tracking-[6px] text-foreground">
            {session.userCode}
          </Text>
          <Button variant="outline" size="sm" onPress={auth.reopen} className="flex-row gap-2">
            <ExternalLink size={14} color={colors.foreground} />
            <Text>Open login page</Text>
          </Button>
          <Text className="text-xs text-muted-foreground">Code valid for {clock(auth.secondsLeft)}</Text>
        </View>
      ) : null}

      {!poll && phase.kind === 'approve' ? (
        <View className="items-center gap-3 rounded-2xl border border-border p-5">
          <Text className="text-center text-sm text-foreground">Finish signing in on the provider&apos;s page.</Text>
          <Text className="text-center text-xs text-muted-foreground">
            When you are done, the browser hands you back here and this finishes by itself.
          </Text>
          <Button variant="outline" size="sm" onPress={auth.reopen} className="flex-row gap-2">
            <ExternalLink size={14} color={colors.foreground} />
            <Text>Open again</Text>
          </Button>
          <Text className="text-xs text-muted-foreground">Valid for {clock(auth.secondsLeft)}</Text>
        </View>
      ) : null}

      {phase.kind === 'step' ? (
        <View className="items-center gap-3 rounded-2xl border border-border p-5">
          <Smartphone size={32} color={colors.mutedForeground} />
          <Text className="text-center text-sm text-foreground">{STEP_TEXT[phase.step] ?? phase.step}</Text>
        </View>
      ) : null}

      {phase.kind === 'done' ? (
        <View className="items-center gap-2 rounded-2xl border border-border p-5">
          <Check size={32} color="#10b981" />
          <Text className="text-sm text-foreground">Linked.</Text>
        </View>
      ) : null}

      {!poll && phase.kind === 'approve' ? <PasteFallback auth={auth} /> : null}

      {phase.kind !== 'done' ? (
        <View className="flex-row items-center justify-between gap-3">
          {auth.paused || (auth.problem && !poll) ? (
            <View className="shrink flex-row items-center gap-2">
              <TriangleAlert size={14} color={colors.destructive} />
              <Text className="shrink text-xs text-destructive">{auth.problem}</Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color={colors.mutedForeground} />
              <Text className="text-xs text-muted-foreground">{auth.problem ? 'Retrying…' : 'Waiting…'}</Text>
            </View>
          )}
          {auth.paused ? (
            <Button size="sm" variant="outline" onPress={auth.resume}>
              <Text>Keep waiting</Text>
            </Button>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * One login as a sheet's content: opens on mount and sends the user straight
 * to the provider. `open` obtains the session (the service's start or resume
 * mutation, mapped to an `AuthSession`); `restart` starts over differently
 * than by opening again (back to a picker). Leaving it while the login is
 * still open drops that login on the server.
 */
export function AuthFlow({
  flow,
  title,
  open,
  restart,
  onDone,
  header,
}: {
  flow: string;
  title: string;
  open: () => Promise<AuthSession | null | undefined>;
  restart?: () => void;
  onDone: (session: AuthSession) => void;
  header?: React.ReactNode;
}) {
  const colors = useThemeColors();
  const auth = useAuthFlow({
    flow,
    open,
    onDone: (session) => {
      toast.success(`${session.result?.label ?? title} linked`);
      onDone(session);
    },
  });
  const started = React.useRef(false);
  const begin = auth.begin;
  React.useEffect(() => {
    if (started.current) return;
    started.current = true;
    void begin();
  }, [begin]);

  const cancel = React.useRef(auth.cancel);
  React.useEffect(() => {
    cancel.current = auth.cancel;
  }, [auth.cancel]);
  React.useEffect(() => () => cancel.current(), []);

  const again = () => (restart ? restart() : void auth.begin());

  return (
    <View className="gap-4">
      <View className="gap-1 px-3">
        <Text className="text-base font-semibold text-foreground">{title}</Text>
        {auth.session ? (
          header
        ) : (
          <Text className="text-xs text-muted-foreground">
            {auth.problem ? 'The login could not be started.' : 'Starting the login…'}
          </Text>
        )}
      </View>
      {auth.session ? (
        <AuthFlowPanel auth={auth} onRestart={again} />
      ) : auth.problem ? (
        <View className="items-start gap-3 px-3">
          <Text className="text-sm text-destructive">{auth.problem}</Text>
          <Button size="sm" onPress={again} disabled={auth.opening}>
            <Text>Try again</Text>
          </Button>
        </View>
      ) : (
        <ActivityIndicator className="py-6" color={colors.primary} />
      )}
    </View>
  );
}
