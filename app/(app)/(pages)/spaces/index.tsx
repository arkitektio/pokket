import { RekuestUnavailable, TasksEmptyState, TasksLoadingState } from '@/components/tasks/states';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { Ordering, useSpacesQuery } from '@/lib/rekuest/api/graphql';
import { useTabTitle } from '@/lib/tabs/TabsProvider';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Link } from 'expo-router';
import { Box, ChevronRight } from 'lucide-react-native';
import * as React from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

/** The organization's spaces: rooms where its devices stand, to look at in 3D. */
function SpaceList() {
  const colors = useThemeColors();
  const [refreshing, setRefreshing] = React.useState(false);
  const { data, loading, error, refetch } = useSpacesQuery({
    variables: { ordering: [{ name: Ordering.Asc }], pagination: { limit: 200, offset: 0 } },
    fetchPolicy: 'cache-and-network',
  });
  const spaces = data?.spaces ?? [];

  if (loading && spaces.length === 0) return <TasksLoadingState message="Loading spaces…" />;

  return (
    <FlatList
      data={spaces}
      keyExtractor={(space) => space.id}
      renderItem={({ item }) => (
        <Link href={`/spaces/${item.id}`} asChild>
          <Pressable className="flex-row items-center gap-3 border-b border-border bg-background px-4 py-3 active:bg-muted">
            <Box size={20} color={colors.mutedForeground} />
            <Text numberOfLines={1} className="flex-1 text-base font-medium text-foreground">
              {item.name}
            </Text>
            <ChevronRight size={18} color={colors.mutedForeground} />
          </Pressable>
        </Link>
      )}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.primary}
          onRefresh={async () => {
            setRefreshing(true);
            try {
              await refetch();
            } catch {
              // The error shows above the list.
            } finally {
              setRefreshing(false);
            }
          }}
        />
      }
      ListHeaderComponent={error ? <Text className="px-4 py-2 text-sm text-destructive">Could not load spaces: {error.message}</Text> : undefined}
      ListEmptyComponent={
        error ? undefined : (
          <TasksEmptyState title="No spaces" description="A space places your devices in a room. Create one in orkestrator." />
        )
      }
    />
  );
}

export default function SpacesScreen() {
  useTabTitle('Spaces');
  return (
    <View className="flex-1 bg-background">
      <Guard.Lok connectingFallback={<TasksLoadingState message="Connecting…" />}>
        <Guard.Rekuest fallback={<RekuestUnavailable />}>
          <SpaceList />
        </Guard.Rekuest>
      </Guard.Lok>
    </View>
  );
}
