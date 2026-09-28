import { Text } from '@/components/ui/text';
import { ListThreadFragment } from '@/lib/kuvert/api/graphql';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Link } from 'expo-router';
import { Flag, Mail, MailOpen, Paperclip, Trash2 } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import Swipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { formatMailDate } from './format';

/**
 * One conversation in a mail list — a port of orkestrator's `MailList` row:
 * unread dot, sender, count, date, attachment and flag, subject, snippet.
 * Swipe left to trash, right to toggle read.
 */
export function ThreadRow({
  thread,
  onTrash,
  onToggleRead,
}: {
  thread: ListThreadFragment;
  onTrash: (thread: ListThreadFragment) => void;
  onToggleRead: (thread: ListThreadFragment) => void;
}) {
  const colors = useThemeColors();
  const swipeable = React.useRef<SwipeableMethods>(null);
  const latest = thread.latestMessage;
  const sender =
    latest?.senderName || latest?.senderAddress || thread.participants[0]?.name || thread.participants[0]?.address || '(unknown)';
  const unread = thread.unreadCount > 0 || thread.unread;

  const act = (fn: () => void) => () => {
    swipeable.current?.close();
    fn();
  };

  return (
    <Swipeable
      ref={swipeable}
      friction={2}
      overshootRight={false}
      overshootLeft={false}
      renderLeftActions={() => (
        <Pressable
          onPress={act(() => onToggleRead(thread))}
          className="w-24 items-center justify-center bg-primary"
        >
          {unread ? <MailOpen size={22} color={colors.primaryForeground} /> : <Mail size={22} color={colors.primaryForeground} />}
          <Text className="mt-1 text-xs text-primary-foreground">{unread ? 'Read' : 'Unread'}</Text>
        </Pressable>
      )}
      renderRightActions={() => (
        <Pressable
          onPress={act(() => onTrash(thread))}
          className="w-24 items-center justify-center bg-destructive"
        >
          <Trash2 size={22} color={colors.destructiveForeground} />
          <Text className="mt-1 text-xs text-destructive-foreground">Trash</Text>
        </Pressable>
      )}
    >
      <Link href={`/mail/thread/${thread.id}`} asChild>
        <Pressable className="flex-row border-b border-border bg-background px-4 py-3 active:bg-muted">
          <View className="w-4 items-center pt-1.5">
            {unread ? <View className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
          </View>
          <View className="flex-1 gap-0.5">
            <View className="flex-row items-center gap-2">
              <Text
                numberOfLines={1}
                className={`flex-1 text-base ${unread ? 'font-semibold text-foreground' : 'text-foreground'}`}
              >
                {sender}
              </Text>
              {thread.messageCount > 1 ? (
                <Text className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">
                  {thread.messageCount}
                </Text>
              ) : null}
              {thread.hasAttachments ? <Paperclip size={13} color={colors.mutedForeground} /> : null}
              {thread.flagged ? <Flag size={13} color={colors.primary} fill={colors.primary} /> : null}
              <Text className="text-xs text-muted-foreground">{formatMailDate(thread.lastMessageAt)}</Text>
            </View>
            <Text numberOfLines={1} className={`text-sm ${unread ? 'font-medium text-foreground' : 'text-foreground'}`}>
              {thread.subject || '(no subject)'}
            </Text>
            {latest?.snippet ? (
              <Text numberOfLines={2} className="text-sm text-muted-foreground">
                {latest.snippet}
              </Text>
            ) : null}
          </View>
        </Pressable>
      </Link>
    </Swipeable>
  );
}
