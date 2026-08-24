import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Text } from '@/components/ui/text';
import { App, Guard } from '@/lib/app/App';
import {
    useGetSoloBroadcastQuery,
    useJoinBroadcastMutation,
} from '@/lib/lovekit/api/graphql';
import {
    AudioSession,
    isTrackReference,
    LiveKitRoom,
    useTracks,
    VideoTrack,
} from '@livekit/react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Track } from 'livekit-client';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useThemeColors } from '@/lib/theme/BrandProvider';

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const colors = useThemeColors();
  return (
    <Card className="border-border bg-card">
      <CardContent className="items-center py-8">
        <View className="mb-3 rounded-full bg-primary/10 p-4">
          <IconSymbol
            name="antenna.radiowaves.left.and.right"
            size={24}
            color={colors.primary}
          />
        </View>
        <Text className="text-center text-lg font-semibold text-card-foreground">{title}</Text>
        <Text className="mt-2 text-center text-sm text-muted-foreground">{description}</Text>
      </CardContent>
    </Card>
  );
}

function LoadingState({ message }: { message: string }) {
  const colors = useThemeColors();
  return (
    <View className="items-center justify-center py-16">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text className="mt-4 text-sm text-muted-foreground">{message}</Text>
    </View>
  );
}

function StreamRenderer() {
  const trackRefs = useTracks([Track.Source.Camera], { onlySubscribed: true });

  const streamerTrack = React.useMemo(
    () =>
      trackRefs.find(
        (trackRef) =>
          isTrackReference(trackRef) && trackRef.participant.identity.startsWith('streamer')
      ),
    [trackRefs]
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

function SoloBroadcastPlayer({ broadcastId }: { broadcastId: string }) {
  const livekit = App.useService('livekit');
  const [joinBroadcast] = useJoinBroadcastMutation();
  const [token, setToken] = React.useState<string | null>(null);
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [roomError, setRoomError] = React.useState<string | null>(null);
  const [joining, setJoining] = React.useState(true);

  const requestToken = React.useCallback(async () => {
    setJoining(true);
    setJoinError(null);
    setRoomError(null);
    setToken(null);

    try {
      const result = await joinBroadcast({
        variables: {
          input: { broadcast: broadcastId },
        },
      });

      if (!result.data?.joinBroadcast) {
        throw new Error('No broadcast token returned');
      }

      setToken(result.data.joinBroadcast);
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : 'Unable to join broadcast');
    } finally {
      setJoining(false);
    }
  }, [broadcastId, joinBroadcast]);

  React.useEffect(() => {
    void requestToken();
  }, [requestToken]);

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
    return <LoadingState message="Joining broadcast..." />;
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
              void requestToken();
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
      <View className="h-80 overflow-hidden rounded-2xl border border-border bg-black">
        <LiveKitRoom
          token={token ?? undefined}
          serverUrl={livekit.client.url}
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

function SoloBroadcastContent({ broadcastId }: { broadcastId: string }) {
  const { data, loading, error, refetch } = useGetSoloBroadcastQuery({
    variables: { id: broadcastId },
    skip: !broadcastId,
    fetchPolicy: 'cache-and-network',
  });

  const broadcast = data?.soloBroadcast;

  return (
    <View className="flex-1 gap-4 bg-background px-4 py-6">
      <Stack.Screen options={{ title: broadcast?.title ?? 'Solo Broadcast' }} />

      {loading && !broadcast ? <LoadingState message="Loading broadcast details..." /> : null}

      {error && !broadcast ? (
        <Card className="border-border bg-card">
          <CardContent className="gap-4 py-6">
            <Text className="text-sm text-destructive">{error.message}</Text>
            <Button
              variant="outline"
              className="self-start rounded-xl border-border"
              onPress={() => {
                void refetch();
              }}
            >
              <Text className="text-sm font-medium text-foreground">Retry</Text>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {broadcast ? (
        <>
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>{broadcast.title}</CardTitle>
              <CardDescription>Live solo broadcast</CardDescription>
            </CardHeader>
            <CardContent className="gap-1">
              <Text className="text-sm text-muted-foreground">
                Streamer: {broadcast.streamer.user.sub}
              </Text>
              <Text className="text-xs text-muted-foreground">
                Client: {broadcast.streamer.client.clientId}
              </Text>
            </CardContent>
          </Card>
          <SoloBroadcastPlayer broadcastId={broadcast.id} />
        </>
      ) : null}
    </View>
  );
}

export default function SoloBroadcastDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const broadcastId = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <Guard.Lok
      connectingFallback={<LoadingState message="Connecting to Lok..." />}
      notConnectedFallback={
        <View className="flex-1 bg-background px-4 py-6">
          <EmptyState
            title="Lok connection required"
            description="Connect your account before opening a solo broadcast."
          />
        </View>
      }
    >
      <Guard.Lovekit
        fallback={
          <View className="flex-1 bg-background px-4 py-6">
            <EmptyState
              title="Lovekit unavailable"
              description="This workspace is not currently connected to the Lovekit service."
            />
          </View>
        }
      >
        <Guard.Livekit
          fallback={
            <View className="flex-1 bg-background px-4 py-6">
              <EmptyState
                title="LiveKit unavailable"
                description="This workspace is not currently connected to the LiveKit service."
              />
            </View>
          }
        >
          {broadcastId ? (
            <SoloBroadcastContent broadcastId={broadcastId} />
          ) : (
            <View className="flex-1 bg-background px-4 py-6">
              <EmptyState
                title="Broadcast not found"
                description="The selected broadcast id is missing from the route."
              />
            </View>
          )}
        </Guard.Livekit>
      </Guard.Lovekit>
    </Guard.Lok>
  );
}