import { PickerRow, PickerSearch, PickerSheet } from '@/components/bank/PickerSheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { type ListUserFragment, useMeQuery, useUsersQuery } from '@/lib/lok/api/graphql';
import { useInviteToCallMutation } from '@/lib/lovekit/api/graphql';
import { initials } from '@/lib/lovekit/call/lobby';
import * as React from 'react';
import { FlatList, Image, View } from 'react-native';
import { toast } from 'sonner-native';

const displayName = (user: ListUserFragment) =>
  [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;

/** A member's picture, or their initials when they have none (or it fails). */
function UserAvatar({ user }: { user: ListUserFragment }) {
  const [failed, setFailed] = React.useState(false);
  const picture = user.avatar?.startsWith('http') && !failed ? user.avatar : null;
  return (
    <View className="h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-primary/15">
      {picture ? (
        <Image source={{ uri: picture }} style={{ width: 28, height: 28 }} onError={() => setFailed(true)} />
      ) : (
        <Text className="text-[10px] font-semibold text-primary">{initials(displayName(user))}</Text>
      )}
    </View>
  );
}

function InviteBody({ call, onClose }: { call: { id: string; title: string }; onClose: () => void }) {
  const [search, setSearch] = React.useState('');
  const [picked, setPicked] = React.useState<readonly string[]>([]);
  const { data: me } = useMeQuery({ fetchPolicy: 'cache-first' });
  const { data, loading, error } = useUsersQuery({
    variables: { filters: search ? { search } : undefined, pagination: { limit: 30 } },
    fetchPolicy: 'cache-and-network',
  });
  const [invite, { loading: inviting }] = useInviteToCallMutation();

  // Everyone but the member themselves. lok's user id is the `sub` lovekit
  // invites by, as in orkestrator's dialog.
  const users = (data?.users ?? []).filter((user) => user.id !== me?.me.id);

  const toggle = (id: string) =>
    setPicked((current) => (current.includes(id) ? current.filter((other) => other !== id) : [...current, id]));

  const send = async () => {
    try {
      await invite({ variables: { input: { call: call.id, users: [...picked] } } });
      toast.success(picked.length === 1 ? 'Invitation sent' : `${picked.length} invitations sent`);
      onClose();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not invite');
    }
  };

  return (
    <>
      <Text className="px-3 pb-3 text-xs text-muted-foreground">
        Their app rings with a Join button, on every device they have it open on. Everyone in the organization can
        also join from Calls.
      </Text>
      <PickerSearch value={search} onChangeText={setSearch} placeholder="Search people" />
      <FlatList
        className="flex-1"
        data={users}
        keyExtractor={(user) => user.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <PickerRow
            leading={<UserAvatar user={item} />}
            title={displayName(item)}
            detail={displayName(item) === item.username ? item.email : item.username}
            selected={picked.includes(item.id)}
            onPress={() => toggle(item.id)}
          />
        )}
        ListEmptyComponent={
          <Text className="p-3 text-sm text-muted-foreground">
            {error ? error.message : loading ? 'Loading people…' : 'Nobody found.'}
          </Text>
        }
      />
      <Button className="mt-2" disabled={picked.length === 0 || inviting} onPress={() => void send()}>
        <Text>{picked.length > 1 ? `Invite ${picked.length} people` : 'Invite'}</Text>
      </Button>
    </>
  );
}

/**
 * Ask people into a call — orkestrator's `InviteToCallDialog`. What they get
 * is an invitation ringing in their app; nothing is pushed to a phone that
 * has pokket closed, and anyone in the organization can join without one.
 */
export function InviteSheet({
  call,
  visible,
  onClose,
}: {
  call: { id: string; title: string };
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <PickerSheet visible={visible} title={`Invite to “${call.title}”`} onClose={onClose}>
      <InviteBody call={call} onClose={onClose} />
    </PickerSheet>
  );
}
