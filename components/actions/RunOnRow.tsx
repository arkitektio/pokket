import { PickerRow, PickerSheet } from '@/components/bank/PickerSheet';
import { Text } from '@/components/ui/text';
import { useActionImplementationsQuery, type ProvidingImplementationFragment } from '@/lib/rekuest/api/graphql';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { ChevronRight, Server } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

export type ChosenImplementation = Pick<ProvidingImplementationFragment, 'id' | 'interface'> & { agent: { name: string } };

function Implementations({
  hash,
  chosen,
  onPick,
}: {
  hash: string;
  chosen: ChosenImplementation | null;
  onPick: (implementation: ChosenImplementation | null) => void;
}) {
  const colors = useThemeColors();
  const { data, loading, error } = useActionImplementationsQuery({ variables: { hash }, fetchPolicy: 'cache-and-network' });
  const dot = (on: boolean) => <View style={{ backgroundColor: on ? '#10b981' : colors.muted }} className="h-2.5 w-2.5 rounded-full" />;
  return (
    <ScrollView className="flex-1">
      <PickerRow leading={<Server size={16} color={colors.mutedForeground} />} title="Any agent" detail="Rekuest picks one that is free" selected={!chosen} onPress={() => onPick(null)} />
      {(data?.implementations ?? []).map((implementation) => (
        <PickerRow
          key={implementation.id}
          leading={dot(implementation.agent.connected)}
          title={implementation.agent.name}
          detail={`${implementation.interface} · ${implementation.agent.connected ? 'connected' : 'not connected'}`}
          selected={chosen?.id === implementation.id}
          onPress={() => onPick(implementation)}
        />
      ))}
      {!data && loading ? <ActivityIndicator className="py-6" color={colors.primary} /> : null}
      {error ? <Text className="px-3 py-4 text-sm text-destructive">{error.message}</Text> : null}
      {data && data.implementations.length === 0 ? (
        <Text className="px-3 py-4 text-sm text-muted-foreground">No agent offers this action right now.</Text>
      ) : null}
    </ScrollView>
  );
}

/**
 * Which agent runs it: orkestrator's "Run on". Left alone, rekuest chooses;
 * picking one assigns to that agent's implementation of the action.
 */
export function RunOnRow({
  hash,
  chosen,
  onChange,
}: {
  hash: string;
  chosen: ChosenImplementation | null;
  onChange: (implementation: ChosenImplementation | null) => void;
}) {
  const colors = useThemeColors();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Change which agent runs it"
        className="flex-row items-center justify-between gap-4 border-t border-border py-3 active:opacity-60"
      >
        <Text className="text-sm text-muted-foreground">Run on</Text>
        <View className="shrink flex-row items-center gap-1.5">
          <Text numberOfLines={1} className="shrink text-right text-sm text-primary">
            {chosen ? chosen.agent.name : 'Any agent'}
          </Text>
          <ChevronRight size={16} color={colors.mutedForeground} />
        </View>
      </Pressable>
      <PickerSheet visible={open} title="Run on" onClose={() => setOpen(false)}>
        <Implementations
          hash={hash}
          chosen={chosen}
          onPick={(implementation) => {
            onChange(implementation);
            setOpen(false);
          }}
        />
      </PickerSheet>
    </>
  );
}
