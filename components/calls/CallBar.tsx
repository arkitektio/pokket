import { Text } from '@/components/ui/text';
import { callRoute } from '@/lib/lovekit/call/links';
import { showCall } from '@/lib/lovekit/call/openCall';
import { callClock } from '@/lib/lovekit/call/lobby';
import { useCallState } from '@/lib/lovekit/call/store';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { RoomContext } from '@livekit/react-native';
import { usePathname } from 'expo-router';
import { Phone } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LeaveButton, MicToggle } from './CallControls';

/** Ticks once a second while mounted. */
const useNow = () => {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
};

/** How high the bar stands over the bottom edge; `ErrorOverlay` clears it. */
export const CALL_BAR_HEIGHT = 56;

function Bar({ id, title }: { id: string; title: string }) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const status = useCallState((state) => state.status);
  const room = useCallState((state) => state.room);
  const joinedAt = useCallState((state) => state.joinedAt);
  const now = useNow();

  return (
    <View
      style={{ bottom: insets.bottom + 8, height: CALL_BAR_HEIGHT }}
      className="absolute left-3 right-3 z-40 flex-row items-center gap-3 rounded-2xl border border-border bg-card px-3 shadow-lg"
    >
      <Pressable
        onPress={() => showCall(id, pathname)}
        accessibilityRole="button"
        accessibilityLabel="Open the call"
        className="flex-1 flex-row items-center gap-3 active:opacity-70"
      >
        <Phone size={16} color={colors.primary} />
        <View className="flex-1">
          <Text numberOfLines={1} className="text-sm font-medium text-card-foreground">
            {title}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {status === 'connected' && joinedAt ? callClock(joinedAt, now) : status === 'error' ? 'dropped' : 'joining'}
          </Text>
        </View>
      </Pressable>
      {room && status === 'connected' ? (
        <RoomContext.Provider value={room}>
          <MicToggle small />
        </RoomContext.Provider>
      ) : null}
      <LeaveButton small />
    </View>
  );
}

/**
 * The call this app is in, as a bar over whatever page is on show —
 * orkestrator's `CallIsland`: its title and clock, mute and leave. Tapping it
 * returns to the call page, where it steps aside for the call itself.
 */
export function CallBar() {
  const call = useCallState((state) => state.call);
  const pathname = usePathname();
  if (!call || pathname === callRoute(call.id)) return null;
  return <Bar id={call.id} title={call.title} />;
}
