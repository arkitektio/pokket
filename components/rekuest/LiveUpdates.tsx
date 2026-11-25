import * as React from 'react';
import {View} from 'react-native';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Text} from '@/components/ui/text';
import {Guard} from '@/lib/app/App';
import type {RekuestSession, SessionSync} from '@/lib/rekuest/session/client';
import {useRekuestSession, useRekuestSessionSync} from '@/lib/rekuest/session/hooks';
import {cn} from '@/lib/utils';

/**
 * Whether tasks and states reach this phone live: the caller session on takt
 * (`lib/rekuest/session`), the only live path. Without it nothing updates by
 * itself, and no task can be started or steered from here, so this says so,
 * and why (orkestrator's Settings → Connection → live updates).
 */

const since = (at: number | null) => (at ? new Date(at).toLocaleTimeString() : null);

const headline = (sync: SessionSync): {text: string; tone: 'ok' | 'warn'} => {
  if (sync.status === 'open') {
    return sync.catchingUp
      ? {text: 'Live, catching up on what changed while it was away.', tone: 'warn'}
      : {text: 'Live.', tone: 'ok'};
  }
  const from = since(sync.since);
  if (sync.status === 'reconnecting') return {text: `Reconnecting${from ? ` since ${from}` : ''}. Tasks keep running.`, tone: 'warn'};
  if (sync.status === 'closed') return {text: 'Closed.', tone: 'warn'};
  return {text: `Not connected yet${from ? ` (trying since ${from})` : ''}.`, tone: 'warn'};
};

/** What the session follows and waits for, kept current with its status. */
const useActivity = (session: RekuestSession) =>
  React.useSyncExternalStore(session.subscribeStatus, session.getActivity, session.getActivity);

function Fact({label, value}: {label: string; value: string | null}) {
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

function SessionStatus() {
  const session = useRekuestSession();
  const sync = useRekuestSessionSync(session);
  useActivity(session);
  const {text, tone} = headline(sync);
  const error = sync.error ?? (sync.status === 'open' ? null : session.getLastError());

  return (
    <Card className="border-border bg-card">
      <CardContent className="gap-2 py-3">
        <Text className={cn('text-sm', tone === 'ok' ? 'text-card-foreground' : 'text-destructive')}>{text}</Text>
        {error ? (
          <View className="gap-1">
            <Text className="text-sm text-muted-foreground">{error.message}</Text>
            {error.detail ? (
              <Text selectable className="text-xs text-muted-foreground">
                {error.detail}
              </Text>
            ) : null}
          </View>
        ) : null}
        <View>
          <Fact label="Server" value={session.getUrl()} />
          <Fact label="Session" value={session.id} />
          <Fact label="Following" value={`${session.getTopics().length}`} />
          <Fact label="Requests waiting" value={`${session.getPendingCount()}`} />
        </View>
        {sync.status !== 'open' ? (
          <Button variant="outline" className="self-start rounded-xl border-border" onPress={() => session.wake()}>
            <Text className="text-sm font-medium text-foreground">Reconnect now</Text>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** The section for Settings; nothing where rekuest is not available. */
export function LiveUpdates() {
  return (
    <Guard.Rekuest fallback={null}>
      <View className="gap-2">
        <Text className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Live updates</Text>
        <SessionStatus />
      </View>
    </Guard.Rekuest>
  );
}
