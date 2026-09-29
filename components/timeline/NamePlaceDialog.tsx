import { Text } from '@/components/ui/text';
import { suggestPlaceName } from '@/lib/timeline/geocode';
import { useTimelineSettings } from '@/lib/timeline/settings';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import * as React from 'react';
import { ActivityIndicator, Modal, Pressable, TextInput, View } from 'react-native';

/**
 * Asks for a place's name. "Suggest" only appears when the user has set a
 * geocoder of their own; otherwise nothing leaves the phone.
 */
export function NamePlaceDialog({
  visible,
  onCancel,
  ...props
}: {
  visible: boolean;
  at: { lat: number; lon: number } | null;
  initialName?: string;
  title?: string;
  onCancel: () => void;
  onSave: (name: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      {/* Mounted per showing, so each one starts from `initialName`. */}
      {visible ? <DialogBody onCancel={onCancel} {...props} /> : null}
    </Modal>
  );
}

function DialogBody({
  at,
  initialName = '',
  title = 'Name this place',
  onCancel,
  onSave,
}: {
  at: { lat: number; lon: number } | null;
  initialName?: string;
  title?: string;
  onCancel: () => void;
  onSave: (name: string) => void;
}) {
  const colors = useThemeColors();
  const { settings } = useTimelineSettings();
  const [name, setName] = React.useState(initialName);
  const [suggesting, setSuggesting] = React.useState(false);
  const [hint, setHint] = React.useState<string | null>(null);

  const suggest = async () => {
    if (!at || !settings.geocoderUrl) return;
    setSuggesting(true);
    setHint(null);
    try {
      const suggestion = await suggestPlaceName(settings.geocoderUrl, at);
      if (suggestion) setName(suggestion);
      else setHint('The geocoder had no name for this spot.');
    } catch (error) {
      setHint(error instanceof Error ? error.message : String(error));
    } finally {
      setSuggesting(false);
    }
  };

  const trimmed = name.trim();

  return (
    <Pressable className="flex-1 items-center justify-center bg-black/50 px-6" onPress={onCancel}>
      <Pressable className="w-full max-w-sm gap-3 rounded-xl border border-border bg-card p-4">
        <Text className="text-lg font-semibold text-card-foreground">{title}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Home, Lab, Gym…"
          placeholderTextColor={colors.mutedForeground}
          autoFocus
          autoCapitalize="words"
          className="rounded-xl border border-border bg-background px-4 py-3 text-foreground"
        />
        {hint ? <Text className="text-xs text-amber-500">{hint}</Text> : null}
        <View className="flex-row items-center justify-end gap-2">
          {settings.geocoderUrl && at ? (
            <Pressable
              onPress={() => void suggest()}
              disabled={suggesting}
              className="mr-auto flex-row items-center gap-2 rounded-lg bg-muted px-3 py-2 active:opacity-70"
            >
              {suggesting ? <ActivityIndicator size="small" color={colors.primary} /> : null}
              <Text className="text-sm text-foreground">Suggest</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={onCancel} className="rounded-lg px-3 py-2 active:opacity-70">
            <Text className="text-sm text-muted-foreground">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={() => trimmed && onSave(trimmed)}
            disabled={!trimmed}
            className={`rounded-lg bg-primary px-3 py-2 active:opacity-80 ${trimmed ? '' : 'opacity-50'}`}
          >
            <Text className="text-sm font-medium text-primary-foreground">Save</Text>
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  );
}
