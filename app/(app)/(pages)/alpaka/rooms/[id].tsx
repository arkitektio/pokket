import { ChatRoom } from '@/components/alpaka/ChatRoom';
import { ChatLoadingState, ChatUnavailable } from '@/components/alpaka/states';
import { useReplyer } from '@/lib/alpaka/chat/useReplyer';
import { Guard } from '@/lib/app/App';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

/** The room with someone to answer in it: replyers are rekuest's. */
function RoomWithReplyer({ id }: { id: string }) {
  const replyer = useReplyer(id);
  return <ChatRoom id={id} replyer={replyer} />;
}

/** A chat room — orkestrator's `RoomPage`. Without rekuest it is a message board. */
export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View className="flex-1 bg-background">
      <Guard.Lok connectingFallback={<ChatLoadingState message="Connecting…" />}>
        <Guard.Alpaka fallback={<ChatUnavailable />}>
          <Guard.Rekuest fallback={<ChatRoom key={id} id={id} replyer={null} />}>
            <RoomWithReplyer key={id} id={id} />
          </Guard.Rekuest>
        </Guard.Alpaka>
      </Guard.Lok>
    </View>
  );
}
