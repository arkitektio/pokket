import { Text } from '@/components/ui/text';
import type { RecentRoom } from '@/lib/alpaka/chat/recentRooms';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Link, type Href } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

export const roomRoute = (id: string) => `/alpaka/rooms/${id}`;

const activityLabel = (time: number): string => {
  if (!time) return '';
  const date = new Date(time);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/** One conversation: its title, the last thing said in it, and when. */
export function RoomRow({ room }: { room: RecentRoom }) {
  const colors = useThemeColors();
  return (
    <Link href={roomRoute(room.id) as Href} asChild>
      <Pressable className="flex-row items-center gap-3 border-b border-border bg-background px-4 py-3 active:bg-muted">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
          <MessageCircle size={16} color={colors.primary} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text numberOfLines={1} className="text-base font-medium text-foreground">
            {room.title}
          </Text>
          <Text numberOfLines={1} className="text-xs text-muted-foreground">
            {room.preview ?? room.description ?? 'No messages yet'}
          </Text>
        </View>
        <Text className="text-xs text-muted-foreground">{activityLabel(room.lastActivity)}</Text>
      </Pressable>
    </Link>
  );
}
