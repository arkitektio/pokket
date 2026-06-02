import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Text } from '@/components/ui/text';
import { App, Guard } from '@/lib/app/App';
import {
    StreamKind,
    useEnsureSoloBroadcastMutation,
    useEnsureStreamMutation,
    type SoloBroadcastFragment,
} from '@/lib/lovekit/api/graphql';
import {
    AudioSession,
    LiveKitRoom,
    useLocalParticipant,
    VideoTrack,
} from '@livekit/react-native';
import { Link, Stack } from 'expo-router';
import { Track } from 'livekit-client';
import * as React from 'react';
import { ActivityIndicator, ScrollView, TextInput, View } from 'react-native';

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="items-center py-8">
        <View className="mb-3 rounded-full bg-primary/10 p-4">
          <IconSymbol
            name="antenna.radiowaves.left.and.right"
            size={24}
            color="hsl(170, 36%, 43%)"
          />
        </View>
        <Text className="text-center text-lg font-semibold text-card-foreground">{title}</Text>
        <Text className="mt-2 text-center text-sm text-muted-foreground">{description}</Text>
      </CardContent>
    </Card>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <View className="items-center justify-center py-16">
      <ActivityIndicator size="large" color="hsl(170, 36%, 43%)" />
      <Text className="mt-4 text-sm text-muted-foreground">{message}</Text>
    </View>
  );
}

function LocalCameraPreview() {
  const { localParticipant, cameraTrack, isCameraEnabled, lastCameraError } =
    useLocalParticipant();

  const trackRef = React.useMemo(() => {
    if (!cameraTrack) {
      return undefined;
    }

    return {
      participant: localParticipant,
      publication: cameraTrack,
      source: Track.Source.Camera,
    };
  }, [cameraTrack, localParticipant]);

  return (
    <View className="flex-1 bg-black">
      {trackRef ? (
        <VideoTrack trackRef={trackRef} style={{ width: '100%', height: '100%' }} mirror />
      ) : (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-sm text-white/80">
            {isCameraEnabled ? 'Starting camera preview...' : 'Camera preview will appear once the room connects.'}
          </Text>
        </View>
      )}
      {lastCameraError ? (
        <View className="absolute bottom-28 left-4 right-4 rounded-2xl bg-black/65 px-4 py-3">
          <Text className="text-sm text-red-300">Camera error: {lastCameraError.message}</Text>
        </View>
      ) : null}
    </View>
  );
}

function BroadcasterRoom({
  broadcast,
  token,
  startedAt,
  roomError,
  onRoomError,
  onStop,
}: {
  broadcast: SoloBroadcastFragment;
  token: string;
  startedAt: number | null;
  roomError: string | null;
  onRoomError: (message: string) => void;
  onStop: () => void;
}) {
  const livekit = App.useService('livekit');
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (!startedAt) {
      return;
    }

    setNow(Date.now());
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [startedAt]);

  const liveDuration = React.useMemo(() => {
    if (!startedAt) {
      return '00:00';
    }

    const totalSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');

    return `${minutes}:${seconds}`;
  }, [now, startedAt]);

  React.useEffect(() => {
    void AudioSession.startAudioSession();

    return () => {
      void AudioSession.stopAudioSession();
    };
  }, []);

  return (
    <View className="flex-1 bg-black">
      <LiveKitRoom
        token={token}
        serverUrl={livekit.client.url}
        connect
        video
        onError={(error) => {
          onRoomError(error.message);
        }}
      >
        <LocalCameraPreview />
      </LiveKitRoom>

      <View className="absolute left-4 right-4 top-14 flex-row items-start justify-between">
        <View className="max-w-[70%] gap-2">
          <View className="self-start rounded-full bg-red-600/95 px-3 py-1.5">
            <Text className="text-xs font-semibold text-white">LIVE {liveDuration}</Text>
          </View>
          <View className="self-start rounded-2xl bg-black/60 px-3 py-2">
            <Text className="text-sm font-medium text-white">{broadcast.title}</Text>
          </View>
        </View>

        <Link href={`/solo-broadcast/${broadcast.id}`} asChild>
          <Button variant="outline" className="rounded-full border-white/30 bg-black/50 px-4">
            <Text className="text-sm font-medium text-white">Viewer</Text>
          </Button>
        </Link>
      </View>

      <View className="absolute bottom-10 left-4 right-4 gap-3">
        {roomError ? (
          <View className="rounded-2xl bg-black/65 px-4 py-3">
            <Text className="text-sm text-red-300">{roomError}</Text>
          </View>
        ) : null}

        <View className="flex-row items-center justify-center gap-3">
          <Button variant="outline" className="rounded-full border-white/30 bg-black/50 px-5" onPress={onStop}>
            <Text className="text-sm font-medium text-white">Stop</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}

function StartSoloBroadcastContent() {
  const [ensureSoloBroadcast] = useEnsureSoloBroadcastMutation();
  const [ensureStream] = useEnsureStreamMutation();
  const [title, setTitle] = React.useState('My solo broadcast');
  const [broadcast, setBroadcast] = React.useState<SoloBroadcastFragment | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [startedAt, setStartedAt] = React.useState<number | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [roomError, setRoomError] = React.useState<string | null>(null);

  const handleStart = React.useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    setRoomError(null);
    setToken(null);
    setStartedAt(null);

    try {
      const ensured = await ensureSoloBroadcast({
        variables: {
          input: {
            title: title.trim() || undefined,
          },
        },
      });

      const nextBroadcast = ensured.data?.ensureSoloBroadcast;

      if (!nextBroadcast) {
        throw new Error('Unable to create solo broadcast');
      }

      setBroadcast(nextBroadcast);

      const ensuredStream = await ensureStream({
        variables: {
          input: {
            broadcast: nextBroadcast.id,
            kind: StreamKind.Video,
            title: title.trim() || undefined,
          },
        },
      });

      const nextToken = ensuredStream.data?.ensureStream;

      if (!nextToken) {
        throw new Error('Unable to create broadcast stream');
      }

      setToken(nextToken);
      setStartedAt(Date.now());
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to start solo broadcast');
    } finally {
      setSubmitting(false);
    }
  }, [ensureSoloBroadcast, ensureStream, title]);

  const handleStop = React.useCallback(() => {
    setToken(null);
    setBroadcast(null);
    setStartedAt(null);
    setRoomError(null);
  }, []);

  if (broadcast && token) {
    return (
      <View className="flex-1 bg-black">
        <Stack.Screen options={{ title: broadcast.title, headerShown: false }} />
        <BroadcasterRoom
          broadcast={broadcast}
          token={token}
          startedAt={startedAt}
          roomError={roomError}
          onRoomError={setRoomError}
          onStop={handleStop}
        />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 py-6 gap-4">
      <Stack.Screen options={{ title: 'Start Solo Broadcast', headerShown: true }} />

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Start solo broadcast</CardTitle>
          <CardDescription>
            Create a solo broadcast and publish your camera live.
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-4">
          <View>
            <Text className="mb-2 text-sm font-medium text-foreground">Broadcast title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Name your broadcast"
              placeholderTextColor="hsl(165, 8%, 35%)"
              autoCapitalize="sentences"
              autoCorrect={false}
              className="rounded-xl border border-border bg-card px-4 py-3 text-card-foreground"
            />
          </View>

          <Button
            className="rounded-xl"
            onPress={() => {
              void handleStart();
            }}
            disabled={submitting}
          >
            <Text className="text-sm font-medium text-primary-foreground">
              {submitting ? 'Starting broadcast...' : token ? 'Restart broadcast session' : 'Start broadcast'}
            </Text>
          </Button>

          {submitError ? <Text className="text-sm text-destructive">{submitError}</Text> : null}
        </CardContent>
      </Card>

      {submitting && !token ? <LoadingState message="Creating and joining broadcast..." /> : null}

      {!broadcast && !submitting ? (
        <EmptyState
          title="Not streaming yet"
          description="Choose a title and start a solo broadcast to publish your camera."
        />
      ) : null}
    </ScrollView>
  );
}

export default function StartSoloBroadcastScreen() {
  return (
    <Guard.Lok
      connectingFallback={<LoadingState message="Connecting to Lok..." />}
      notConnectedFallback={
        <View className="flex-1 bg-background px-4 py-6">
          <EmptyState
            title="Lok connection required"
            description="Connect your account before starting a solo broadcast."
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
          <StartSoloBroadcastContent />
        </Guard.Livekit>
      </Guard.Lovekit>
    </Guard.Lok>
  );
}