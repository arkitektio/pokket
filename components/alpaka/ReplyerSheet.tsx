import { ActionForm } from '@/components/actions/ActionForm';
import { PickerRow, PickerSheet } from '@/components/bank/PickerSheet';
import { Text } from '@/components/ui/text';
import { hasSettings, messageKey, NO_REPLYER } from '@/lib/alpaka/chat/replyer';
import type { ReplyerController } from '@/lib/alpaka/chat/useReplyer';
import { notEmpty } from '@/lib/ports/kinds';
import { prefill } from '@/lib/ports/prefill';
import type { FormPort } from '@/lib/ports/types';
import type { ReplyerActionFragment } from '@/lib/rekuest/api/graphql';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Bot, ChevronLeft, MessageCircleOff, Settings2 } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

/**
 * A replyer's settings: the form of its action without the message, which
 * the chat fills in. Saved on the phone and used for every message from then.
 */
function ReplyerSettings({
  option,
  replyer,
  onBack,
  onSaved,
}: {
  option: ReplyerActionFragment;
  replyer: ReplyerController;
  onBack: () => void;
  onSaved: () => void;
}) {
  const colors = useThemeColors();
  const ports = React.useMemo(() => {
    const message = messageKey(option);
    return (option.args.filter(notEmpty) as FormPort[]).filter((port) => port.key !== message);
  }, [option]);
  const saved = replyer.settingsOf(option);
  const start = React.useMemo(() => prefill(ports, saved, option.latestTask?.args), [ports, saved, option.latestTask?.args]);

  return (
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" className="flex-1 px-3">
      <Pressable onPress={onBack} hitSlop={8} className="flex-row items-center gap-1 pb-2 active:opacity-60">
        <ChevronLeft size={18} color={colors.primary} />
        <Text className="text-sm text-primary">Replyers</Text>
      </Pressable>
      <Text className="text-base font-semibold text-card-foreground">{option.name}</Text>
      {option.description ? <Text className="pb-1 text-sm text-muted-foreground">{option.description}</Text> : null}
      <ActionForm
        ports={ports}
        groups={option.portGroups}
        start={start}
        submitLabel="Save and use"
        onSubmit={(args) => {
          replyer.saveSettings(option, args);
          replyer.choose(option.id);
          onSaved();
        }}
      />
      <View className="h-6" />
    </ScrollView>
  );
}

/** Who answers in this room: one of the organization's replyers, or nobody, and how each is set up. */
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
  const [settingUp, setSettingUp] = React.useState<string | null>(null);
  const close = () => {
    setSettingUp(null);
    onClose();
  };
  const pick = (id: string) => {
    replyer.choose(id);
    close();
  };
  const inSettings = replyer.replyers.find((option) => option.id === settingUp);
  const chosen = replyer.chosen;

  return (
    <PickerSheet visible={visible} title={inSettings ? 'Settings' : 'Who replies'} onClose={close}>
      {inSettings ? (
        <ReplyerSettings option={inSettings} replyer={replyer} onBack={() => setSettingUp(null)} onSaved={close} />
      ) : (
        <>
          <Text className="px-3 pb-2 text-xs text-muted-foreground">
            A replyer runs after each message you send and writes its answer into the room.
          </Text>
          <ScrollView>
            {chosen && hasSettings(chosen) ? (
              <PickerRow
                leading={<Settings2 size={18} color={colors.primary} />}
                title={`Settings for ${chosen.name}`}
                tone="primary"
                onPress={() => setSettingUp(chosen.id)}
              />
            ) : null}
            <PickerRow
              leading={<MessageCircleOff size={18} color={colors.mutedForeground} />}
              title="No replyer"
              detail="Just send messages"
              selected={!chosen}
              onPress={() => pick(NO_REPLYER)}
            />
            {replyer.replyers.map((option) => {
              const blocker = replyer.blockerOf(option);
              // One that takes no message cannot be set up into working; one that lacks settings can.
              const unusable = !messageKey(option);
              return (
                <PickerRow
                  key={option.id}
                  leading={<Bot size={18} color={blocker ? colors.mutedForeground : colors.primary} />}
                  title={option.name}
                  detail={blocker ?? option.description}
                  selected={chosen?.id === option.id}
                  disabled={unusable}
                  onPress={() => (blocker ? setSettingUp(option.id) : pick(option.id))}
                />
              );
            })}
            {replyer.replyers.length === 0 ? (
              <Text className="px-3 py-4 text-sm text-muted-foreground">
                No app in this organization offers a replyer yet. Install one from the desktop app.
              </Text>
            ) : null}
          </ScrollView>
        </>
      )}
    </PickerSheet>
  );
}
