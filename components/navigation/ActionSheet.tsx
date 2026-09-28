import { Text } from '@/components/ui/text';
import * as React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ActionSheetOption = { label: string; onPress: () => void; destructive?: boolean; disabled?: boolean };

/**
 * A bottom sheet of choices — what orkestrator puts in a right-click menu.
 * Alert.alert would do on iOS, but Android shows at most three buttons.
 */
export function ActionSheet({
  visible,
  title,
  message,
  options,
  onClose,
  children,
}: {
  visible: boolean;
  title?: string;
  message?: string;
  options: ActionSheetOption[];
  onClose: () => void;
  children?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable
          style={{ paddingBottom: insets.bottom + 8 }}
          className="mx-2 mb-2 overflow-hidden rounded-2xl border border-border bg-card"
          onPress={() => undefined}
        >
          {title || message ? (
            <View className="border-b border-border px-4 py-3">
              {title ? <Text className="text-center text-sm font-semibold text-card-foreground">{title}</Text> : null}
              {message ? <Text className="mt-0.5 text-center text-xs text-muted-foreground">{message}</Text> : null}
            </View>
          ) : null}
          {children}
          {options.map((option) => (
            <Pressable
              key={option.label}
              disabled={option.disabled}
              onPress={() => {
                onClose();
                option.onPress();
              }}
              className={`border-b border-border px-4 py-3.5 active:bg-muted ${option.disabled ? 'opacity-40' : ''}`}
            >
              <Text className={`text-center text-base ${option.destructive ? 'text-destructive' : 'text-foreground'}`}>
                {option.label}
              </Text>
            </Pressable>
          ))}
          <Pressable onPress={onClose} className="px-4 py-3.5 active:bg-muted">
            <Text className="text-center text-base font-semibold text-foreground">Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
