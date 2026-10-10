import { Text } from '@/components/ui/text';
import { type CallStructure, structureLabel, structureRoute } from '@/lib/lovekit/call/structures';
import { showDetail } from '@/lib/navigation';
import { Pressable, View } from 'react-native';

/**
 * What a message has attached: tasks, datasets, threads. Those pokket has a
 * page for open it; the rest are named and nothing more.
 */
export function AttachmentChips({ structures, own }: { structures: readonly CallStructure[]; own: boolean }) {
  if (structures.length === 0) return null;
  const tone = own ? 'border-primary-foreground/40' : 'border-border';
  const text = own ? 'text-primary-foreground' : 'text-card-foreground';
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {structures.map((structure, index) => {
        const route = structureRoute(structure);
        const label = structureLabel(structure);
        const key = `${structure.identifier}:${structure.object}:${index}`;
        return route ? (
          <Pressable key={key} onPress={() => showDetail(route)} className={`rounded-full border px-2.5 py-1 active:opacity-60 ${tone}`}>
            <Text className={`text-xs font-medium underline ${text}`}>{label}</Text>
          </Pressable>
        ) : (
          <View key={key} className={`rounded-full border px-2.5 py-1 ${tone}`}>
            <Text className={`text-xs ${text}`}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}
