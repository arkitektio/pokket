import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { SoloBroadcastPlayer } from '@/components/broadcasts/SoloBroadcastPlayer';
import { useGetSoloBroadcastQuery } from '@/lib/lovekit/api/graphql';
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
          <SoloBroadcastPlayer key={broadcast.id} broadcastId={broadcast.id} />
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