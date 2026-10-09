import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { CallInviteFragment } from '@/lib/lovekit/api/graphql';
import { useDismissInvite } from '@/lib/lovekit/call/invites';
import { showCall } from '@/lib/lovekit/call/openCall';
import { useJoinCall } from '@/lib/lovekit/call/useJoinCall';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { usePathname } from 'expo-router';
import { PhoneIncoming } from 'lucide-react-native';
import { View } from 'react-native';

/**
 * One call the member was asked into — orkestrator's
 * `CallInviteNotifications` row. It stays here after its toast is swiped away.
 */
export function InviteRow({ invite }: { invite: CallInviteFragment }) {
  const colors = useThemeColors();
  const pathname = usePathname();
  const dismiss = useDismissInvite();
  const { join, joining } = useJoinCall();

  const accept = () => {
    showCall(invite.call.id, pathname);
    void join({ id: invite.call.id, title: invite.call.title });
    void dismiss(invite);
  };

  return (
    <View className="flex-row items-center gap-3 border-b border-border bg-background px-4 py-3">
      <PhoneIncoming size={18} color={colors.primary} />
      <View className="flex-1 gap-0.5">
        <Text numberOfLines={1} className="text-base font-medium text-foreground">
          {invite.call.title}
        </Text>
        <Text numberOfLines={1} className="text-xs text-muted-foreground">
          {invite.inviter.preferredUsername} asks you in
        </Text>
      </View>
      <Button size="sm" variant="ghost" onPress={() => void dismiss(invite)}>
        <Text>Dismiss</Text>
      </Button>
      <Button size="sm" disabled={joining} onPress={accept}>
        <Text>Join</Text>
      </Button>
    </View>
  );
}
