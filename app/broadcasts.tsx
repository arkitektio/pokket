import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import {
    useListCollaborativeBroadcastsQuery,
    useListSoloBroadcastsQuery,
} from '@/lib/lovekit/api/graphql';
import { Link, Stack } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

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

function BroadcastsContent() {
  const {
    data: soloData,
    loading: soloLoading,
    error: soloError,
    refetch: refetchSolo,
  } = useListSoloBroadcastsQuery({
    variables: { pagination: { limit: 20 } },
    fetchPolicy: 'cache-and-network',
  });
  const {
    data: collaborativeData,
    loading: collaborativeLoading,
    error: collaborativeError,
    refetch: refetchCollaborative,
  } = useListCollaborativeBroadcastsQuery({
    variables: { pagination: { limit: 20 } },
    fetchPolicy: 'cache-and-network',
  });

  const soloBroadcasts = soloData?.soloBroadcasts ?? [];
  const collaborativeBroadcasts = collaborativeData?.collaborativeBroadcasts ?? [];
  const totalBroadcasts = soloBroadcasts.length + collaborativeBroadcasts.length;
  const hasInitialLoad = soloLoading || collaborativeLoading;
  const errorMessage = soloError?.message ?? collaborativeError?.message;

  const handleRefresh = React.useCallback(async () => {
    await Promise.all([refetchSolo(), refetchCollaborative()]);
  }, [refetchCollaborative, refetchSolo]);

  if (hasInitialLoad && totalBroadcasts === 0) {
    return <LoadingState message="Loading broadcasts..." />;
  }

  return (
    <View className="gap-4">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Current broadcasts</CardTitle>
          <CardDescription>
            {totalBroadcasts} broadcast{totalBroadcasts === 1 ? '' : 's'} currently available.
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <View className="flex-row flex-wrap gap-2">
            <Link href="/solo-broadcast/start" asChild>
              <Button
                className="flex-row items-center gap-2 rounded-xl"
              >
                <IconSymbol name="plus" size={16} color="white" />
                <Text className="text-sm font-medium text-primary-foreground">Start solo broadcast</Text>
              </Button>
            </Link>
            <Button
              variant="outline"
              className="flex-row items-center gap-2 rounded-xl border-border bg-background"
              onPress={() => {
                void handleRefresh();
              }}
            >
              <IconSymbol name="arrow.clockwise" size={16} color="hsl(170, 36%, 43%)" />
              <Text className="text-sm font-medium text-foreground">Refresh</Text>
            </Button>
          </View>
          {errorMessage ? (
            <Text className="text-sm text-destructive">
              Unable to refresh all broadcasts: {errorMessage}
            </Text>
          ) : null}
        </CardContent>
      </Card>

      <View className="gap-3">
        <Text className="text-lg font-semibold text-foreground">Solo broadcasts</Text>
        {soloBroadcasts.length === 0 ? (
          <EmptyState
            title="No solo broadcasts"
            description="No solo broadcasts are currently being returned by Lovekit."
          />
        ) : (
          soloBroadcasts.map((broadcast) => (
            <Link key={broadcast.id} href={`/solo-broadcast/${broadcast.id}`} asChild>
              <Pressable className="active:opacity-90">
                <Card className="border-border bg-card">
                  <CardContent className="gap-1 py-5">
                    <Text className="text-base font-semibold text-card-foreground">{broadcast.title}</Text>
                    <Text className="text-sm text-muted-foreground">
                      Streamer: {broadcast.streamer.user.sub}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Client: {broadcast.streamer.client.clientId}
                    </Text>
                    <Text className="pt-2 text-xs font-medium text-primary">
                      Open live broadcast
                    </Text>
                  </CardContent>
                </Card>
              </Pressable>
            </Link>
          ))
        )}
      </View>

      <View className="gap-3 pb-6">
        <Text className="text-lg font-semibold text-foreground">Collaborative broadcasts</Text>
        {collaborativeBroadcasts.length === 0 ? (
          <EmptyState
            title="No collaborative broadcasts"
            description="No collaborative broadcasts are currently being returned by Lovekit."
          />
        ) : (
          collaborativeBroadcasts.map((broadcast) => (
            <Card key={broadcast.id} className="border-border bg-card">
              <CardContent className="gap-1 py-5">
                <Text className="text-base font-semibold text-card-foreground">{broadcast.title}</Text>
                <Text className="text-sm text-muted-foreground">
                  {broadcast.streamers.length} streamer{broadcast.streamers.length === 1 ? '' : 's'}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {broadcast.streamers.map((streamer) => streamer.user.sub).join(', ')}
                </Text>
              </CardContent>
            </Card>
          ))
        )}
      </View>
    </View>
  );
}

export default function BroadcastsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Broadcasts' }} />
      <ScrollView className="flex-1 bg-background">
        <View className="px-4 py-6">
          <Guard.Lok
            connectingFallback={<LoadingState message="Connecting to Lok..." />}
            notConnectedFallback={
              <EmptyState
                title="Lok connection required"
                description="Connect your account before browsing active broadcasts."
              />
            }
          >
            <Guard.Lovekit
              fallback={
                <EmptyState
                  title="Lovekit unavailable"
                  description="This workspace is not currently connected to the Lovekit service."
                />
              }
            >
              <BroadcastsContent />
            </Guard.Lovekit>
          </Guard.Lok>
        </View>
      </ScrollView>
    </>
  );
}