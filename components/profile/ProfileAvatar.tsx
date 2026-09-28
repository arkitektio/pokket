import { Text } from '@/components/ui/text';
import { profileTitle, StoredProfile } from '@/lib/arkitekt/fakts/profileStorageSchema';
import { oklchToRgb } from '@/lib/theme/oklch';
import { View } from 'react-native';

const initials = (title: string) => {
  const words = title.trim().split(/[\s._-]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] ?? '?').slice(0, 2).toUpperCase();
};

/**
 * A kept login's badge — orkestrator's `ProfileBrandAvatar`: the
 * organization's initials on its brand color. Numbers cached on the profile,
 * not an image, so it paints offline and for parked logins. Grey when the
 * login is stale.
 */
export function ProfileAvatar({ profile, size = 36 }: { profile: StoredProfile; size?: number }) {
  const { brandHue, brandChroma } = profile.label;
  const branded = profile.status === 'ok' && typeof brandHue === 'number';
  const background = branded
    ? (() => {
        const { r, g, b } = oklchToRgb(0.55, Math.min(brandChroma ?? 0.12, 0.2), brandHue);
        return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
      })()
    : undefined;

  return (
    <View
      style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: background }}
      className={`items-center justify-center ${branded ? '' : 'bg-muted'}`}
    >
      <Text
        style={{ fontSize: size * 0.38 }}
        className={`font-bold ${branded ? 'text-white' : 'text-muted-foreground'}`}
      >
        {initials(profileTitle(profile))}
      </Text>
    </View>
  );
}
