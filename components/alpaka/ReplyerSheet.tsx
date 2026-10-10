import { PickerRow, PickerSheet } from '@/components/bank/PickerSheet';
import { Text } from '@/components/ui/text';
import { NO_REPLYER, replyerBlocker } from '@/lib/alpaka/chat/replyer';
import type { ReplyerController } from '@/lib/alpaka/chat/useReplyer';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Bot, MessageCircleOff } from 'lucide-react-native';
import { ScrollView } from 'react-native';

/** Who answers in this room: one of the organization's replyers, or nobody. */
export function ReplyerSheet({
  visible,
  onClose,
  replyer,
}: {
  visible: boolean;
  onClose: () => void;
  replyer: ReplyerController;
}) {
  const colors = useThemeColors();
  const pick = (id: string) => {
    replyer.choose(id);
    onClose();
  };
  return (
    <PickerSheet visible={visible} title="Who replies" onClose={onClose}>
      <Text className="px-3 pb-2 text-xs text-muted-foreground">
        A replyer runs after each message you send and writes its answer into the room. It runs with the settings of its
        last run; change those from orkestrator.
      </Text>
      <ScrollView>
        <PickerRow
          leading={<MessageCircleOff size={18} color={colors.mutedForeground} />}
          title="No replyer"
          detail="Just send messages"
          selected={!replyer.chosen}
          onPress={() => pick(NO_REPLYER)}
        />
        {replyer.replyers.map((option) => {
          const blocker = replyerBlocker(option);
          return (
            <PickerRow
              key={option.id}
              leading={<Bot size={18} color={blocker ? colors.mutedForeground : colors.primary} />}
              title={option.name}
              detail={blocker ?? option.description}
              selected={replyer.chosen?.id === option.id}
              disabled={!!blocker}
              onPress={() => pick(option.id)}
            />
          );
        })}
        {replyer.replyers.length === 0 ? (
          <Text className="px-3 py-4 text-sm text-muted-foreground">
            No app in this organization offers a replyer yet. Install one from orkestrator.
          </Text>
        ) : null}
      </ScrollView>
    </PickerSheet>
  );
}
