import { Text } from '@/components/ui/text';
import { initials } from '@/lib/lovekit/call/lobby';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import {
  isTrackReference,
  useIsMuted,
  useIsSpeaking,
  VideoTrack,
  type TrackReferenceOrPlaceholder,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import { MicOff } from 'lucide-react-native';
import { View } from 'react-native';

/**
 * One participant — orkestrator's `ParticipantTile`: their camera when it is
 * on, their initials when it is not. A border lights while they speak; a
 * struck mic says they are muted. A shared screen is a tile too, shown whole.
 */
export function ParticipantTile({
  trackRef,
  width,
  height,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  /** The tile's size, from whoever lays the tiles out (`stageLayout`). */
  width: number;
  height: number;
}) {
  const colors = useThemeColors();
  const { participant } = trackRef;
  const speaking = useIsSpeaking(participant);
  const micMuted = useIsMuted({ participant, source: Track.Source.Microphone });
  const video = isTrackReference(trackRef) && !trackRef.publication.isMuted;
  const name = participant.name || participant.identity;
  const screen = trackRef.source === Track.Source.ScreenShare;

  return (
    <View
      style={{ width, height }}
      className={`items-center justify-center overflow-hidden rounded-xl border-2 bg-muted ${
        speaking ? 'border-primary' : 'border-transparent'
      }`}
    >
      {video && isTrackReference(trackRef) ? (
        <VideoTrack
          trackRef={trackRef}
          style={{ width: '100%', height: '100%' }}
          objectFit={screen ? 'contain' : 'cover'}
          mirror={participant.isLocal && !screen}
        />
      ) : (
        <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/15">
          <Text className="text-xl font-semibold text-primary">{initials(name)}</Text>
        </View>
      )}
      <View className="absolute bottom-2 left-2 right-2 flex-row">
        <View className="max-w-full flex-row items-center gap-1 rounded-md bg-background/80 px-1.5 py-0.5">
          <Text numberOfLines={1} className="shrink text-xs text-foreground">
            {name}
            {participant.isLocal ? ' (you)' : ''}
            {screen ? ' · screen' : ''}
          </Text>
          {micMuted && !screen ? <MicOff size={12} color={colors.mutedForeground} /> : null}
        </View>
      </View>
    </View>
  );
}
