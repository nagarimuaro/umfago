import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ds/card';
import { DSText } from '@/components/ds/ds-text';
import { Pill } from '@/components/ds/pill';
import {
  Accent,
  FontFamily,
  Opacity,
  Palette,
  Radius,
  Sizes,
  Spacing,
} from '@/constants/design-system';
import { NearbyFavorites, type Restaurant } from '@/constants/home-content';

function RestaurantCard({ item, onPress }: { item: Restaurant; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, rating ${item.rating}, ${item.distanceKm} km`}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card level={1} elevation="soft" radius="md" padding="none" style={styles.card}>
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: item.image }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            accessibilityIgnoresInvertColors
          />
          <View style={styles.ratingBadge}>
            <Pill
              label={item.rating.toFixed(1)}
              tone="surface"
              icon="star"
              iconColor={Accent.star}
            />
          </View>
        </View>

        <View style={styles.body}>
          <DSText variant="bodyMd" numberOfLines={1} style={styles.name}>
            {item.name}
          </DSText>
          <DSText variant="labelSm" color={Palette.secondary} numberOfLines={1}>
            {item.tags}
          </DSText>
          <View style={styles.meta}>
            <DSText variant="labelSm" color={Palette.secondary}>
              {item.distanceKm} km
            </DSText>
            <View style={styles.dot} />
            <DSText variant="labelSm" color={Palette.secondary}>
              {item.priceLevel}
            </DSText>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

export function NearbyFavoritesList({ onSelect }: { onSelect?: (item: Restaurant) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.track}>
      {NearbyFavorites.map((item) => (
        <RestaurantCard key={item.id} item={item} onPress={() => onSelect?.(item)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.edgeMargin,
  },
  card: {
    width: Sizes.restaurantCard,
    overflow: 'hidden',
  },
  imageWrap: {
    height: Sizes.cover,
    backgroundColor: Palette.surfaceContainerHighest,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  /* Absolute is required here: the badge overlays the cover art, as in the design. */
  ratingBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
  },
  body: {
    padding: Spacing.sm,
    gap: Spacing.base,
  },
  name: {
    fontFamily: FontFamily.headline,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    marginTop: Spacing.base,
  },
  dot: {
    width: Sizes.metaDot,
    height: Sizes.metaDot,
    borderRadius: Radius.full,
    backgroundColor: Palette.outlineVariant,
  },
  pressed: {
    opacity: Opacity.pressedSubtle,
  },
});
