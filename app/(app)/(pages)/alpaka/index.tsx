import { Composer } from '@/components/alpaka/Composer';
import { RoomRow, roomRoute } from '@/components/alpaka/RoomRow';
import { ChatEmptyState, ChatLoadingState, ChatUnavailable } from '@/components/alpaka/states';
import { Text } from '@/components/ui/text';
import { useCreateRoomMutation, useRecentRoomsQuery } from '@/lib/alpaka/api/graphql';
import { leaveFirstMessage } from '@/lib/alpaka/chat/firstMessage';
import { greeting, groupByBucket, rankRecentRooms, titleFromPrompt, type RecentRoom } from '@/lib/alpaka/chat/recentRooms';
import { Guard } from '@/lib/app/App';
import { useMeQuery } from '@/lib/lok/api/graphql';
import { showDetail } from '@/lib/navigation';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import * as React from 'react';
import { KeyboardAvoidingView, RefreshControl, SectionList, View } from 'react-native';
import { toast } from 'sonner-native';

const RECENT = 50;

/** Chat's front page — orkestrator's alpaka home: say something to start a chat, or pick up a recent one. */
function HomeContent() {
  const colors = useThemeColors();
  const { data: me } = useMeQuery({ fetchPolicy: 'cache-first' });
  const { data, loading, error, refetch } = useRecentRoomsQuery({
    variables: { pagination: { limit: RECENT } },
    fetchPolicy: 'cache-and-network',
  });
  const [createRoom, { loading: creating }] = useCreateRoomMutation();
  const [refreshing, setRefreshing] = React.useState(false);

  const sections = React.useMemo(
    () => groupByBucket(rankRecentRooms(data?.rooms ?? [])).map((group) => ({ title: group.bucket, data: group.rooms })),
    [data],
  );

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch {
      // The error shows above the list.
    } finally {
      setRefreshing(false);
    }
  };

  const start = async (text: string) => {
    try {
      const result = await createRoom({ variables: { input: { title: titleFromPrompt(text) } } });
      const room = result.data?.createRoom;
      if (!room) throw new Error('The chat was not created');
      // The room sends it, so it shows as any message does and gets its reply.
      leaveFirstMessage(room.id, text);
      showDetail(roomRoute(room.id));
      void refetch().catch(() => undefined);
    } catch (e) {
      toast.error(`Could not start a chat: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const frame = React.useRef<View>(null);
  const [top, setTop] = React.useState(0);
  const measure = () => frame.current?.measureInWindow((_x, y) => setTop((current) => (Math.abs(current - y) > 1 ? y : current)));

  const name = me?.me.firstName || me?.me.username;
  return (
    <View ref={frame} onLayout={measure} className="flex-1">
      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={top} className="flex-1">
        <SectionList<RecentRoom>
          sections={sections}
          keyExtractor={(room) => room.id}
          renderItem={({ item }) => <RoomRow room={item} />}
          renderSectionHeader={({ section }) => (
            <Text className="bg-background px-4 pb-2 pt-4 text-xs font-semibold uppercase text-muted-foreground">{section.title}</Text>
          )}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View className="gap-1 px-4 pb-2 pt-6">
              <Text className="text-2xl font-semibold text-foreground">
                {greeting()}
                {name ? `, ${name}` : ''}
              </Text>
              <Text className="text-sm text-muted-foreground">Write below to start a chat.</Text>
              {error ? <Text className="pt-2 text-sm text-destructive">Could not load chats: {error.message}</Text> : null}
            </View>
          }
          ListEmptyComponent={
            !data && loading ? (
              <ChatLoadingState message="Loading chats…" />
            ) : error ? null : (
              <ChatEmptyState title="No chats yet" description="Your conversations show up here." />
            )
          }
        />
        <Composer onSend={(text) => void start(text)} placeholder="Start a chat…" disabled={creating} />
      </KeyboardAvoidingView>
    </View>
  );
}

export default function ChatHomeScreen() {
  return (
    <View className="flex-1 bg-background">
      <Guard.Lok connectingFallback={<ChatLoadingState message="Connecting…" />}>
        <Guard.Alpaka fallback={<ChatUnavailable />}>
          <HomeContent />
        </Guard.Alpaka>
      </Guard.Lok>
    </View>
  );
}
