import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { MessageFragment, useGetMessageLazyQuery } from '@/lib/kuvert/api/graphql';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Flag, ImageOff, Paperclip } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { addressLabel, formatBytes, formatMailDate, formatMailDateTime, monogram } from './format';
import { MessageBody } from './MessageBody';

const AddressLine = ({ label, addresses }: { label: string; addresses: { name: string; address: string }[] }) =>
  addresses.length ? (
    <Text numberOfLines={2} className="text-xs text-muted-foreground">
      <Text className="text-xs font-medium text-muted-foreground">{label} </Text>
      {addresses.map(addressLabel).join(', ')}
    </Text>
  ) : null;

/**
 * One message of a conversation — a port of orkestrator's `MessageView`.
 * Folded, it is a one-line summary; open, it shows the headers, the body and
 * the attachments. Remote images stay blocked until asked for.
 */
export function MessageCard({ message, initiallyOpen }: { message: MessageFragment; initiallyOpen: boolean }) {
  const colors = useThemeColors();
  const [open, setOpen] = React.useState(initiallyOpen);
  const [loadRemote, { data: remote, loading: loadingRemote }] = useGetMessageLazyQuery({
    variables: { id: message.id, allowRemote: true },
    fetchPolicy: 'network-only',
  });
  const html = remote?.message?.html ?? message.html;
  const sender = message.senderName || message.senderAddress;

  return (
    <Card className="border-border bg-card">
      <Pressable onPress={() => setOpen((o) => !o)} className="flex-row items-center gap-3 px-4 pt-4 pb-3">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/15">
          <Text className="text-sm font-semibold text-primary">{monogram(sender)}</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text numberOfLines={1} className={`flex-1 text-sm ${message.isRead ? '' : 'font-semibold'} text-card-foreground`}>
              {sender}
            </Text>
            {message.isFlagged ? <Flag size={12} color={colors.primary} fill={colors.primary} /> : null}
            <Text className="text-xs text-muted-foreground">
              {open ? formatMailDateTime(message.date) : formatMailDate(message.date)}
            </Text>
          </View>
          {open ? (
            message.senderName ? (
              <Text numberOfLines={1} className="text-xs text-muted-foreground">{message.senderAddress}</Text>
            ) : null
          ) : (
            <Text numberOfLines={1} className="text-xs text-muted-foreground">{message.snippet}</Text>
          )}
        </View>
      </Pressable>

      {open ? (
        <CardContent className="gap-3 pt-0">
          <View className="gap-0.5">
            <AddressLine label="To" addresses={message.to} />
            <AddressLine label="Cc" addresses={message.cc} />
            <AddressLine label="Reply-To" addresses={message.replyTo} />
          </View>

          {message.hasRemoteImages && !remote ? (
            <Pressable
              onPress={() => void loadRemote()}
              className="flex-row items-center gap-2 rounded-lg bg-muted px-3 py-2 active:opacity-80"
            >
              <ImageOff size={14} color={colors.mutedForeground} />
              <Text className="flex-1 text-xs text-muted-foreground">
                {loadingRemote ? 'Loading images…' : 'Remote images are blocked. Tap to load them.'}
              </Text>
            </Pressable>
          ) : null}

          <MessageBody html={html} text={message.textBody} />

          {message.truncated ? (
            <Text className="text-xs text-muted-foreground">This message was shortened by the server.</Text>
          ) : null}

          {message.attachments.filter((a) => !a.inline).length ? (
            <View className="flex-row flex-wrap gap-2">
              {message.attachments
                .filter((a) => !a.inline)
                .map((a) => (
                  <View key={a.id} className="flex-row items-center gap-1.5 rounded-full border border-border px-3 py-1">
                    <Paperclip size={12} color={colors.mutedForeground} />
                    <Text numberOfLines={1} className="max-w-[180px] text-xs text-foreground">{a.filename}</Text>
                    <Text className="text-xs text-muted-foreground">{formatBytes(a.size)}</Text>
                  </View>
                ))}
            </View>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}
