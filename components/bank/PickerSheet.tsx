import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Check, Search, X } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * The bottom sheet the bank pickers share: a handle, a title, and whatever
 * the picker lists. Its body mounts per showing, so each one starts clean.
 * A fixed height, so the sheet does not jump as a search narrows the list.
 */
export function PickerSheet({
  visible,
  title,
  busy,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  busy?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <Pressable className="flex-1 bg-black/30" onPress={onClose} />
        <View
          style={{ paddingBottom: insets.bottom + 12, height: '75%' }}
          className="rounded-t-3xl border-t border-border bg-card px-3 pt-3"
        >
          <View className="mb-3 h-1 w-10 self-center rounded-full bg-muted" />
          <View className="mb-3 flex-row items-center gap-2 px-3">
            <Text className="flex-1 text-lg font-semibold text-card-foreground">{title}</Text>
            {busy ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          </View>
          {visible ? children : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function PickerSearch({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  const colors = useThemeColors();
  return (
    <View className="mb-2 flex-row items-center gap-2 rounded-xl border border-border bg-background px-3">
      <Search size={18} color={colors.mutedForeground} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        autoCorrect={false}
        clearButtonMode="never"
        style={{ color: colors.foreground }}
        className="flex-1 py-3 text-base"
      />
      {value ? (
        <Pressable hitSlop={8} onPress={() => onChangeText('')} accessibilityLabel="Clear">
          <X size={16} color={colors.mutedForeground} />
        </Pressable>
      ) : null}
    </View>
  );
}

export const PickerSectionHeader = ({ title }: { title: string }) => (
  <Text className="px-3 pb-1 pt-3 text-xs font-semibold uppercase text-muted-foreground">{title}</Text>
);

/** One choice: something leading (a dot, a logo, a glyph), a title, a detail, and a tick on the current one. */
export function PickerRow({
  leading,
  title,
  detail,
  selected,
  tone,
  disabled,
  onPress,
}: {
  leading?: React.ReactNode;
  title: string;
  detail?: string | null;
  selected?: boolean;
  tone?: 'primary' | 'destructive';
  disabled?: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const titleColor = tone === 'primary' ? 'text-primary' : tone === 'destructive' ? 'text-destructive' : 'text-foreground';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center gap-3 rounded-xl px-3 py-2.5 active:bg-muted ${disabled ? 'opacity-50' : ''}`}
    >
      {leading ? <View className="w-7 items-center">{leading}</View> : null}
      <View className="flex-1">
        <Text numberOfLines={1} className={`text-base ${titleColor}`}>
          {title}
        </Text>
        {detail ? (
          <Text numberOfLines={1} className="text-xs text-muted-foreground">
            {detail}
          </Text>
        ) : null}
      </View>
      {selected ? <Check size={18} color={colors.primary} /> : null}
    </Pressable>
  );
}
