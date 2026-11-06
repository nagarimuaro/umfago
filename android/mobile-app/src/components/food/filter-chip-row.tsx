import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { Opacity, Palette, Radius, Sizes, Spacing } from '@/constants/design-system';
import type { FoodFilter, FoodFilterId } from '@/types/food';

/** Brings the 32pt chip up to the spec's 48pt minimum without changing how it draws. */
const ChipHitSlop = Spacing.xs;

export type FilterChipRowProps = {
  filters: readonly FoodFilter[];
  activeIds: readonly FoodFilterId[];
  onToggle: (id: FoodFilterId) => void;
};

/**
 * The horizontally scrolling filter row. `sort` keeps the design's filled treatment but
 * is inert: the design does not specify the sheet it would open.
 */
export function FilterChipRow({ filters, activeIds, onToggle }: FilterChipRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.track}>
      {filters.map((filter) => {
        const isSort = filter.id === 'sort';
        const isActive = isSort || activeIds.includes(filter.id);
        const fg = isActive ? Palette.onPrimaryContainer : Palette.onSurface;

        return (
          <Pressable
            key={filter.id}
            accessibilityRole="button"
            accessibilityLabel={filter.label}
            accessibilityState={{ selected: isActive, disabled: isSort }}
            disabled={isSort}
            hitSlop={ChipHitSlop}
            onPress={() => onToggle(filter.id)}
            style={({ pressed }) => [
              styles.chip,
              isActive ? styles.chipActive : styles.chipIdle,
              pressed && styles.pressed,
            ]}>
            {filter.icon ? <Icon name={filter.icon} size={Sizes.iconSm} color={fg} /> : null}
            <DSText variant="labelSm" color={fg}>
              {filter.label}
            </DSText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: {
    gap: Spacing.xs,
    paddingHorizontal: Spacing.edgeMargin,
    paddingVertical: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipActive: {
    backgroundColor: Palette.primaryContainer,
    borderColor: Palette.primary,
  },
  chipIdle: {
    backgroundColor: Palette.surfaceContainerLowest,
    borderColor: Palette.outlineVariant,
  },
  pressed: {
    opacity: Opacity.pressedSubtle,
  },
});
