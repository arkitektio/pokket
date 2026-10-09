import { CallAboutButton } from '@/components/calls/CallAboutButton';
import { MessageCard } from '@/components/mail/MessageCard';
import { KuvertUnavailable, MailLoadingState } from '@/components/mail/states';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { useGetThreadQuery } from '@/lib/kuvert/api/graphql';
import { markRead, setFlagged, trash, useKuvertClient } from '@/lib/kuvert/mailOps';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { SearchButton } from '@/components/navigation/HeaderButtons';
import { useTabTitle } from '@/lib/tabs/TabsProvider';
import { Flag, MailMinus, Trash2 } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { toast } from 'sonner-native';

function ThreadContent({ id }: { id: string }) {
  const colors = useThemeColors();
  const client = useKuvertClient();
  const { data, loading, error, refetch } = useGetThreadQuery({
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const thread = data?.thread;
  const [refreshing, setRefreshing] = React.useState(false);
  useTabTitle(thread?.subject || null);

  // Opening a conversation reads it — once per visit, as orkestrator's
  // `useMarkThreadRead`; "Mark unread" afterwards is not undone by a refetch.
  const markedRef = React.useRef(false);
  React.useEffect(() => {
    if (!thread || markedRef.current) return;
    markedRef.current = true;
    const unread = thread.messages.filter((m) => !m.isRead).map((m) => m.id);
    if (unread.length) void markRead(client, unread, true).catch(() => undefined);
  }, [thread, client]);

  if (!thread) {
    if (loading) return <MailLoadingState message="Loading conversation…" />;
    return <Text className="p-4 text-sm text-destructive">{error?.message ?? 'Conversation not found.'}</Text>;
  }

  const ids = thread.messages.map((m) => m.id);
  const newest = thread.messages[thread.messages.length - 1];
  const flagged = thread.messages.some((m) => m.isFlagged);

  const headerRight = () => (
    <View className="flex-row items-center gap-5">
      <Pressable
        hitSlop={8}
        onPress={() => void setFlagged(client, newest ? [newest.id] : ids, !flagged).catch(() => undefined)}
      >
        <Flag size={20} color={colors.primary} fill={flagged ? colors.primary : 'transparent'} />
      </Pressable>
      <Pressable
        hitSlop={8}
        onPress={() => {
          if (!newest) return;
          markRead(client, [newest.id], false).then(() => {
            toast.success('Marked unread');
            router.back();
          }, () => undefined);
        }}
      >
        <MailMinus size={20} color={colors.primary} />
      </Pressable>
      <Pressable
        hitSlop={8}
        onPress={() =>
          trash(client, ids).then(() => {
            toast.success('Moved to Trash');
            router.back();
          }, () => undefined)
        }
      >
        <Trash2 size={20} color={colors.destructive} />
      </Pressable>
      <CallAboutButton />
      <SearchButton />
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: '', headerRight }} />
      <ScrollView
        className="flex-1 bg-background"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await refetch();
              } finally {
                setRefreshing(false);
              }
            }}
          />
        }
      >
        <View className="gap-3 px-4 py-4">
          <Text selectable className="text-xl font-bold text-foreground">
            {thread.subject || '(no subject)'}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {thread.account.name || thread.account.emailAddress} · {thread.messageCount} message
            {thread.messageCount === 1 ? '' : 's'}
          </Text>
          {thread.messages.map((message, index) => (
            <MessageCard
              key={message.id}
              message={message}
              initiallyOpen={index === thread.messages.length - 1 || !message.isRead}
            />
          ))}
        </View>
      </ScrollView>
    </>
  );
}

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View className="flex-1 bg-background">
      <Guard.Lok connectingFallback={<MailLoadingState message="Connecting…" />}>
        <Guard.Kuvert fallback={<KuvertUnavailable />}>
          <ThreadContent id={id} />
        </Guard.Kuvert>
      </Guard.Lok>
    </View>
  );
}
