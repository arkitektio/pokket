import { ActionSheet, type ActionSheetOption } from '@/components/navigation/ActionSheet';
import { SearchButton, ShareButton } from '@/components/navigation/HeaderButtons';
import { Text } from '@/components/ui/text';
import {
  type ListMessageFragment,
  useGetRoomQuery,
  useSendMessageMutation,
  WatchMessagesDocument,
  type WatchMessagesSubscription,
  type WatchMessagesSubscriptionVariables,
} from '@/lib/alpaka/api/graphql';
import { agentDisplayName, DEFAULT_AGENT_NAME, displayInitials } from '@/lib/alpaka/chat/agentName';
import { takeFirstMessage } from '@/lib/alpaka/chat/firstMessage';
import { byCreation, isOwnMessage } from '@/lib/alpaka/chat/ownership';
import {
  confirmPending,
  dropPending,
  isUnconfirmed,
  type PendingMessage,
  settlePending,
  startPending,
} from '@/lib/alpaka/chat/pendingMessages';
import type { ReplyerController } from '@/lib/alpaka/chat/useReplyer';
import { useMeQuery } from '@/lib/lok/api/graphql';
import { showPage } from '@/lib/navigation';
import { useTabTitle } from '@/lib/tabs/TabsProvider';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import * as Crypto from 'expo-crypto';
import { Stack } from 'expo-router';
import { Info } from 'lucide-react-native';
import * as React from 'react';
import { FlatList, KeyboardAvoidingView, Pressable, Share, View } from 'react-native';
import { toast } from 'sonner-native';
import { Composer } from './Composer';
import { type BubbleMessage, MessageBubble } from './MessageBubble';
import { ReplyerSheet } from './ReplyerSheet';
import { RoomInfoSheet } from './RoomInfoSheet';
import { ChatEmptyState, ChatLoadingState } from './states';
import { TaskPills } from './TaskPills';

/** The name pokket joins every room under, as orkestrator does. */
const AGENT_ID = DEFAULT_AGENT_NAME;

type Row = { key: string; message: BubbleMessage; own: boolean; name: string; pending: boolean };

/**
 * A chat room: orkestrator's `Chat`. Messages arrive through the room's
 * subscription, a reply as updates of one message growing; what you send
 * shows at once and pulses until the room delivers it back.
 *
 * `replyer` is null where there is no rekuest: the room is then a message
 * board, and replies come only from whoever else is in it.
 */
export function ChatRoom({ id, replyer }: { id: string; replyer: ReplyerController | null }) {
  const colors = useThemeColors();
  const { data, loading, error, subscribeToMore } = useGetRoomQuery({ variables: { id }, fetchPolicy: 'cache-and-network' });
  const { data: me } = useMeQuery({ fetchPolicy: 'cache-first' });
  const [send] = useSendMessageMutation();
  const room = data?.room;
  useTabTitle(room?.title);

  React.useEffect(
    () =>
      subscribeToMore<WatchMessagesSubscription, WatchMessagesSubscriptionVariables>({
        document: WatchMessagesDocument,
        variables: { room: id, agentId: AGENT_ID },
        updateQuery: (prev, { subscriptionData }) => {
          const message = subscriptionData.data.room.message;
          // An update of a message we hold lands in the cache by its id; only a new one is added here.
          if (!message || !prev.room || prev.room.messages.some((existing) => existing.id === message.id)) return prev;
          return { ...prev, room: { ...prev.room, messages: [...prev.room.messages, message] } };
        },
        onError: (e) => console.warn('[alpaka] room stream closed', e),
      }),
    [id, subscribeToMore],
  );

  const messages = React.useMemo(() => byCreation(room?.messages ?? []), [room?.messages]);
  const messagesRef = React.useRef(messages);
  React.useEffect(() => {
    messagesRef.current = messages;
  });
  // A message landing while a replyer still runs may be its reply: have its pill checked.
  const count = messages.length;
  const recheckSoon = replyer?.recheckSoon;
  React.useEffect(() => {
    if (count > 0) recheckSoon?.();
  }, [count, recheckSoon]);

  const [pendings, setPendings] = React.useState<PendingMessage[]>([]);
  const waiting = React.useMemo(() => settlePending(pendings, messages), [pendings, messages]);

  const run = replyer?.run;
  const sendMessage = React.useCallback(
    async (text: string) => {
      const localId = Crypto.randomUUID();
      setPendings((prev) => startPending(settlePending(prev, messagesRef.current), localId, text, [], new Date().toISOString()));
      try {
        const result = await send({ variables: { input: { text, room: id, agentId: AGENT_ID } } });
        const created = result.data?.send;
        if (!created) throw new Error('The message was not accepted');
        setPendings((prev) => confirmPending(prev, localId, created.id));
        await run?.(created.id);
      } catch (e) {
        setPendings((prev) => dropPending(prev, localId));
        toast.error(`Could not send: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
    [id, send, run],
  );

  // The message the chat home opened this room with, once the room is there to send it in.
  const roomLoaded = !!room;
  const replyerReady = !replyer || replyer.ready;
  React.useEffect(() => {
    if (!roomLoaded || !replyerReady) return;
    const first = takeFirstMessage(id);
    if (first) void sendMessage(first);
  }, [id, roomLoaded, replyerReady, sendMessage]);

  const [held, setHeld] = React.useState<BubbleMessage | null>(null);
  const [picking, setPicking] = React.useState(false);
  const [info, setInfo] = React.useState(false);

  // Where this page starts on the screen: what the keyboard has to be measured against.
  const frame = React.useRef<View>(null);
  const [top, setTop] = React.useState(0);
  const measure = () => frame.current?.measureInWindow((_x, y) => setTop((current) => (Math.abs(current - y) > 1 ? y : current)));

  const rows = React.useMemo<Row[]>(() => {
    const delivered: Row[] = messages.map((message: ListMessageFragment) => ({
      key: message.id,
      message,
      own: isOwnMessage(message.agent, me?.me),
      name: agentDisplayName(message.agent),
      pending: false,
    }));
    const sent: Row[] = waiting.map((pending) => ({
      key: pending.localId,
      message: { id: pending.localId, text: pending.text, createdAt: pending.createdAt, attachedStructures: [] },
      own: true,
      name: 'You',
      pending: isUnconfirmed(pending),
    }));
    // Newest first: the list is inverted, so it rests at the newest message.
    return [...delivered, ...sent].reverse();
  }, [messages, waiting, me]);

  if (!room) {
    if (loading) return <ChatLoadingState message="Loading chat…" />;
    return <Text className="p-4 text-sm text-destructive">{error?.message ?? 'This chat was not found.'}</Text>;
  }

  const canReply = !!replyer?.chosen && !replyer.blocker;
  const heldOptions: ActionSheetOption[] = held
    ? [
        ...(canReply && !waiting.some((p) => p.localId === held.id)
          ? [{ label: `Reply again with ${replyer!.chosen!.name}`, onPress: () => void replyer!.run(held.id) }]
          : []),
        ...(held.text ? [{ label: 'Share', onPress: () => void Share.share({ message: held.text }).catch(() => undefined) }] : []),
      ]
    : [];

  const headerRight = () => (
    <View className="flex-row items-center">
      <Pressable onPress={() => setInfo(true)} hitSlop={10} accessibilityLabel="About this chat" className="active:opacity-70">
        <Info size={21} color={colors.foreground} />
      </Pressable>
      <ShareButton />
      <SearchButton />
    </View>
  );

  return (
    <View ref={frame} onLayout={measure} className="flex-1 bg-background">
      <Stack.Screen options={{ title: room.title, headerRight }} />
      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={top} className="flex-1">
        <FlatList
          inverted
          data={rows}
          keyExtractor={(row) => row.key}
          renderItem={({ item }) => (
            <MessageBubble
              message={item.message}
              own={item.own}
              senderName={item.name}
              senderInitials={displayInitials(item.name)}
              pending={item.pending}
              onLongPress={setHeld}
            />
          )}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ paddingVertical: 8, flexGrow: 1 }}
          ListEmptyComponent={
            // Inverted lists flip their empty state too; flip it back.
            <View style={{ transform: [{ scaleY: -1 }] }}>
              <ChatEmptyState
                title="Nothing said yet"
                description={canReply ? `Write a message and ${replyer!.chosen!.name} answers.` : 'Write the first message.'}
              />
            </View>
          }
        />
        {replyer ? <TaskPills tasks={replyer.tasks} onCancel={replyer.cancel} onDismiss={replyer.dismiss} /> : null}
        <Composer
          onSend={(text) => void sendMessage(text)}
          replyer={
            replyer
              ? {
                  label: replyer.chosen ? (replyer.blocker ? `${replyer.chosen.name} needs settings` : replyer.chosen.name) : 'No replyer',
                  warning: !!replyer.blocker,
                  onPress: () => setPicking(true),
                }
              : undefined
          }
        />
      </KeyboardAvoidingView>
      {replyer ? <ReplyerSheet visible={picking} onClose={() => setPicking(false)} replyer={replyer} /> : null}
      <RoomInfoSheet
        room={room}
        visible={info}
        onClose={() => setInfo(false)}
        onDeleted={() => {
          setInfo(false);
          showPage('/alpaka');
        }}
      />
      <ActionSheet visible={!!held && heldOptions.length > 0} options={heldOptions} onClose={() => setHeld(null)} />
    </View>
  );
}
