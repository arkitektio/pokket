import { Text } from '@/components/ui/text';
import { App } from '@/lib/app/App';
import { profileTitle } from '@/lib/arkitekt/fakts/profileStorageSchema';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { LogOut, Plus } from 'lucide-react-native';
import * as React from 'react';
import { Alert, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileList } from './ProfileList';

/**
 * The organization switcher, as a bottom sheet: every kept login, then
 * "Add organization…" (a new sign-in, the current one parked meanwhile) and
 * signing out of the live one. It stays open while a switch runs, so its
 * spinner and any error stay in view, and closes once the switch lands.
 */
export function OrgSwitcherSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const active = App.useActiveProfile();
  const { addProfile, signOutProfile } = App.useProfileActions();

  const onAdd = () => {
    onClose();
    void addProfile();
  };

  const onSignOut = () => {
    if (!active) return;
    Alert.alert(
      `Sign out of ${profileTitle(active)}?`,
      active.mesh ? 'This also removes this device from its mesh.' : undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => {
            onClose();
            void signOutProfile(active.id);
          },
        },
      ],
    );
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/30" onPress={onClose} />
      <View
        style={{ paddingBottom: insets.bottom + 12, maxHeight: '80%' }}
        className="rounded-t-3xl border-t border-border bg-card px-3 pt-3"
      >
        <View className="mb-3 h-1 w-10 self-center rounded-full bg-muted" />
        <Text className="mb-3 px-3 text-lg font-semibold text-card-foreground">Switch organization</Text>
        <ScrollView>
          <ProfileList onSwitched={onClose} />
        </ScrollView>
        <View className="mt-3 border-t border-border pt-2">
          <Pressable onPress={onAdd} className="flex-row items-center gap-3 rounded-xl px-3 py-3 active:bg-muted">
            <Plus size={20} color={colors.primary} />
            <Text className="text-base text-foreground">Add organization…</Text>
          </Pressable>
          {active ? (
            <Pressable onPress={onSignOut} className="flex-row items-center gap-3 rounded-xl px-3 py-3 active:bg-muted">
              <LogOut size={20} color={colors.destructive} />
              <Text className="text-base text-destructive">Sign out of {profileTitle(active)}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
