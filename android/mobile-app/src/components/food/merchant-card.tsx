import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ds/card';
import { DSText } from '@/components/ds/ds-text';
import { Icon, type IconName } from '@/components/ds/icon';
import { IconButton } from '@/components/ds/icon-button';
import { Pill } from '@/components/ds/pill';
import { PromoBadge } from '@/components/food/promo-badge';
import { formatDistance, formatRupiah } from '@/constants/booking';
import { Opacity, Overlay, Palette, Sizes, Spacing } from '@/constants/design-system';
import { deliveryFee } from '@/lib/food';
import type { FoodMerchant } from '@/types/food';

function MetaItem({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.metaItem}>
      <Icon name={icon} size={Sizes.iconSm} color={Palette.onSurfaceVariant} />
      <DSText variant="labelSm" color={Palette.onSurfaceVariant}>
        {label}
      </DSText>
    </View>
  );
}

export type MerchantCardProps = {
  merchant: FoodMerchant;
  onPress?: () => void;
};

/**
 * Full-width merchant card: cover art with its badges, then the name, rating, cuisine
 * line and the delivery meta row.
 *
 * The favorite heart is drawn as the design has it but is disabled — nothing persists a
 * favorite yet, so it announces state rather than an action that would be lost. The card
 * stays inert without `onPress`, which keeps it usable in lists that do not navigate.
 */
export function MerchantCard({ merchant, onPress }: MerchantCardProps) {
  const distance = formatDistance(merchant.distanceKm);
  const fee = formatRupiah(deliveryFee(merchant.distanceKm, merchant.isFreeDelivery));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${merchant.name}, rating ${merchant.rating}, ${distance}, ${merchant.etaLabel}, delivery ${fee}`}
      accessibilityState={{ disabled: !onPress }}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card level={1} elevation="soft" radius="xl" padding="none" style={styles.card}>
        <View style={styles.coverWrap}>
          <Image
            source={{ uri: merchant.image }}
            style={styles.cover}
            contentFit="cover"
            transition={200}
            accessibilityIgnoresInvertColors
          />

          {/* Absolute is required here: the badges overlay the cover art, as in the design. */}
          {merchant.badges.length > 0 ? (
            <View style={styles.badges}>
              {merchant.badges.map((badge) => (
                <PromoBadge key={badge.label} badge={badge} />
              ))}
            </View>
          ) : null}

          {merchant.isFavorite ? (
            <IconButton
              icon="favorite"
              accessibilityLabel={`${merchant.name} is saved to favorites`}
              box={Sizes.buttonCircle}
              size={Sizes.iconMd}
              background={Overlay.onImageSurface}
              disabled
              style={styles.favorite}
            />
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={styles.nameRow}>
            <DSText variant="headlineMd" numberOfLines={1} style={styles.name}>
              {merchant.name}
            </DSText>
            <Pill
              label={merchant.rating.toFixed(1)}
              tone="neutral"
              icon="star"
              iconColor={Palette.surfaceTint}
              radius="sm"
            />
          </View>

          <DSText variant="bodySm" color={Palette.onSurfaceVariant} style={styles.tags}>
            {merchant.tags}
          </DSText>

          <View style={styles.meta}>
            <MetaItem icon="schedule" label={merchant.etaLabel} />
            <MetaItem icon="location-on" label={distance} />
            <View style={styles.fee}>
              <MetaItem icon="local-shipping" label={fee} />
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderColor: Overlay.outlineVariantSoft,
  },
  coverWrap: {
    height: Sizes.coverWide,
    backgroundColor: Palette.surfaceContainerHighest,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  /* Absolute is required here: the badges overlay the cover art, as in the design. */
  badges: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  /* Absolute for the same reason: the heart floats over the cover's top-right corner. */
  favorite: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
  body: {
    padding: Spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.xs,
    marginBottom: Spacing.base,
  },
  name: {
    flex: 1,
  },
  tags: {
    marginBottom: Spacing.sm,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  /* `ml-auto` in the markup: the delivery fee is pushed to the far edge of the row. */
  fee: {
    marginLeft: 'auto',
  },
  pressed: {
    opacity: Opacity.pressedSubtle,
  },
});
