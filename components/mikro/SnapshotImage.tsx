import type { SceneSnapshotFragment } from '@/lib/mikro/api/graphql';
import { useMediaUrl } from '@/lib/mikro/media/useMediaUrl';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import type { LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { Image, View, type DimensionValue } from 'react-native';

/**
 * The picture of a scene, dataset or lens. Most have none (nothing takes a
 * snapshot when a scene is made), so the glyph of the kind is the normal case
 * and the picture the exception.
 */
export function SnapshotImage({
  snapshot,
  icon: Icon,
  width,
  height,
  radius = 10,
}: {
  snapshot?: SceneSnapshotFragment | null;
  icon: LucideIcon;
  width: DimensionValue;
  height: number;
  radius?: number;
}) {
  const colors = useThemeColors();
  const url = useMediaUrl(snapshot?.store);
  // Which url failed, so a new url (another picture, a fresh signature) is tried again.
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);
  const failed = failedUrl === url;
  return (
    <View style={{ width, height, borderRadius: radius }} className="items-center justify-center overflow-hidden bg-muted">
      {url && !failed ? (
        <Image
          source={{ uri: url }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          onError={() => setFailedUrl(url)}
        />
      ) : (
        <Icon size={Math.min(28, height * 0.45)} color={colors.mutedForeground} />
      )}
    </View>
  );
}
