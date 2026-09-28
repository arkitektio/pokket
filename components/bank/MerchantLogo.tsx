import { useThemeColors } from '@/lib/theme/BrandProvider';
import { ArrowDownLeft, ArrowUpRight, Store } from 'lucide-react-native';
import * as React from 'react';
import { Image, View } from 'react-native';

/**
 * A merchant's logo; without one (or when it fails to load), a store glyph
 * for a merchant, or which way the money went for anything else.
 */
export function MerchantLogo({
  logoUrl,
  incoming,
  hasMerchant,
  size = 36,
}: {
  logoUrl?: string | null;
  incoming: boolean;
  hasMerchant: boolean;
  size?: number;
}) {
  const colors = useThemeColors();
  const [failed, setFailed] = React.useState(false);
  const glyph = size * 0.5;
  return (
    <View
      style={{ width: size, height: size, borderRadius: size * 0.25 }}
      className="items-center justify-center overflow-hidden bg-muted"
    >
      {logoUrl && !failed ? (
        <Image source={{ uri: logoUrl }} style={{ width: size, height: size }} resizeMode="contain" onError={() => setFailed(true)} />
      ) : hasMerchant ? (
        <Store size={glyph} color={colors.mutedForeground} />
      ) : incoming ? (
        <ArrowDownLeft size={glyph} color="#10b981" />
      ) : (
        <ArrowUpRight size={glyph} color={colors.mutedForeground} />
      )}
    </View>
  );
}
