import { StyleSheet, View } from 'react-native';

import { DSText } from '@/components/ds/ds-text';
import { Icon, type IconName } from '@/components/ds/icon';
import { formatDistance } from '@/constants/booking';
import { Palette, Radius, ShadowRise, Sizes, Spacing } from '@/constants/design-system';
import type { FoodMerchant } from '@/types/food';

function MetaItem({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.metaItem}>
      <Icon name={icon} size={Sizes.iconXs} color={Palette.onSurfaceVariant} />
      <DSText variant="labelBase" color={Palette.onSurfaceVariant}>
        {label}
      </DSText>
    </View>
  );
}

export type StoreHeaderProps = {
  merchant: FoodMerchant;
  /** The design writes the rating volume as a literal, e.g. "(1k+ ratings)". */
  ratingCount: string;
};

/**
 * The white sheet that lifts over the hero photo: the store's name, its rating chip, and
 * the distance and delivery window.
 */
export function StoreHeader({ merchant, ratingCount }: StoreHeaderProps) {
  return (
    <View style={styles.sheet}>
      <DSText variant="headlineDisplay" style={styles.name}>
        {merchant.name}
      </DSText>

      <View style={styles.meta}>
        <View style={styles.rating}>
          <Icon name="star" size={Sizes.iconXs} color={Palette.primary} />
          <DSText variant="labelMd">{merchant.rating.toFixed(1)}</DSText>
          <DSText variant="bodyXs" color={Palette.onSurfaceVariant}>
            {ratingCount}
          </DSText>
        </View>

        <MetaItem icon="location-on" label={`${formatDistance(merchant.distanceKm)} away`} />
        <MetaItem icon="schedule" label={merchant.etaLabel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* `-mt-4` lifts the sheet over the hero photo; the upward shadow separates the two. */
  sheet: {
    marginTop: -Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    backgroundColor: Palette.surfaceContainerLowest,
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
    ...ShadowRise,
  },
  name: {
    marginBottom: Spacing.xs,
  },
  /*
    The design keeps all three on one line. Wrapping is allowed so the row degrades on a
    narrow phone instead of clipping the delivery window.
  */
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.base,
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radius.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
});
