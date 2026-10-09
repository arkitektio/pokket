import { CallPanel } from '@/components/calls/CallPanel';
import { InviteSheet } from '@/components/calls/InviteSheet';
import { TalkingAbout } from '@/components/calls/TalkingAbout';
import { CallsEmptyState, CallsLoadingState, CallsUnavailable } from '@/components/calls/states';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { type CallFragment, useGetCallQuery } from '@/lib/lovekit/api/graphql';
import { JOIN_PARAM } from '@/lib/lovekit/call/links';
import { callStore } from '@/lib/lovekit/call/store';
import { useJoinCall } from '@/lib/lovekit/call/useJoinCall';
import { useTabTitle } from '@/lib/tabs/TabsProvider';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

/**
 * `?join=1` connects on arrival (a link, "call about this"); once, and the
 * parameter goes. It has to: the tab remembers its route and reopens it on
 * the next launch, and a call must not be rejoined by starting the app.
 * An arrival never prompts for the microphone (`useJoinCall`).
 */
function useJoinOnArrival(call: CallFragment) {
  const params = useLocalSearchParams<{ join?: string }>();
  const { join } = useJoinCall();
  const done = React.useRef(false);
  const wanted = params[JOIN_PARAM] === '1';

  React.useEffect(() => {
    if (!wanted || done.current) return;
    done.current = true;
    router.setParams({ [JOIN_PARAM]: undefined });
    if (callStore.getState().call?.id !== call.id) {
      void join({ id: call.id, title: call.title }, { prompt: false });
    }
  }, [wanted, call.id, call.title, join]);
}

function Call({ call }: { call: CallFragment }) {
  useTabTitle(call.title);
  useJoinOnArrival(call);
  const [inviting, setInviting] = React.useState(false);
  return (
    <>
      <Stack.Screen options={{ title: call.title }} />
      <CallPanel call={call} footer={<TalkingAbout call={call} />} onInvite={() => setInviting(true)} />
      <InviteSheet call={call} visible={inviting} onClose={() => setInviting(false)} />
    </>
  );
}

/**
 * The call's page — orkestrator's `CallPage`: the room itself, and under it
 * what the call is talking about.
 */
function CallContent({ id }: { id: string }) {
  const { data, loading, error } = useGetCallQuery({ variables: { id }, fetchPolicy: 'cache-and-network' });
  const call = data?.call;
  if (!call) {
    if (loading) return <CallsLoadingState message="Loading the call…" />;
    return <Text className="p-4 text-sm text-destructive">{error?.message ?? 'Call not found.'}</Text>;
  }
  return <Call call={call} />;
}

export default function CallScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return (
    <View className="flex-1 bg-background">
      <Guard.Lok connectingFallback={<CallsLoadingState message="Connecting…" />}>
        <Guard.Lovekit fallback={<CallsUnavailable />}>
          <Guard.Livekit fallback={<CallsUnavailable />}>
            {id ? (
              <CallContent id={id} />
            ) : (
              <CallsEmptyState title="Call not found" description="The link names no call." />
            )}
          </Guard.Livekit>
        </Guard.Lovekit>
      </Guard.Lok>
    </View>
  );
}
