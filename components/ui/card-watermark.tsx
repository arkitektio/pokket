import * as React from 'react';
import { View } from 'react-native';

/**
 * A logo large and faint behind a card (orkestrator's `CardFrame` watermark):
 * two thirds of the card's width, square, a corner tucked past its bottom
 * right edge, tilted, at 8%. The card clips it (`overflow-hidden`) and draws
 * over it. `children` fills the box: a logo sized `h-full w-full`, or an icon
 * given the box's size.
 */
export function CardWatermark({ children, size = '66%' }: { children: React.ReactNode; size?: `${number}%` }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: 'absolute',
        right: '-10%',
        bottom: '-10%',
        width: size,
        aspectRatio: 1,
        opacity: 0.08,
        transform: [{ rotate: '-12deg' }],
      }}
    >
      {children}
    </View>
  );
}

/**
 * A card's small leading logo with a state as a bead on its corner
 * (orkestrator's `LeadWithBead`): the logo says what it is, the bead how it is.
 */
export function LeadWithBead({ children, bead, label }: { children: React.ReactNode; bead: React.ReactNode; label: string }) {
  return (
    <View accessibilityLabel={label} className="relative shrink-0">
      {children}
      <View className="absolute -bottom-1 -right-1 h-3 w-3 items-center justify-center rounded-full bg-background">
        {bead}
      </View>
    </View>
  );
}
