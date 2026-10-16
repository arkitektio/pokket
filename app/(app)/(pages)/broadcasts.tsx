import { HomeEmpty, HomeError, HomeLoading, HomeSection, ModuleHome } from '@/components/navigation/ModuleHome';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { useListCollaborativeBroadcastsQuery, useListSoloBroadcastsQuery } from '@/lib/lovekit/api/graphql';
import { showDetail } from '@/lib/navigation';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { ChevronRight, Radio, Users } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

function BroadcastRow({
  icon: Icon,
  title,
  detail,
  onPress,
}: {
  icon: typeof Radio;
  title: string;
  detail: string;
  onPress?: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center gap-3 border-b border-border px-4 py-3 active:bg-muted"
    >
      <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
        <Icon size={16} color={colors.primary} />
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className="text-base font-medium text-foreground">
          {title}
        </Text>
        <Text numberOfLines={1} className="text-xs text-muted-foreground">
          {detail}
        </Text>
      </View>
      {onPress ? <ChevronRight size={16} color={colors.mutedForeground} /> : null}
    </Pressable>
  );
}

type Queries = {
  solo: ReturnType<typeof useListSoloBroadcastsQuery>;
  collaborative: ReturnType<typeof useListCollaborativeBroadcastsQuery>;
};

/** What is live, under the module's pages: one section per kind of broadcast. */
function Live({ solo, collaborative }: Queries) {
  const soloBroadcasts = solo.data?.soloBroadcasts ?? [];
  const collaborativeBroadcasts = collaborative.data?.collaborativeBroadcasts ?? [];
  const error = solo.error ?? collaborative.error;

  if (!solo.data && !collaborative.data) {
    if (solo.loading || collaborative.loading) return <HomeLoading />;
    if (error) {
      return (
        <HomeError
          what="broadcasts"
          error={error}
          onRetry={() => void Promise.all([solo.refetch(), collaborative.refetch()]).catch(() => undefined)}
        />
      );
    }
  }

  if (!soloBroadcasts.length && !collaborativeBroadcasts.length) {
    return (
      <HomeEmpty title="Nothing is live">
        Broadcasts your organization starts show up here. Start one from this phone&apos;s camera above.
      </HomeEmpty>
    );
  }

  return (
    <>
      {soloBroadcasts.length ? (
        <HomeSection title="Solo broadcasts">
          <View className="border-t border-border">
            {soloBroadcasts.map((broadcast) => (
              <BroadcastRow
                key={broadcast.id}
                icon={Radio}
                title={broadcast.title}
                detail={`${broadcast.streamer.user.sub} · ${broadcast.streamer.client.clientId}`}
                onPress={() => showDetail(`/solo-broadcast/${broadcast.id}`)}
              />
            ))}
          </View>
        </HomeSection>
      ) : null}
      {collaborativeBroadcasts.length ? (
        <HomeSection title="Collaborative broadcasts">
          <View className="border-t border-border">
            {collaborativeBroadcasts.map((broadcast) => (
              <BroadcastRow
                key={broadcast.id}
                icon={Users}
                title={broadcast.title}
                detail={`${broadcast.streamers.length} streamer${broadcast.streamers.length === 1 ? '' : 's'} · ${broadcast.streamers
                  .map((streamer) => streamer.user.sub)
                  .join(', ')}`}
              />
            ))}
          </View>
        </HomeSection>
      ) : null}
    </>
  );
}

function BroadcastsContent() {
  const colors = useThemeColors();
  const solo = useListSoloBroadcastsQuery({ variables: { pagination: { limit: 20 } }, fetchPolicy: 'cache-and-network' });
  const collaborative = useListCollaborativeBroadcastsQuery({
    variables: { pagination: { limit: 20 } },
    fetchPolicy: 'cache-and-network',
  });
  const [refreshing, setRefreshing] = React.useState(false);
  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([solo.refetch(), collaborative.refetch()]);
    } catch {
      // The error shows on the page.
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="pb-10"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />}
    >
      <ModuleHome moduleKey="broadcasts">
        <Live solo={solo} collaborative={collaborative} />
      </ModuleHome>
    </ScrollView>
  );
}

/** The organization's broadcasts — orkestrator's lovekit home. */
export default function BroadcastsScreen() {
  const fallback = (title: string, line: string) => (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-10">
      <ModuleHome moduleKey="broadcasts">
        <HomeEmpty title={title}>{line}</HomeEmpty>
      </ModuleHome>
    </ScrollView>
  );
  return (
    <View className="flex-1 bg-background">
      <Guard.Lok
        connectingFallback={<HomeLoading />}
        notConnectedFallback={fallback('Not signed in', 'Sign in to see what your organization broadcasts.')}
      >
        <Guard.Lovekit fallback={fallback('Lovekit unavailable', 'This organization is not connected to Lovekit.')}>
          <BroadcastsContent />
        </Guard.Lovekit>
      </Guard.Lok>
    </View>
  );
}
