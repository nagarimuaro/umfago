import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ds/card';
import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { Opacity, Palette, Sizes, Spacing } from '@/constants/design-system';
import { FoodCheckoutCopy } from '@/constants/food-checkout';

export type CheckoutPromoRowProps = {
  /** Promos the account can apply, drawn as "1 Available". */
  promoCount: number;
  /** Absent while no promo picker exists, which draws the row disabled. */
  onPress?: () => void;
};

/**
 * The promo entry point.
 *
 * The design marks the whole card as clickable, so the card is wrapped in the pressable
 * rather than carrying its own. It is drawn disabled until there is a promo screen to
 * open, the same way the store screen's cart bar was before checkout existed.
 */
export function CheckoutPromoRow({ promoCount, onPress }: CheckoutPromoRowProps) {
  const availability = `${promoCount} ${FoodCheckoutCopy.promoAvailable}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${FoodCheckoutCopy.promoTitle}, ${availability}`}
      accessibilityState={{ disabled: !onPress }}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}>
      <Card level={1} radius="md" padding="md" style={styles.card}>
        <View style={styles.left}>
          <Icon name="local-offer" size={Sizes.iconLg} color={Palette.error} />
          <DSText variant="bodyMdSemi">{FoodCheckoutCopy.promoTitle}</DSText>
        </View>

        <View style={styles.right}>
          <DSText variant="bodySmMedium" color={Palette.onSurfaceVariant}>
            {availability}
          </DSText>
          <Icon name="chevron-right" size={Sizes.iconLg} color={Palette.onSurfaceVariant} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  pressed: {
    opacity: Opacity.pressedSubtle,
  },
});
