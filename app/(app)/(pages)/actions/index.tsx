import { ActionRow } from '@/components/actions/ActionRow';
import { RekuestUnavailable, TasksEmptyState, TasksLoadingState } from '@/components/tasks/states';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { useActionsQuery } from '@/lib/rekuest/api/graphql';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Search, X } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, TextInput, View } from 'react-native';

const PAGE = 30;

function ActionList({ search }: { search: string }) {
  const colors = useThemeColors();
  const [refreshing, setRefreshing] = React.useState(false);
  const [exhausted, setExhausted] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);

  // With a search the server ranks; an ordering would replace that ranking.
  const { data, loading, error, refetch, fetchMore } = useActionsQuery({
    variables: { filters: search ? { search } : undefined, pagination: { limit: PAGE, offset: 0 } },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: false,
  });
  const actions = data?.actions ?? [];

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
    if (exhausted || loadingMore || loading || actions.length < PAGE) return;
    setLoadingMore(true);
    try {
      const result = await fetchMore({
        variables: { pagination: { limit: PAGE, offset: actions.length } },
        updateQuery: (prev, { fetchMoreResult }) => {
          const known = new Set(prev.actions.map((a) => a.id));
          return { ...prev, actions: [...prev.actions, ...fetchMoreResult.actions.filter((a) => !known.has(a.id))] };
        },
      });
      if (result.data.actions.length < PAGE) setExhausted(true);
    } catch {
      setExhausted(true);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading && actions.length === 0) return <TasksLoadingState message="Loading actions…" />;

  return (
    <FlatList
      data={actions}
      keyExtractor={(action) => action.id}
      renderItem={({ item }) => <ActionRow action={item} />}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} />}
      onEndReached={() => void onEndReached()}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={error ? <Text className="px-4 py-2 text-sm text-destructive">Could not load actions: {error.message}</Text> : null}
      ListEmptyComponent={
        error ? null : (
          <TasksEmptyState
            title={search ? 'Nothing matches' : 'No actions'}
            description={search ? `No action matches “${search}”.` : 'Actions show up here once an app that offers some has connected.'}
          />
        )
      }
      ListFooterComponent={loadingMore ? <ActivityIndicator className="py-4" color={colors.primary} /> : null}
    />
  );
}

/** What the organization's apps can do: orkestrator's actions catalog, to search and run from. */
function ActionsContent() {
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
          placeholder="Search actions"
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
      <ActionList key={search} search={search} />
    </>
  );
}

export default function ActionsScreen() {
  return (
    <View className="flex-1 bg-background">
      <Guard.Lok connectingFallback={<TasksLoadingState message="Connecting…" />}>
        <Guard.Rekuest fallback={<RekuestUnavailable />}>
          <ActionsContent />
        </Guard.Rekuest>
      </Guard.Lok>
    </View>
  );
}
