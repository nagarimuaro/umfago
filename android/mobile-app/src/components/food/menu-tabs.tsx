import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { DSText } from '@/components/ds/ds-text';
import { Brand, Opacity, Palette, Radius, Spacing } from '@/constants/design-system';
import type { FoodMenuCategory, FoodMenuCategoryId } from '@/types/food';

/** Brings the 36pt chip up to the spec's 48pt minimum without changing how it draws. */
const ChipHitSlop = Spacing.tight;

export type MenuTabsProps = {
  categories: readonly FoodMenuCategory[];
  activeId: FoodMenuCategoryId;
  /** Categories the menu actually has items for. The rest are drawn but inert. */
  availableIds: readonly FoodMenuCategoryId[];
  onSelect: (id: FoodMenuCategoryId) => void;
};

/**
 * The category tabs that stick to the top of the menu as it scrolls. Single-select, unlike
 * the category screen's filter row.
 *
 * The design names four categories but only specifies items for the first. A tab with
 * nothing behind it keeps its drawn treatment and is disabled, so the row stays faithful
 * without inventing menu content.
 */
export function MenuTabs({ categories, activeId, availableIds, onSelect }: MenuTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bar}
      contentContainerStyle={styles.track}>
      {categories.map((category) => {
        const isActive = category.id === activeId;
        const isAvailable = availableIds.includes(category.id);

        return (
          <Pressable
            key={category.id}
            accessibilityRole="tab"
            accessibilityLabel={category.label}
            accessibilityState={{ selected: isActive, disabled: !isAvailable }}
            disabled={!isAvailable}
            hitSlop={ChipHitSlop}
            onPress={() => onSelect(category.id)}
            style={({ pressed }) => [
              styles.tab,
              isActive ? styles.tabActive : styles.tabIdle,
              pressed && styles.pressed,
            ]}>
            <DSText
              variant="labelBaseSemi"
              color={isActive ? Palette.onPrimary : Palette.onSurfaceVariant}>
              {category.label}
            </DSText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Palette.surfaceContainerLowest,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.surfaceVariant,
  },
  /* The design nests a `py-2` row inside a `px-4 py-2` bar, so the padding is doubled. */
  track: {
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabActive: {
    backgroundColor: Brand.ink,
    borderColor: Brand.ink,
  },
  tabIdle: {
    backgroundColor: Palette.surface,
    borderColor: Palette.outlineVariant,
  },
  pressed: {
    opacity: Opacity.pressedSubtle,
  },
});
