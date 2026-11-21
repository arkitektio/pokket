import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { StreamPlayer } from '@/components/streams/StreamPlayer';
import { useGetStreamQuery } from '@/lib/lovekit/api/graphql';
import { Stack, useLocalSearchParams } from 'expo-router';
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

function StreamContent({ streamId }: { streamId: string }) {
  const { data, loading, error, refetch } = useGetStreamQuery({
    variables: { id: streamId },
    skip: !streamId,
    fetchPolicy: 'cache-and-network',
  });

  const stream = data?.stream;

  return (
    <View className="flex-1 gap-4 bg-background px-4 py-6">
      <Stack.Screen options={{ title: stream?.title ?? 'Stream' }} />

      {loading && !stream ? <LoadingState message="Loading stream..." /> : null}

      {error && !stream ? (
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

      {stream ? (
        <>
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>{stream.title}</CardTitle>
              <CardDescription>{stream.description ?? (stream.live ? 'Live' : 'Offline')}</CardDescription>
            </CardHeader>
            <CardContent className="gap-1">
              <Text className="text-sm text-muted-foreground">
                From: {stream.agent.user.preferredUsername ?? stream.agent.user.sub}
              </Text>
              <Text className="text-xs text-muted-foreground">App: {stream.agent.name}</Text>
            </CardContent>
          </Card>

          <StreamPlayer key={stream.id} stream={stream} />
        </>
      ) : null}
    </View>
  );
}

export default function StreamDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const streamId = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <Guard.Lok
      connectingFallback={<LoadingState message="Connecting to Lok..." />}
      notConnectedFallback={
        <View className="flex-1 bg-background px-4 py-6">
          <EmptyState
            title="Lok connection required"
            description="Connect your account before opening a stream."
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
          {streamId ? (
            <StreamContent streamId={streamId} />
          ) : (
            <View className="flex-1 bg-background px-4 py-6">
              <EmptyState
                title="Stream not found"
                description="The selected stream id is missing from the route."
              />
            </View>
          )}
        </Guard.Livekit>
      </Guard.Lovekit>
    </Guard.Lok>
  );
}