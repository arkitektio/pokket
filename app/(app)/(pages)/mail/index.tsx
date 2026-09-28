import { ThreadRow } from '@/components/mail/ThreadRow';
import { KuvertUnavailable, MailEmptyState, MailLoadingState } from '@/components/mail/states';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { ListThreadFragment, useListThreadsQuery } from '@/lib/kuvert/api/graphql';
import { SMART_MAILBOXES, SmartMailbox } from '@/lib/kuvert/mailboxes';
import { markThreadRead, trashThread, useKuvertClient } from '@/lib/kuvert/mailOps';
import { useMailboxSyncs } from '@/lib/kuvert/useMailboxSyncs';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import * as React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTabTitle } from '@/lib/tabs/TabsProvider';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { toast } from 'sonner-native';

const PAGE = 30;

/**
 * The one `mailboxSyncs` subscription. Lives on the list, which stays mounted
 * under a pushed conversation, so both refresh from it.
 */
function MailboxSyncs() {
  useMailboxSyncs();
  return null;
}

function MailboxChips({ active, onSelect }: { active: SmartMailbox['key']; onSelect: (key: SmartMailbox['key']) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="grow-0 border-b border-border">
      <View className="flex-row gap-2 px-4 py-2">
        {SMART_MAILBOXES.map((box) => {
          const selected = box.key === active;
          return (
            <Pressable
              key={box.key}
              onPress={() => onSelect(box.key)}
              className={`rounded-full border px-4 py-1.5 ${selected ? 'border-primary bg-primary' : 'border-border bg-card'}`}
            >
              <Text className={`text-sm font-medium ${selected ? 'text-primary-foreground' : 'text-foreground'}`}>
                {box.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function ThreadList({ mailbox }: { mailbox: SmartMailbox }) {
  const colors = useThemeColors();
  const client = useKuvertClient();
  const [refreshing, setRefreshing] = React.useState(false);
  const [exhausted, setExhausted] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);

  const { data, loading, error, refetch, fetchMore } = useListThreadsQuery({
    variables: { ...mailbox.variables, pagination: { limit: PAGE, offset: 0 } },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: false,
  });
  const threads = data?.threads ?? [];

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
      setExhausted(false);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const onEndReached = React.useCallback(async () => {
    if (exhausted || loadingMore || loading || threads.length < PAGE) return;
    setLoadingMore(true);
    try {
      const result = await fetchMore({
        variables: { pagination: { limit: PAGE, offset: threads.length } },
        updateQuery: (prev, { fetchMoreResult }) => {
          const known = new Set(prev.threads.map((t) => t.id));
          return { ...prev, threads: [...prev.threads, ...fetchMoreResult.threads.filter((t) => !known.has(t.id))] };
        },
      });
      if (result.data.threads.length < PAGE) setExhausted(true);
    } finally {
      setLoadingMore(false);
    }
  }, [exhausted, loadingMore, loading, threads.length, fetchMore]);

  const onTrash = React.useCallback(
    (thread: ListThreadFragment) => {
      trashThread(client, thread.id).then(
        () => toast.success('Moved to Trash'),
        () => undefined,
      );
    },
    [client],
  );

  const onToggleRead = React.useCallback(
    (thread: ListThreadFragment) => {
      const unread = thread.unreadCount > 0 || thread.unread;
      void markThreadRead(client, thread.id, unread).catch(() => undefined);
    },
    [client],
  );

  if (loading && threads.length === 0) return <MailLoadingState message="Loading mail…" />;

  return (
    <FlatList
      data={threads}
      keyExtractor={(t) => t.id}
      renderItem={({ item }) => <ThreadRow thread={item} onTrash={onTrash} onToggleRead={onToggleRead} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        error ? <Text className="px-4 py-2 text-sm text-destructive">Could not load mail: {error.message}</Text> : null
      }
      ListEmptyComponent={<MailEmptyState title={mailbox.empty.title} description={mailbox.empty.description} />}
      ListFooterComponent={loadingMore ? <ActivityIndicator className="py-4" color={colors.primary} /> : null}
    />
  );
}

export default function MailScreen() {
  // The mailbox is in the URL, so the sidebar's links, these chips and the
  // tab all name the same page.
  const { box } = useLocalSearchParams<{ box?: string }>();
  const active = (SMART_MAILBOXES.find((m) => m.key === box)?.key ?? 'inbox') as SmartMailbox['key'];
  const setActive = (key: SmartMailbox['key']) => router.setParams({ box: key === 'inbox' ? undefined : key });
  const mailbox = SMART_MAILBOXES.find((m) => m.key === active) ?? SMART_MAILBOXES[0];
  useTabTitle(mailbox.key === 'inbox' ? 'Mail' : `Mail · ${mailbox.label}`);

  return (
    <View className="flex-1 bg-background">
      <Guard.Lok connectingFallback={<MailLoadingState message="Connecting…" />}>
        <Guard.Kuvert fallback={<KuvertUnavailable />}>
          <MailboxSyncs />
          <MailboxChips active={active} onSelect={setActive} />
          <ThreadList key={mailbox.key} mailbox={mailbox} />
        </Guard.Kuvert>
      </Guard.Lok>
    </View>
  );
}
