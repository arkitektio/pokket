import { PickerSheet } from '@/components/bank/PickerSheet';
import { useAlertDialog } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { type RoomFragment, useDeleteRoomMutation } from '@/lib/alpaka/api/graphql';
import { agentDisplayName } from '@/lib/alpaka/chat/agentName';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { toast } from 'sonner-native';

const when = (iso?: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

function Fact({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View className="flex-row justify-between gap-4 border-b border-border py-2.5">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text selectable className="shrink text-right text-sm text-card-foreground">
        {value}
      </Text>
    </View>
  );
}

/** Who is in a room and how busy it has been, and the way to delete it. */
export function RoomInfoSheet({
  room,
  visible,
  onClose,
  onDeleted,
}: {
  room: RoomFragment;
  visible: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const alert = useAlertDialog();
  const [deleteRoom, { loading }] = useDeleteRoomMutation();

  // One line per person or bot, however many clients they joined with.
  const participants = [...new Set(room.agents.map((agent) => agentDisplayName(agent)))];
  const last = room.messages.reduce<string | null>((latest, m) => (!latest || m.createdAt > latest ? m.createdAt : latest), null);

  const remove = () =>
    alert.show('Delete this chat?', `“${room.title}” and its ${room.messages.length} messages are deleted for everyone.`, [
      { label: 'Cancel', variant: 'cancel' },
      {
        label: 'Delete',
        variant: 'destructive',
        onPress: () => {
          deleteRoom({
            variables: { id: room.id },
            update: (cache) => {
              cache.evict({ id: cache.identify({ __typename: 'Room', id: room.id }) });
              cache.gc();
            },
          }).then(
            () => {
              toast.success('Chat deleted');
              onDeleted();
            },
            () => undefined,
          );
        },
      },
    ]);

  return (
    <PickerSheet visible={visible} title={room.title} busy={loading} onClose={onClose}>
      <ScrollView className="px-3">
        {room.description ? <Text className="pb-3 text-sm text-muted-foreground">{room.description}</Text> : null}
        <Fact label="Started" value={when(room.createdAt)} />
        <Fact label="By" value={room.creator?.preferredUsername} />
        <Fact label="Organization" value={room.organization?.slug} />
        <Fact label="Messages" value={String(room.messages.length)} />
        <Fact label="Last message" value={when(last)} />
        <Fact label="In the room" value={participants.join(', ')} />
        <View className="pt-5">
          <Button variant="destructive" disabled={loading} onPress={remove}>
            <Text>Delete chat</Text>
          </Button>
        </View>
      </ScrollView>
    </PickerSheet>
  );
}
