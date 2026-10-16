import { AgentRow } from '@/components/agents/AgentRow';
import { RekuestUnavailable, TasksEmptyState, TasksLoadingState } from '@/components/tasks/states';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { agentSections } from '@/lib/rekuest/agents/order';
import { Ordering, useAgentsQuery } from '@/lib/rekuest/api/graphql';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Search, X } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, RefreshControl, SectionList, TextInput, View } from 'react-native';

/**
 * How many agents are fetched. The server orders by `lastSeen` alone, so
 * active-first is sorted here, over everything fetched rather than page by page.
 */
const LIMIT = 200;

function AgentList({ search }: { search: string }) {
  const colors = useThemeColors();
  const [refreshing, setRefreshing] = React.useState(false);
  const { data, loading, error, refetch } = useAgentsQuery({
    variables: {
      filters: search ? { search } : undefined,
      ordering: [{ lastSeen: Ordering.Desc }],
      pagination: { limit: LIMIT, offset: 0 },
    },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: false,
  });
  const sections = React.useMemo(() => agentSections(data?.agents ?? []), [data?.agents]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch {
      // The error shows above the list.
    } finally {
      setRefreshing(false);
    }
  };

  if (loading && !data) return <TasksLoadingState message="Loading agents…" />;

  return (
    <SectionList
      sections={sections}
      keyExtractor={(agent) => agent.id}
      renderItem={({ item }) => <AgentRow agent={item} />}
      renderSectionHeader={({ section }) => (
        <Text className="bg-background px-4 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {section.title} · {section.data.length}
        </Text>
      )}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} />}
      ListHeaderComponent={error ? <Text className="px-4 py-2 text-sm text-destructive">Could not load agents: {error.message}</Text> : null}
      ListEmptyComponent={
        error ? null : (
          <TasksEmptyState
            title={search ? 'Nothing matches' : 'No agents'}
            description={search ? `No agent matches “${search}”.` : 'Agents show up here once an app that offers actions has connected.'}
          />
        )
      }
    />
  );
}

/** The apps registered to run actions: orkestrator's agents page, active ones first. */
function AgentsContent() {
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
          placeholder="Search agents"
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
      <AgentList key={search} search={search} />
    </>
  );
}

export default function AgentsScreen() {
  return (
    <View className="flex-1 bg-background">
      <Guard.Lok connectingFallback={<TasksLoadingState message="Connecting…" />}>
        <Guard.Rekuest fallback={<RekuestUnavailable />}>
          <AgentsContent />
        </Guard.Rekuest>
      </Guard.Lok>
    </View>
  );
}
