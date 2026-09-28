import { Text } from '@/components/ui/text';
import { profileDetail, profileTitle, StoredProfile } from '@/lib/arkitekt/fakts/profileStorageSchema';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { AlertTriangle, Check, Network } from 'lucide-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { ProfileAvatar } from './ProfileAvatar';

/**
 * One kept login in the switcher: badge, organization, who and where, and
 * its state — switching (spinner), stale (sign in again), or live (check).
 * The network glyph marks a login whose hub gave it a mesh.
 */
export function ProfileRow({
  profile,
  active,
  switching,
  disabled,
  onPress,
  onLongPress,
}: {
  profile: StoredProfile;
  active: boolean;
  switching: boolean;
  disabled?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const colors = useThemeColors();
  const stale = profile.status === 'stale';
  const detail = stale ? 'Session expired — sign in again' : profileDetail(profile);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      className={`flex-row items-center gap-3 rounded-xl px-3 py-2.5 active:bg-muted ${active ? 'bg-muted/60' : ''}`}
    >
      <ProfileAvatar profile={profile} />
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text numberOfLines={1} className="shrink text-base font-medium text-foreground">
            {profileTitle(profile)}
          </Text>
          {profile.mesh?.enabled ? <Network size={12} color={colors.mutedForeground} /> : null}
        </View>
        {detail ? (
          <Text numberOfLines={1} className={`text-xs ${stale ? 'text-amber-500' : 'text-muted-foreground'}`}>
            {detail}
          </Text>
        ) : null}
      </View>
      {switching ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : stale ? (
        <AlertTriangle size={18} color="#f59e0b" />
      ) : active ? (
        <Check size={18} color={colors.primary} />
      ) : null}
    </Pressable>
  );
}
