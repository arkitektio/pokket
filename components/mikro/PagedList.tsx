import { Text } from '@/components/ui/text';
import { useQuery } from '@/lib/mikro/funcs';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import type { DocumentNode } from 'graphql';
import * as React from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { MikroEmptyState, MikroLoadingState } from './states';

const PAGE = 30;

type Chip<K extends string> = { key: K; label: string };

/** A row of filter pills; the list under it is re-keyed by the selection. */
export function Chips<K extends string>({
  options,
  active,
  onSelect,
}: {
  options: readonly Chip<K>[];
  active: K;
  onSelect: (key: K) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="grow-0 border-b border-border">
      <View className="flex-row gap-2 px-4 py-2">
        {options.map((option) => {
          const selected = option.key === active;
          return (
            <Pressable
              key={option.key}
              onPress={() => onSelect(option.key)}
              className={`rounded-full border px-4 py-1.5 ${selected ? 'border-primary bg-primary' : 'border-border bg-card'}`}
            >
              <Text className={`text-sm font-medium ${selected ? 'text-primary-foreground' : 'text-foreground'}`}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

type Props<T> = {
  /** One of mikro's list queries: `($filters, $pagination, $ordering)`. */
  document: DocumentNode;
  /** The field of the result that holds the rows. */
  field: string;
  filters?: Record<string, unknown>;
  ordering?: Record<string, 'ASC' | 'DESC'>[];
  renderItem: (item: T) => React.ReactElement;
  empty: { title: string; description: string };
  what: string;
};

/**
 * A mikro list, thirty at a time: the offset paging of the mail list. There
 * is no total, so the list is exhausted when a page comes back short.
 */
export function PagedList<T extends { id: string }>({ document, field, filters, ordering, renderItem, empty, what }: Props<T>) {
  const colors = useThemeColors();
  const [refreshing, setRefreshing] = React.useState(false);
  const [exhausted, setExhausted] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);

  const { data, loading, error, refetch, fetchMore } = useQuery<Record<string, T[]>>(document, {
    variables: { filters, ordering, pagination: { limit: PAGE, offset: 0 } },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: false,
  });
  const items = data?.[field] ?? [];

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
      setExhausted(false);
    } catch {
      // The error shows above the list.
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const onEndReached = React.useCallback(async () => {
    if (exhausted || loadingMore || loading || items.length < PAGE) return;
    setLoadingMore(true);
    try {
      const result = await fetchMore({
        variables: { pagination: { limit: PAGE, offset: items.length } },
        updateQuery: (prev, { fetchMoreResult }) => {
          const known = new Set((prev[field] ?? []).map((item) => item.id));
          const more = (fetchMoreResult[field] ?? []).filter((item) => !known.has(item.id));
          return { ...prev, [field]: [...(prev[field] ?? []), ...more] };
        },
      });
      if ((result.data?.[field]?.length ?? 0) < PAGE) setExhausted(true);
    } catch {
      setExhausted(true);
    } finally {
      setLoadingMore(false);
    }
  }, [exhausted, loadingMore, loading, items.length, fetchMore, field]);

  if (loading && items.length === 0) return <MikroLoadingState message={`Loading ${what}…`} />;

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => renderItem(item)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        error ? <Text className="px-4 py-2 text-sm text-destructive">Could not load {what}: {error.message}</Text> : null
      }
      ListEmptyComponent={error ? null : <MikroEmptyState title={empty.title} description={empty.description} />}
      ListFooterComponent={loadingMore ? <ActivityIndicator className="py-4" color={colors.primary} /> : null}
    />
  );
}
