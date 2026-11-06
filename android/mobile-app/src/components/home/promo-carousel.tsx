import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ds/button';
import { Card } from '@/components/ds/card';
import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { Pill } from '@/components/ds/pill';
import {
  FontFamily,
  Opacity,
  Palette,
  Radius,
  Sizes,
  Spacing,
} from '@/constants/design-system';

/** Solid fill: the design's `from-primary to-surface-tint` gradient has identical stops. */
function RidePromo({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Promo 50% off first ride, kode HEMAT10"
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card
        level={2}
        elevation="none"
        radius="lg"
        padding="edgeMargin"
        background={Palette.primary}
        style={styles.card}>
        {/* Oversized watermark glyph, clipped by the card's overflow. */}
        <View style={styles.watermark} pointerEvents="none">
          <Icon name="two-wheeler" size={Sizes.iconWatermark} color={Palette.onPrimary} />
        </View>

        <Pill label="New Users" tone="onDark" compact />

        <View style={styles.ridePromoBody}>
          <DSText variant="headlineLgMobile" color={Palette.onPrimary} style={styles.promoTitle}>
            50% OFF{'\n'}First Ride!
          </DSText>
          <View style={styles.ridePromoFooter}>
            <DSText variant="labelSm" color={Palette.onPrimary} style={styles.promoCode}>
              Code: HEMAT10
            </DSText>
            <View style={styles.arrowButton}>
              <Icon name="arrow-forward" size={Sizes.iconBase} color={Palette.primary} />
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

function FoodPromo({ onPress }: { onPress?: () => void }) {
  return (
    <Card level={1} radius="lg" padding="edgeMargin" style={styles.card}>
      <View style={styles.foodPromoHeader}>
        <Icon name="restaurant" size={Sizes.iconSm} color={Palette.error} />
        <DSText variant="labelXs" color={Palette.secondary}>
          OPENFOOD
        </DSText>
      </View>

      <View style={styles.foodPromoBody}>
        <DSText variant="headlineMd" style={styles.promoTitle}>
          Free Delivery{'\n'}Min. Rp 40k
        </DSText>
        <DSText variant="labelSm" color={Palette.secondary}>
          Valid until Sunday
        </DSText>
      </View>

      <Button label="Claim" variant="primary" size="sm" onPress={onPress} style={styles.claim} />
    </Card>
  );
}

export function PromoCarousel({ onPromo }: { onPromo?: (id: string) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.track}>
      <RidePromo onPress={() => onPromo?.('hemat10')} />
      <FoodPromo onPress={() => onPromo?.('openfood-free-delivery')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.edgeMargin,
  },
  card: {
    minWidth: Sizes.promoCardMin,
    height: Sizes.promoCard,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    right: -Spacing.md,
    bottom: -Spacing.md,
    opacity: Opacity.watermark,
    transform: [{ rotate: '-12deg' }],
  },
  ridePromoBody: {
    gap: Spacing.xs,
  },
  promoTitle: {
    fontFamily: FontFamily.headline,
  },
  ridePromoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoCode: {
    opacity: Opacity.muted,
  },
  arrowButton: {
    width: Sizes.buttonCircle,
    height: Sizes.buttonCircle,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodPromoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  foodPromoBody: {
    gap: Spacing.base,
  },
  claim: {
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: Opacity.pressedSubtle,
  },
});
