import { startCallService } from '@/lib/lovekit/call/callService';
import { requestMicrophone } from '@/lib/lovekit/call/permissions';
import { callStore, useCallState } from '@/lib/lovekit/call/store';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { useLocalParticipant } from '@livekit/react-native';
import { Mic, MicOff, PhoneOff, UserPlus, Video, VideoOff, type LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { Linking, Pressable, View } from 'react-native';
import { toast } from 'sonner-native';

type Tone = 'on' | 'off' | 'plain';

/** One round button of the call: lit while it is on, red while it is off. */
function ControlButton({
  icon: Icon,
  label,
  tone,
  small,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  tone: Tone;
  small?: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const background = tone === 'off' ? 'bg-destructive' : 'border border-border bg-card';
  const color = tone === 'off' ? colors.destructiveForeground : colors.foreground;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`items-center justify-center rounded-full active:opacity-70 ${background} ${
        small ? 'h-9 w-9' : 'h-12 w-12'
      }`}
    >
      <Icon size={small ? 16 : 20} color={color} />
    </Pressable>
  );
}

const openSettings = { label: 'Settings', onClick: () => void Linking.openSettings() };

/**
 * The microphone toggle for the room in `RoomContext`. Joined without the
 * microphone (it was refused), the first tap asks again; the system may not
 * prompt twice, and then Settings is the only way.
 */
export function MicToggle({ small }: { small?: boolean }) {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const allowed = useCallState((state) => state.media.audio);

  const toggle = async () => {
    try {
      if (!allowed) {
        if (!(await requestMicrophone())) {
          toast('The microphone is off for Pokket', { action: openSettings });
          return;
        }
        const { call, setMedia } = callStore.getState();
        setMedia({ audio: true });
        if (call) startCallService(call.title, true);
        return;
      }
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch {
      toast.error('The microphone could not be started');
    }
  };

  return (
    <ControlButton
      icon={isMicrophoneEnabled ? Mic : MicOff}
      label={isMicrophoneEnabled ? 'Mute' : 'Unmute'}
      tone={isMicrophoneEnabled ? 'on' : 'off'}
      small={small}
      onPress={() => void toggle()}
    />
  );
}

/** The camera toggle. Its first use is where the camera is asked for. */
export function CameraToggle({ small }: { small?: boolean }) {
  const { localParticipant, isCameraEnabled } = useLocalParticipant();
  const toggle = () =>
    localParticipant
      .setCameraEnabled(!isCameraEnabled)
      .catch(() => toast('The camera could not be started', { action: openSettings }));
  return (
    <ControlButton
      icon={isCameraEnabled ? Video : VideoOff}
      label={isCameraEnabled ? 'Stop camera' : 'Start camera'}
      tone={isCameraEnabled ? 'on' : 'off'}
      small={small}
      onPress={() => void toggle()}
    />
  );
}

export function LeaveButton({ small }: { small?: boolean }) {
  return (
    <ControlButton
      icon={PhoneOff}
      label="Leave call"
      tone="off"
      small={small}
      onPress={() => callStore.getState().leave()}
    />
  );
}

/**
 * The call's buttons, under its tiles — orkestrator's `CallControls`: mic,
 * camera, invite, leave. Needs the room in `RoomContext`.
 */
export function CallControls({ onInvite }: { onInvite?: () => void }) {
  return (
    <View className="flex-row items-center justify-center gap-4">
      <MicToggle />
      <CameraToggle />
      {onInvite ? <ControlButton icon={UserPlus} label="Invite people" tone="plain" onPress={onInvite} /> : null}
      <LeaveButton />
    </View>
  );
}
