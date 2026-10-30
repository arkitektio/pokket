import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { App } from '@/lib/app/App';
import { useJoinBroadcastMutation } from '@/lib/lovekit/api/graphql';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { cn } from '@/lib/utils';
import { AudioSession, isTrackReference, LiveKitRoom, useTracks, VideoTrack } from '@livekit/react-native';
import { Track } from 'livekit-client';
import type { LivekitClient } from '@/lib/livekit/client';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

function StreamRenderer() {
  const trackRefs = useTracks([Track.Source.Camera], { onlySubscribed: true });

  const streamerTrack = React.useMemo(
    () =>
      trackRefs.find(
        (trackRef) => isTrackReference(trackRef) && trackRef.participant.identity.startsWith('streamer'),
      ),
    [trackRefs],
  );

  if (!streamerTrack || !isTrackReference(streamerTrack)) {
    return (
      <View className="h-full items-center justify-center px-6">
        <Text className="text-center text-sm text-muted-foreground">Waiting for broadcast...</Text>
      </View>
    );
  }

  return <VideoTrack trackRef={streamerTrack} style={{ width: '100%', height: '100%' }} />;
}

/**
 * A lovekit solo broadcast, live: joins it for a token and plays the
 * streamer's camera. orkestrator's `StreamJoiner`. Needs the lovekit and
 * livekit services; callers guard for them.
 *
 * `className` sizes the video box (`h-80` unless given).
 */
export function SoloBroadcastPlayer({ broadcastId, className }: { broadcastId: string; className?: string }) {
  const colors = useThemeColors();
  const livekit = App.useService('livekit');
  const [joinBroadcast] = useJoinBroadcastMutation();
  const [token, setToken] = React.useState<string | null>(null);
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [roomError, setRoomError] = React.useState<string | null>(null);
  const [joining, setJoining] = React.useState(true);

  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let current = true;

    joinBroadcast({
      variables: {
        input: { broadcast: broadcastId },
      },
    })
      .then((result) => {
        if (!result.data?.joinBroadcast) {
          throw new Error('No broadcast token returned');
        }

        if (current) {
          setToken(result.data.joinBroadcast);
        }
      })
      .catch((error) => {
        if (current) {
          setJoinError(error instanceof Error ? error.message : 'Unable to join broadcast');
        }
      })
      .finally(() => {
        if (current) {
          setJoining(false);
        }
      });

    return () => {
      current = false;
    };
  }, [attempt, broadcastId, joinBroadcast]);

  React.useEffect(() => {
    if (!token) {
      return;
    }

    void AudioSession.startAudioSession();

    return () => {
      void AudioSession.stopAudioSession();
    };
  }, [token]);

  if (joining && !token) {
    return (
      <View className="items-center justify-center py-16">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4 text-sm text-muted-foreground">Joining broadcast...</Text>
      </View>
    );
  }

  if (joinError && !token) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="gap-4 py-6">
          <Text className="text-sm text-destructive">{joinError}</Text>
          <Button
            variant="outline"
            className="self-start rounded-xl border-border"
            onPress={() => {
              setJoining(true);
              setJoinError(null);
              setRoomError(null);
              setToken(null);
              setAttempt((previous) => previous + 1);
            }}
          >
            <Text className="text-sm font-medium text-foreground">Retry join</Text>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <View className="gap-3">
      <View className={cn('h-80 overflow-hidden rounded-2xl border border-border bg-black', className)}>
        <LiveKitRoom
          token={token ?? undefined}
          serverUrl={(livekit.client as LivekitClient).url}
          connect={Boolean(token)}
          audio={false}
          video={false}
          onError={(error) => {
            setRoomError(error.message);
          }}
        >
          <StreamRenderer />
        </LiveKitRoom>
      </View>
      {roomError ? <Text className="text-sm text-destructive">{roomError}</Text> : null}
    </View>
  );
}

export default SoloBroadcastPlayer;
