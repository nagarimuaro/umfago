import { Pressable, StyleSheet, View } from 'react-native';

import { DSText } from '@/components/ds/ds-text';
import { Icon, type IconName } from '@/components/ds/icon';
import {
  MinTouchTarget,
  Neutral,
  Opacity,
  Palette,
  Radius,
  Sizes,
  Spacing,
} from '@/constants/design-system';
import type { Place } from '@/types/order';

/** Glyph per saved place. Anything unrecognised falls back to a generic pin. */
const PlaceIcons: Record<string, IconName> = {
  home: 'home',
  work: 'work',
  gym: 'fitness-center',
};

export type SavedPlacesListProps = {
  places: readonly Place[];
  onSelect: (place: Place) => void;
};

/**
 * Saved addresses offered while the destination field is empty. This replaces the
 * standalone "Mau ke mana?" screen — picking a destination now happens in the booking
 * sheet itself, so the flow never leaves the map.
 */
export function SavedPlacesList({ places, onSelect }: SavedPlacesListProps) {
  return (
    <View style={styles.list}>
      {places.map((place) => (
        <Pressable
          key={place.id}
          accessibilityRole="button"
          accessibilityLabel={`${place.label}, ${place.address}`}
          onPress={() => onSelect(place)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <View style={styles.leading}>
            <Icon
              name={PlaceIcons[place.id] ?? 'location-on'}
              size={Sizes.iconMd}
              color={Neutral.gray500}
            />
          </View>

          <View style={styles.text}>
            <DSText variant="labelMd" color={Neutral.gray900} numberOfLines={1}>
              {place.label}
            </DSText>
            <DSText variant="bodySm" color={Neutral.gray500} numberOfLines={1}>
              {place.address}
            </DSText>
          </View>

          <Icon name="chevron-right" size={Sizes.iconMd} color={Neutral.gray300} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginBottom: Spacing.lg,
  },
  row: {
    minHeight: MinTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.pill,
  },
  leading: {
    width: Sizes.buttonCircle,
    height: Sizes.buttonCircle,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surfaceContainer,
  },
  text: {
    flex: 1,
  },
  pressed: {
    opacity: Opacity.pressedSubtle,
  },
});
