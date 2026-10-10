import { useTabTitle } from '@/lib/tabs/TabsProvider';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { useQuery } from '@/lib/mikro/funcs';
import type { DocumentNode } from 'graphql';
import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { MikroMissing, MikroScreen } from './states';

/**
 * The frame of a mikro detail page: the object by the id in the route, its
 * name on the tab, pull to refresh, and the loading and not-found states.
 */
export function DetailPage<TData, TItem>({
  document,
  pick,
  title,
  what,
  children,
}: {
  /** One of mikro's `Get…($id)` queries. */
  document: DocumentNode;
  pick: (data: TData) => TItem | null | undefined;
  title: (item: TItem) => string;
  what: string;
  children: (item: TItem) => React.ReactNode;
}) {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <MikroScreen>
      <Body id={id} document={document} pick={pick} title={title} what={what}>
        {children}
      </Body>
    </MikroScreen>
  );
}

function Body<TData, TItem>({
  id,
  document,
  pick,
  title,
  what,
  children,
}: {
  id: string;
  /** One of mikro's `Get…($id)` queries. */
  document: DocumentNode;
  pick: (data: TData) => TItem | null | undefined;
  title: (item: TItem) => string;
  what: string;
  children: (item: TItem) => React.ReactNode;
}) {
  const colors = useThemeColors();
  const { data, loading, error, refetch } = useQuery<TData>(document, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const item = data ? pick(data) : null;
  useTabTitle(item ? title(item) : null);
  const [refreshing, setRefreshing] = React.useState(false);
  const refresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch {
      // What was loaded stays on screen.
    } finally {
      setRefreshing(false);
    }
  };

  if (!item) return <MikroMissing loading={loading} error={error} what={what} />;
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />}
    >
      {children(item)}
    </ScrollView>
  );
}
