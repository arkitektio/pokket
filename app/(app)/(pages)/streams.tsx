import { HomeEmpty, HomeError, HomeLoading, HomeSection, ModuleHome } from '@/components/navigation/ModuleHome';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { StreamKind, useListStreamsQuery } from '@/lib/lovekit/api/graphql';
import { showDetail } from '@/lib/navigation';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Activity, ChevronRight, Mic, Radio } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

function StreamRow({
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

type Streams = ReturnType<typeof useListStreamsQuery>;

/** What the organization's agents offer, live ones first. */
function Offered({ streams }: { streams: Streams }) {
  const offered = streams.data?.streams ?? [];

  if (!streams.data) {
    if (streams.loading) return <HomeLoading />;
    if (streams.error) {
      return <HomeError what="streams" error={streams.error} onRetry={() => void streams.refetch().catch(() => undefined)} />;
    }
  }

  if (!offered.length) {
    return <HomeEmpty title="No streams">Nothing in this organization offers a stream right now.</HomeEmpty>;
  }

  const row = (stream: (typeof offered)[number]) => (
    <StreamRow
      key={stream.id}
      icon={stream.kind === StreamKind.Audio ? Mic : stream.kind === StreamKind.Data ? Activity : Radio}
      title={stream.title}
      detail={`${stream.agent.user.preferredUsername ?? stream.agent.user.sub} · ${stream.agent.name}`}
      onPress={() => showDetail(`/stream/${stream.id}`)}
    />
  );
  const live = offered.filter((stream) => stream.live);
  const offline = offered.filter((stream) => !stream.live);

  return (
    <>
      {live.length ? (
        <HomeSection title="Live">
          <View className="border-t border-border">{live.map(row)}</View>
        </HomeSection>
      ) : null}
      {offline.length ? (
        <HomeSection title="Offline">
          <View className="border-t border-border">{offline.map(row)}</View>
        </HomeSection>
      ) : null}
    </>
  );
}

function StreamsContent() {
  const colors = useThemeColors();
  const streams = useListStreamsQuery({ variables: { pagination: { limit: 50 } }, fetchPolicy: 'cache-and-network' });
  const [refreshing, setRefreshing] = React.useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await streams.refetch();
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
      <ModuleHome moduleKey="streams">
        <Offered streams={streams} />
      </ModuleHome>
    </ScrollView>
  );
}

/** The organization's streams — orkestrator's lovekit home. */
export default function StreamsScreen() {
  const fallback = (title: string, line: string) => (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-10">
      <ModuleHome moduleKey="streams">
        <HomeEmpty title={title}>{line}</HomeEmpty>
      </ModuleHome>
    </ScrollView>
  );
  return (
    <View className="flex-1 bg-background">
      <Guard.Lok
        connectingFallback={<HomeLoading />}
        notConnectedFallback={fallback('Not signed in', 'Sign in to see what your organization streams.')}
      >
        <Guard.Lovekit fallback={fallback('Lovekit unavailable', 'This organization is not connected to Lovekit.')}>
          <StreamsContent />
        </Guard.Lovekit>
      </Guard.Lok>
    </View>
  );
}
