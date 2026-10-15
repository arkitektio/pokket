import { MaterializedBlokRow } from '@/components/blok/MaterializedBlokRow';
import { RekuestUnavailable, TasksEmptyState, TasksLoadingState } from '@/components/tasks/states';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { Ordering, useListMaterializedBloksQuery } from '@/lib/rekuest/api/graphql';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Search, X } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, TextInput, View } from 'react-native';

const PAGE = 30;

function BlokList({ search }: { search: string }) {
  const colors = useThemeColors();
  const [refreshing, setRefreshing] = React.useState(false);
  const [exhausted, setExhausted] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);

  // With a search the server ranks; an ordering would replace that ranking.
  const { data, loading, error, refetch, fetchMore } = useListMaterializedBloksQuery({
    variables: {
      filters: search ? { search } : undefined,
      ordering: search ? undefined : [{ createdAt: Ordering.Desc }],
      pagination: { limit: PAGE, offset: 0 },
    },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: false,
  });
  const bloks = data?.materializedBloks ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      setExhausted(false);
    } catch {
      // The error shows above the list.
    } finally {
      setRefreshing(false);
    }
  };

  const onEndReached = async () => {
    if (exhausted || loadingMore || loading || bloks.length < PAGE) return;
    setLoadingMore(true);
    try {
      const result = await fetchMore({
        variables: { pagination: { limit: PAGE, offset: bloks.length } },
        updateQuery: (prev, { fetchMoreResult }) => {
          const known = new Set(prev.materializedBloks.map((b) => b.id));
          return {
            ...prev,
            materializedBloks: [...prev.materializedBloks, ...fetchMoreResult.materializedBloks.filter((b) => !known.has(b.id))],
          };
        },
      });
      if (result.data.materializedBloks.length < PAGE) setExhausted(true);
    } catch {
      setExhausted(true);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading && bloks.length === 0) return <TasksLoadingState message="Loading bloks…" />;

  return (
    <FlatList
      data={bloks}
      keyExtractor={(blok) => blok.id}
      renderItem={({ item }) => <MaterializedBlokRow blok={item} />}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} />}
      onEndReached={() => void onEndReached()}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={error ? <Text className="px-4 py-2 text-sm text-destructive">Could not load bloks: {error.message}</Text> : null}
      ListEmptyComponent={
        error ? null : (
          <TasksEmptyState
            title={search ? 'Nothing matches' : 'No bloks'}
            description={
              search
                ? `No blok matches “${search}”.`
                : 'Bloks show up here once one is materialized for your agents, e.g. in orkestrator.'
            }
          />
        )
      }
      ListFooterComponent={loadingMore ? <ActivityIndicator className="py-4" color={colors.primary} /> : null}
    />
  );
}

/** The organization's materialized bloks: interfaces bound to agents, to open and use. */
function BloksContent() {
  const colors = useThemeColors();
  const [term, setTerm] = React.useState('');
  const [search, setSearch] = React.useState('');
  React.useEffect(() => {
    const timeout = setTimeout(() => setSearch(term.trim()), 300);
    return () => clearTimeout(timeout);
  }, [term]);

  return (
    <>
      <View className="mx-4 my-2 flex-row items-center gap-2 rounded-xl border border-border bg-card px-3">
        <Search size={18} color={colors.mutedForeground} />
        <TextInput
          value={term}
          onChangeText={setTerm}
          placeholder="Search bloks"
          placeholderTextColor={colors.mutedForeground}
          autoCorrect={false}
          autoCapitalize="none"
          style={{ color: colors.foreground }}
          className="flex-1 py-3 text-base"
        />
        {term ? (
          <Pressable hitSlop={8} onPress={() => setTerm('')} accessibilityLabel="Clear">
            <X size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>
      <BlokList key={search} search={search} />
    </>
  );
}

export default function BloksScreen() {
  return (
    <View className="flex-1 bg-background">
      <Guard.Lok connectingFallback={<TasksLoadingState message="Connecting…" />}>
        <Guard.Rekuest fallback={<RekuestUnavailable />}>
          <BloksContent />
        </Guard.Rekuest>
      </Guard.Lok>
    </View>
  );
}
