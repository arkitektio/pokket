import { CallRow } from '@/components/calls/CallRow';
import { InviteRow } from '@/components/calls/InviteRow';
import { CallsEmptyState, CallsLoadingState, CallsUnavailable } from '@/components/calls/states';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { useListCallsQuery } from '@/lib/lovekit/api/graphql';
import { useCallInvites } from '@/lib/lovekit/call/invites';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import * as React from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

const SectionTitle = ({ title }: { title: string }) => (
  <Text className="px-4 pb-2 pt-4 text-xs font-semibold uppercase text-muted-foreground">{title}</Text>
);

/** The organization's calls in progress — orkestrator's `Calls` page. */
function CallsContent() {
  const colors = useThemeColors();
  const { data, loading, error, refetch } = useListCallsQuery({
    variables: { filter: { live: true }, pagination: { limit: 30 } },
    pollInterval: 15_000,
    fetchPolicy: 'cache-and-network',
  });
  const [refreshing, setRefreshing] = React.useState(false);
  const calls = data?.calls;
  // Kept current by `CallInvitesWatcher`, at the root.
  const invites = useCallInvites();

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch {
      // Shown below, from the query's own error.
    } finally {
      setRefreshing(false);
    }
  };

  if (!calls && loading) return <CallsLoadingState message="Loading calls…" />;

  return (
    <FlatList
      data={calls ?? []}
      keyExtractor={(call) => call.id}
      renderItem={({ item }) => <CallRow call={item} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />}
      ListHeaderComponent={
        <>
          {invites.length > 0 ? <SectionTitle title="Invitations" /> : null}
          {invites.map((invite) => (
            <InviteRow key={invite.id} invite={invite} />
          ))}
          <SectionTitle title="In progress" />
        </>
      }
      ListEmptyComponent={
        error ? (
          <Text className="p-4 text-sm text-destructive">{error.message}</Text>
        ) : (
          <CallsEmptyState
            title="No calls in progress"
            description="Calls your organization starts are listed here, and anyone in it can join. Start one from a task, a transaction, a conversation or a broadcast."
          />
        )
      }
    />
  );
}

export default function CallsScreen() {
  return (
    <View className="flex-1 bg-background">
      <Guard.Lok connectingFallback={<CallsLoadingState message="Connecting…" />}>
        <Guard.Lovekit fallback={<CallsUnavailable />}>
          <Guard.Livekit fallback={<CallsUnavailable />}>
            <CallsContent />
          </Guard.Livekit>
        </Guard.Lovekit>
      </Guard.Lok>
    </View>
  );
}
