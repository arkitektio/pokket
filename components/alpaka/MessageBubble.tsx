import { Text } from '@/components/ui/text';
import { messageTime } from '@/lib/alpaka/chat/ownership';
import type { CallStructure } from '@/lib/lovekit/call/structures';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import * as React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { AttachmentChips } from './AttachmentChips';
import { Markdown } from './Markdown';

export type BubbleMessage = {
  id: string;
  text: string;
  createdAt: string;
  isStreaming?: boolean;
  attachedStructures: readonly CallStructure[];
};

type Props = {
  message: BubbleMessage;
  own: boolean;
  senderName: string;
  senderInitials: string;
  /** Sent but not acknowledged by the server yet. */
  pending?: boolean;
  onLongPress?: (message: BubbleMessage) => void;
};

/** One message: mine on the right in the primary colour, anyone else's on the left with who it is from. */
export const MessageBubble = React.memo(function MessageBubble({
  message,
  own,
  senderName,
  senderInitials,
  pending,
  onLongPress,
}: Props) {
  const colors = useThemeColors();
  return (
    <View className={`flex-row items-end gap-2 px-3 py-1 ${own ? 'justify-end' : 'justify-start'}`}>
      {own ? null : (
        <View className="h-7 w-7 items-center justify-center rounded-full bg-primary/15">
          <Text className="text-[10px] font-semibold text-primary">{senderInitials}</Text>
        </View>
      )}
      <Pressable
        onLongPress={onLongPress ? () => onLongPress(message) : undefined}
        delayLongPress={350}
        style={{ maxWidth: '85%', opacity: pending ? 0.6 : 1 }}
        className={`gap-2 rounded-2xl px-3 py-2 ${own ? 'rounded-br-md bg-primary' : 'rounded-bl-md border border-border bg-card'}`}
      >
        {own ? null : <Text className="text-xs font-medium text-muted-foreground">{senderName}</Text>}
        {message.text ? <Markdown text={message.text} own={own} /> : null}
        {message.isStreaming ? (
          <ActivityIndicator size="small" color={own ? colors.primaryForeground : colors.mutedForeground} className="self-start" />
        ) : null}
        <AttachmentChips structures={message.attachedStructures} own={own} />
        <Text className={`self-end text-[10px] ${own ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
          {pending ? 'Sending…' : messageTime(message.createdAt)}
        </Text>
      </Pressable>
    </View>
  );
});
