import { Text } from '@/components/ui/text';
import { CALL_BAR_HEIGHT } from '@/components/calls/CallBar';
import { useCallState } from '@/lib/lovekit/call/store';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Bot, Send } from 'lucide-react-native';
import * as React from 'react';
import { Keyboard, Platform, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Is the keyboard up? It covers the bottom inset and the call bar, so neither needs clearing then. */
const useKeyboardUp = () => {
  const [up, setUp] = React.useState(false);
  React.useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () => setUp(true));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return up;
};

/**
 * Where a message is written. The chip names the replyer that will answer;
 * tapping it changes that. Without rekuest there is no replyer and no chip.
 */
export function Composer({
  onSend,
  placeholder = 'Message',
  replyer,
  disabled,
  autoFocus,
}: {
  onSend: (text: string) => void;
  placeholder?: string;
  replyer?: { label: string; warning: boolean; onPress: () => void };
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const keyboardUp = useKeyboardUp();
  const inCall = useCallState((state) => !!state.call);
  const [text, setText] = React.useState('');
  // At rest the composer clears the home indicator, and the call's bar when one floats there.
  const rest = insets.bottom + 8 + (inCall ? CALL_BAR_HEIGHT + 8 : 0);
  const ready = text.trim().length > 0 && !disabled;

  const send = () => {
    if (!ready) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <View style={{ paddingBottom: keyboardUp ? 8 : rest }} className="gap-1.5 border-t border-border bg-background px-3 pt-2">
      {replyer ? (
        <Pressable
          onPress={replyer.onPress}
          hitSlop={6}
          className="flex-row items-center gap-1.5 self-start rounded-full border border-border bg-card px-2.5 py-1 active:bg-muted"
        >
          <Bot size={13} color={replyer.warning ? colors.destructive : colors.mutedForeground} />
          <Text numberOfLines={1} className={`max-w-[220px] text-xs ${replyer.warning ? 'text-destructive' : 'text-muted-foreground'}`}>
            {replyer.label}
          </Text>
        </Pressable>
      ) : null}
      <View className="flex-row items-end gap-2">
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          multiline
          autoFocus={autoFocus}
          style={{ color: colors.foreground, maxHeight: 132 }}
          className="flex-1 rounded-2xl border border-border bg-card px-3.5 py-2.5 text-base"
        />
        <Pressable
          onPress={send}
          disabled={!ready}
          accessibilityRole="button"
          accessibilityLabel="Send"
          className={`h-11 w-11 items-center justify-center rounded-full ${ready ? 'bg-primary active:opacity-80' : 'bg-muted'}`}
        >
          <Send size={18} color={ready ? colors.primaryForeground : colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}
