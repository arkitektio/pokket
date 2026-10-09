import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { App } from '@/lib/app/App';
import { type CallFragment, useCallParticipantsQuery } from '@/lib/lovekit/api/graphql';
import { lobbyLine, participantNames } from '@/lib/lovekit/call/lobby';
import { STAGE_GAP, stageLayout, stageRowWidth } from '@/lib/lovekit/call/stageLayout';
import { useCallState } from '@/lib/lovekit/call/store';
import { useJoinCall } from '@/lib/lovekit/call/useJoinCall';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { RoomContext, useTracks } from '@livekit/react-native';
import { Track } from 'livekit-client';
import { AlertCircle, Phone, Users } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';
import { CallControls } from './CallControls';
import { ParticipantTile } from './ParticipantTile';

/**
 * Everyone in the room, one tile each, plus every shared screen, in the rows
 * and columns that suit the stage's shape (`stageLayout`): the tiles are as
 * large as fit, whole, and centred.
 */
function Stage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const layout = stageLayout(tracks.length, size.width, size.height);

  return (
    <View
      className="flex-1 items-center justify-center overflow-hidden"
      onLayout={({ nativeEvent }) =>
        setSize({ width: nativeEvent.layout.width, height: nativeEvent.layout.height })
      }
    >
      {/* Held to one row's width, so a row is exactly `columns` tiles and a
          last row that is not full sits centred under the others. */}
      {layout ? (
        <View
          style={{ width: stageRowWidth(layout), gap: STAGE_GAP }}
          className="flex-row flex-wrap content-center justify-center"
        >
          {tracks.map((trackRef) => (
            <ParticipantTile
              key={`${trackRef.participant.identity}-${trackRef.source}`}
              trackRef={trackRef}
              width={layout.tileWidth}
              height={layout.tileHeight}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * The media server is reached through the organization's mesh, which carries
 * the signalling but not the media (README, "The mesh"): the call would
 * connect and then drop. Said before joining, and again when it has dropped.
 */
const useMediaOverMesh = () => App.useService('livekit').alias?.host === '127.0.0.1';
const MESH_NOTICE =
  "This organization's media server is only reachable over the mesh, which does not carry calls. A call needs a direct connection to it.";

/** Who is in the call now, asked of lovekit while this app is not. */
function Lobby({ call }: { call: CallFragment }) {
  const colors = useThemeColors();
  const { join, joining, error, active } = useJoinCall();
  const overMesh = useMediaOverMesh();
  const { data } = useCallParticipantsQuery({
    variables: { id: call.id },
    pollInterval: 10_000,
    fetchPolicy: 'cache-and-network',
  });
  const names = participantNames(data?.call.participants ?? call.participants);
  const Icon = names.length > 0 ? Users : Phone;

  return (
    <View className="flex-1 items-center justify-center gap-3 p-6">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Icon size={24} color={colors.primary} />
      </View>
      <View className="items-center">
        <Text className="text-center font-medium text-foreground">{call.title}</Text>
        <Text className="text-center text-sm text-muted-foreground">{lobbyLine(names)}</Text>
      </View>
      <Button
        className="flex-row gap-2"
        onPress={() => void join({ id: call.id, title: call.title })}
        disabled={joining}
      >
        {joining ? (
          <ActivityIndicator size="small" color={colors.primaryForeground} />
        ) : (
          <Phone size={16} color={colors.primaryForeground} />
        )}
        <Text>{active && active.id !== call.id ? `Leave "${active.title}" and join` : 'Join call'}</Text>
      </Button>
      {error ? <Text className="text-center text-xs text-destructive">{error}</Text> : null}
      {overMesh ? <Text className="text-center text-xs text-muted-foreground">{MESH_NOTICE}</Text> : null}
    </View>
  );
}

/** The call was lost: said, with a way back in on a fresh token. */
function Dropped({ call, reason }: { call: CallFragment; reason: string | null }) {
  const colors = useThemeColors();
  const { join, joining } = useJoinCall();
  const overMesh = useMediaOverMesh();
  return (
    <View className="flex-1 items-center justify-center gap-3 p-6">
      <AlertCircle size={28} color={colors.destructive} />
      <Text className="font-medium text-foreground">The call dropped</Text>
      {reason ? <Text className="text-center text-sm text-muted-foreground">{reason}</Text> : null}
      {overMesh ? <Text className="text-center text-xs text-muted-foreground">{MESH_NOTICE}</Text> : null}
      <Button onPress={() => void join({ id: call.id, title: call.title })} disabled={joining}>
        <Text>Rejoin</Text>
      </Button>
    </View>
  );
}

/** Joined without the microphone: said once, where the buttons are. */
function ListeningOnly() {
  return (
    <Pressable onPress={() => void Linking.openSettings()} className="rounded-xl bg-muted px-3 py-2 active:opacity-70">
      <Text className="text-center text-xs text-muted-foreground">
        The microphone is off for Pokket. You can listen; tap to turn it on in Settings to speak.
      </Text>
    </Pressable>
  );
}

/**
 * The call — orkestrator's `CallPanel`: tiles and controls once this app is
 * in it, the lobby with a Join button until then. The connection itself is
 * `CallConnection`'s; this only renders its room through LiveKit's
 * `RoomContext`, so leaving the page does not hang up. `footer` sits above
 * the buttons in every state: what the call is talking about.
 */
export function CallPanel({
  call,
  footer,
  onInvite,
}: {
  call: CallFragment;
  footer?: React.ReactNode;
  onInvite?: () => void;
}) {
  const colors = useThemeColors();
  const active = useCallState((state) => state.call);
  const status = useCallState((state) => state.status);
  const room = useCallState((state) => state.room);
  const error = useCallState((state) => state.error);
  const audio = useCallState((state) => state.media.audio);
  const inThisCall = active?.id === call.id;
  // The room, once this app is connected to this call.
  const live = inThisCall && status === 'connected' ? room : null;

  return (
    <View className="flex-1 gap-3 p-3">
      {inThisCall && status === 'error' ? (
        <Dropped call={call} reason={error} />
      ) : live ? (
        <RoomContext.Provider value={live}>
          <Stage />
        </RoomContext.Provider>
      ) : inThisCall ? (
        <View className="flex-1 flex-row items-center justify-center gap-2">
          <ActivityIndicator size="small" color={colors.primary} />
          <Text className="text-sm text-muted-foreground">Connecting…</Text>
        </View>
      ) : (
        <Lobby call={call} />
      )}
      {footer}
      {live ? (
        <RoomContext.Provider value={live}>
          {audio ? null : <ListeningOnly />}
          <CallControls onInvite={onInvite} />
        </RoomContext.Provider>
      ) : null}
    </View>
  );
}
