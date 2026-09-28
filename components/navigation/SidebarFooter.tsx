import { OrgSwitcherSheet } from '@/components/profile/OrgSwitcherSheet';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { Text } from '@/components/ui/text';
import { App } from '@/lib/app/App';
import { profileDetail, profileTitle } from '@/lib/arkitekt/fakts/profileStorageSchema';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { ChevronsUpDown, Settings } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

/**
 * The foot of the sidebar — orkestrator's `RailFooter`: who you are acting
 * as, opening the organization switcher, and a gear beside it.
 */
export function SidebarFooter({ onSettings }: { onSettings: () => void }) {
  const colors = useThemeColors();
  const active = App.useActiveProfile();
  const switching = App.useSwitchingProfileId();
  const [open, setOpen] = React.useState(false);

  return (
    <View className="flex-row items-center gap-1 border-t border-border pt-2">
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Switch organization"
        className="flex-1 flex-row items-center gap-2.5 rounded-xl px-2 py-2 active:bg-muted"
      >
        {active ? <ProfileAvatar profile={active} size={32} /> : null}
        <View className="flex-1">
          <Text numberOfLines={1} className="text-sm font-semibold text-foreground">
            {active ? profileTitle(active) : 'Not signed in'}
          </Text>
          {active && profileDetail(active) ? (
            <Text numberOfLines={1} className="text-xs text-muted-foreground">
              {profileDetail(active)}
            </Text>
          ) : null}
        </View>
        {switching ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <ChevronsUpDown size={16} color={colors.mutedForeground} />
        )}
      </Pressable>
      <Pressable onPress={onSettings} hitSlop={6} accessibilityLabel="Settings" className="rounded-lg p-2 active:bg-muted">
        <Settings size={18} color={colors.mutedForeground} />
      </Pressable>
      <OrgSwitcherSheet visible={open} onClose={() => setOpen(false)} />
    </View>
  );
}
