import { Text } from '@/components/ui/text';
import type { CallFragment } from '@/lib/lovekit/api/graphql';
import { useCallState } from '@/lib/lovekit/call/store';
import { type CallStructure, structureLabel, structureRoute } from '@/lib/lovekit/call/structures';
import { showDetail } from '@/lib/navigation';
import { Pressable, View } from 'react-native';

/** One earlier topic: a link when pokket has a page for it, a name when not. */
function Earlier({ topic }: { topic: CallStructure }) {
  const route = structureRoute(topic);
  return (
    <Pressable disabled={!route} onPress={() => route && showDetail(route)} hitSlop={4} className="active:opacity-70">
      <Text className={`text-sm ${route ? 'text-primary' : 'text-muted-foreground'}`}>{structureLabel(topic)}</Text>
    </Pressable>
  );
}

/**
 * "Talking about" — orkestrator's pill in the call's dock, and its About
 * sidebar under it: what the call turned to last, and before joining, what
 * it was about earlier and who started it. Tapping the pill opens that
 * object over the call, which goes on (the bar leads back).
 *
 * Shown, not set: a topic is changed from orkestrator, where an object is
 * dropped on the call. It arrives here through lovekit's `calls`
 * subscription (`CallAnnouncementsWatcher`), into the cache this reads.
 */
export function TalkingAbout({ call }: { call: CallFragment }) {
  const inThisCall = useCallState((state) => state.call?.id === call.id);
  // Lovekit lists them oldest first; the last is the current topic.
  const [topic, ...earlier] = [...call.about].reverse();
  const route = topic ? structureRoute(topic) : null;

  return (
    <View className="items-center gap-2">
      {topic ? (
        <Pressable
          // Something pokket has no page for is named, not opened.
          disabled={!route}
          onPress={() => route && showDetail(route)}
          className="h-9 max-w-full flex-row items-center gap-2 rounded-full border border-border bg-card px-3.5 active:bg-muted"
        >
          <View className="h-2 w-2 rounded-full bg-primary" />
          <Text className="text-[11px] font-medium uppercase text-muted-foreground">Talking about</Text>
          <Text numberOfLines={1} className="shrink text-sm font-medium text-card-foreground">
            {structureLabel(topic)}
          </Text>
          {earlier.length > 0 ? (
            <View className="rounded-full bg-muted px-1.5">
              <Text className="text-[10px] text-muted-foreground">+{earlier.length}</Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}
      {/* In the call the room is for the tiles; the rest waits in the lobby. */}
      {inThisCall ? null : (
        <>
          {earlier.length > 0 ? (
            <View className="flex-row flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <Text className="text-xs font-medium text-muted-foreground">Earlier</Text>
              {earlier.map((structure) => (
                <Earlier key={`${structure.identifier}-${structure.object}`} topic={structure} />
              ))}
            </View>
          ) : null}
          <Text className="text-xs text-muted-foreground">
            Started by {call.creator?.preferredUsername ?? 'someone'}
            {topic ? '' : ', about nothing in particular'}.
          </Text>
        </>
      )}
    </View>
  );
}
