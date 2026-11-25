import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { App } from '@/lib/app/App';
import { StreamKind, Transport, useGetStreamQuery, useWatchAgentMutation } from '@/lib/lovekit/api/graphql';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { cn } from '@/lib/utils';
import { AudioSession, isTrackReference, LiveKitRoom, useTracks, VideoTrack } from '@livekit/react-native';
import { Track } from 'livekit-client';
import type { LivekitClient } from '@/lib/livekit/client';
import { describeMediaPath, useMediaPath } from '@/lib/livekit/useMediaPath';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

/** What the player needs of a stream to show it. */
export type ShownStream = {
  key: string;
  title: string;
  kind: StreamKind;
  live?: boolean | null;
  agent: { id: string };
};

const Notice = ({ children }: { children: string }) => (
  <View className="h-full items-center justify-center px-6">
    <Text className="text-center text-sm text-muted-foreground">{children}</Text>
  </View>
);

/** The participant an agent publishes its streams as (lovekit mints its token so). */
export const agentIdentity = (agentId: string) => `agent-${agentId}`;

/**
 * The stream's track in the joined room: the one its agent publishes under the
 * stream's key. Only the agent's: a viewer may publish too, and a track of the
 * same name from anyone else is not the stream.
 */
function PublishedTrack({ stream }: { stream: ShownStream }) {
  const audio = stream.kind === StreamKind.Audio;
  const trackRefs = useTracks([audio ? Track.Source.Microphone : Track.Source.Camera], { onlySubscribed: true });
  const publisher = agentIdentity(stream.agent.id);
  const track = React.useMemo(
    () =>
      trackRefs.find(
        (trackRef) =>
          isTrackReference(trackRef) &&
          trackRef.publication.trackName === stream.key &&
          trackRef.participant.identity === publisher,
      ),
    [trackRefs, stream.key, publisher],
  );

  if (!track || !isTrackReference(track)) {
    return <Notice>{stream.live === false ? `${stream.title} is offline` : `Waiting for ${stream.title}...`}</Notice>;
  }
  // Sound plays through the audio session the room holds; there is nothing to draw.
  if (audio) return <Notice>{stream.title}</Notice>;
  return <VideoTrack trackRef={track} style={{ width: '100%', height: '100%' }} />;
}

/**
 * One lovekit stream, live: joins its agent's room with a watching connection
 * and plays the track named by the stream's key. orkestrator's `StreamView`.
 * Needs the lovekit and livekit services; callers guard for them.
 *
 * `className` sizes the video box (`h-80` unless given).
 */
export function StreamPlayer({ stream, className }: { stream: ShownStream; className?: string }) {
  const colors = useThemeColors();
  const livekit = App.useService('livekit');
  const client = livekit.client as LivekitClient;
  const [watchAgent] = useWatchAgentMutation();
  const [token, setToken] = React.useState<string | null>(null);
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [roomError, setRoomError] = React.useState<string | null>(null);
  const [joining, setJoining] = React.useState(true);
  const [attempt, setAttempt] = React.useState(0);
  const agentId = stream.agent.id;
  const playable = stream.kind === StreamKind.Video || stream.kind === StreamKind.Audio;
  // How media gets to LiveKit: asked again with every retry, a restarted mesh has a new bridge.
  const media = useMediaPath(playable ? client : undefined, attempt);

  React.useEffect(() => {
    if (!playable) return;
    let current = true;

    watchAgent({ variables: { input: { agent: agentId } } })
      .then((result) => {
        const connection = result.data?.watchAgent;
        if (!connection) throw new Error('Lovekit handed out no connection');
        if (connection.transport !== Transport.Livekit) {
          throw new Error(`This app does not speak the ${connection.transport} transport`);
        }
        if (current) setToken(connection.credential);
      })
      .catch((error) => {
        if (current) setJoinError(error instanceof Error ? error.message : 'Unable to join the stream');
      })
      .finally(() => {
        if (current) setJoining(false);
      });

    return () => {
      current = false;
    };
  }, [attempt, agentId, playable, watchAgent]);

  React.useEffect(() => {
    if (!token) return;
    void AudioSession.startAudioSession();
    return () => {
      void AudioSession.stopAudioSession();
    };
  }, [token]);

  if (!playable) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-6">
          <Text className="text-sm text-muted-foreground">
            {stream.title} is a {String(stream.kind).toLowerCase()} stream, which this app does not show yet. Open it in Orkestrator.
          </Text>
        </CardContent>
      </Card>
    );
  }

  const retry = () => {
    setJoining(true);
    setJoinError(null);
    setRoomError(null);
    setToken(null);
    setAttempt((previous) => previous + 1);
  };

  if (media.status === 'error') {
    return (
      <Card className="border-border bg-card">
        <CardContent className="gap-4 py-6">
          <Text className="text-sm text-destructive">{media.error}</Text>
          <Button variant="outline" className="self-start rounded-xl border-border" onPress={retry}>
            <Text className="text-sm font-medium text-foreground">Retry join</Text>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if ((joining && !token) || media.status === 'pending') {
    return (
      <View className="items-center justify-center py-16">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4 text-sm text-muted-foreground">Joining stream...</Text>
      </View>
    );
  }

  if (joinError && !token) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="gap-4 py-6">
          <Text className="text-sm text-destructive">{joinError}</Text>
          <Button variant="outline" className="self-start rounded-xl border-border" onPress={retry}>
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
          serverUrl={client.url}
          connect={Boolean(token)}
          connectOptions={media.connectOptions}
          audio={false}
          video={false}
          onError={(error) => {
            setRoomError(error.message);
          }}
        >
          <PublishedTrack stream={stream} />
        </LiveKitRoom>
      </View>
      {roomError ? (
        <View className="flex-row items-center gap-3">
          <Text className="flex-1 text-sm text-destructive">{roomError}</Text>
          {/* A retry asks for the media path again: after the app was suspended, the bridge is a new one. */}
          <Button variant="outline" className="rounded-xl border-border" onPress={retry}>
            <Text className="text-sm font-medium text-foreground">Retry</Text>
          </Button>
        </View>
      ) : media.path.kind === 'media-bridge' ? (
        <Text className="text-xs text-muted-foreground">{describeMediaPath(media.path)}</Text>
      ) : null}
    </View>
  );
}

/** A stream known only by its id (a blok's structure): looked up, then played. */
export function StreamPlayerById({ streamId, className }: { streamId: string; className?: string }) {
  const colors = useThemeColors();
  const { data, error } = useGetStreamQuery({ variables: { id: streamId }, fetchPolicy: 'cache-and-network' });
  const stream = data?.stream;

  if (!stream) {
    return (
      <View className={cn('h-80 items-center justify-center rounded-2xl bg-black', className)}>
        {error ? <Text className="px-6 text-center text-sm text-destructive">{error.message}</Text> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }
  return <StreamPlayer key={stream.id} stream={stream} className={className} />;
}

export default StreamPlayerById;
