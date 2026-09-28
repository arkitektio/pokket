import { Text } from '@/components/ui/text';
import { App } from '@/lib/app/App';
import { groupProfilesByDeployment, profileTitle, StoredProfile } from '@/lib/arkitekt/fakts/profileStorageSchema';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Building2 } from 'lucide-react-native';
import * as React from 'react';
import { Alert, View } from 'react-native';
import { toast } from 'sonner-native';
import { ProfileRow } from './ProfileRow';

/**
 * Every kept login, grouped by deployment — orkestrator's `ProfileSwitcher`.
 * Tapping one makes it live (a refresh and a connection swap, no browser);
 * tapping a stale one signs in to it again; a long press signs out of it.
 */
export function ProfileList({ onSwitched }: { onSwitched?: () => void }) {
  const colors = useThemeColors();
  const profiles = App.useProfiles();
  const activeId = App.useActiveProfileId();
  const connected = App.useIsConnected();
  const switchingId = App.useSwitchingProfileId();
  const connect = App.useConnect();
  const { switchProfile, signOutProfile } = App.useProfileActions();
  const [signingInId, setSigningInId] = React.useState<string | null>(null);
  const busy = !!switchingId || !!signingInId;

  const groups = React.useMemo(() => groupProfilesByDeployment(profiles), [profiles]);

  const signInAgain = async (profile: StoredProfile) => {
    setSigningInId(profile.id);
    try {
      await connect({
        endpoint: profile.session.endpoint,
        controller: new AbortController(),
        replaceProfileId: profile.id,
      });
      onSwitched?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Sign-in failed');
    } finally {
      setSigningInId(null);
    }
  };

  const onPress = (profile: StoredProfile) => {
    if (profile.status === 'stale') {
      void signInAgain(profile);
      return;
    }
    if (profile.id === activeId && connected) {
      onSwitched?.();
      return;
    }
    switchProfile(profile.id).then(onSwitched, (error: Error) =>
      toast.error(error.message, { description: profileTitle(profile) }),
    );
  };

  const onLongPress = (profile: StoredProfile) => {
    Alert.alert(
      `Sign out of ${profileTitle(profile)}?`,
      profile.mesh ? 'This also removes this device from its mesh.' : undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => void signOutProfile(profile.id) },
      ],
    );
  };

  if (profiles.length === 0) return null;

  return (
    <View className="gap-3">
      {groups.map((group) => (
        <View key={group.key} className="gap-1">
          <View className="flex-row items-center gap-1.5 px-3">
            <Building2 size={12} color={colors.mutedForeground} />
            <Text className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.title}</Text>
          </View>
          {group.profiles.map((profile) => (
            <ProfileRow
              key={profile.id}
              profile={profile}
              active={profile.id === activeId && connected}
              switching={profile.id === switchingId || profile.id === signingInId}
              disabled={busy}
              onPress={() => onPress(profile)}
              onLongPress={() => onLongPress(profile)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
