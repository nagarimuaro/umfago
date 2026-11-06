import { StyleSheet, View } from 'react-native';

import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { Palette, Radius, ShadowXs, Sizes, Spacing } from '@/constants/design-system';
import type { FoodBadge, FoodBadgeTone } from '@/types/food';

/** The design's two filled badge treatments over cover art. */
const tones: Record<FoodBadgeTone, { bg: string; fg: string }> = {
  primary: { bg: Palette.primary, fg: Palette.onPrimary },
  secondary: { bg: Palette.secondary, fg: Palette.onSecondary },
};

/**
 * Promotion badge that floats over a merchant's cover image.
 *
 * Kept apart from `Pill` because its padding, corner and shadow all sit off the pill
 * scale; three more props on `Pill` would cost more than this component does.
 */
export function PromoBadge({ badge }: { badge: FoodBadge }) {
  const { bg, fg } = tones[badge.tone];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {badge.icon ? <Icon name={badge.icon} size={Sizes.iconXs} color={fg} /> : null}
      <DSText variant="labelSm" color={fg}>
        {badge.label}
      </DSText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.base,
    borderRadius: Radius.sm,
    ...ShadowXs,
  },
});
