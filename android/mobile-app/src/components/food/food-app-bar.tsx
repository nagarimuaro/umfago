import { Keyboard, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/ds/icon';
import { IconButton } from '@/components/ds/icon-button';
import {
  MinTouchTarget,
  Palette,
  Radius,
  Sizes,
  Spacing,
  Typography,
} from '@/constants/design-system';

/** Restores the spec's 48pt target on a field the design draws shorter than that. */
const FieldSlop = Math.max(0, Math.ceil((MinTouchTarget - Sizes.searchHeightCompact) / 2));
const FieldHitSlop = { top: FieldSlop, bottom: FieldSlop };

export type FoodAppBarProps = {
  query: string;
  onChangeQuery: (value: string) => void;
  placeholder: string;
  onBack: () => void;
};

/**
 * Top bar of the food category screen: back, an editable search field, and the basket.
 *
 * The basket is drawn with the design's unread dot but is disabled — this app has no
 * cart screen yet, so announcing an action that cannot happen would be worse than
 * showing the affordance as unavailable.
 */
export function FoodAppBar({ query, onChangeQuery, placeholder, onBack }: FoodAppBarProps) {
  return (
    <View style={styles.bar}>
      <IconButton icon="arrow-back" accessibilityLabel="Go back" onPress={onBack} />

      <View style={styles.searchWrap}>
        <View style={styles.searchIcon} pointerEvents="none">
          <Icon name="search" size={Sizes.iconXs} color={Palette.onSurfaceVariant} />
        </View>
        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder={placeholder}
          placeholderTextColor={Palette.onSurfaceVariant}
          accessibilityLabel="Search food places"
          inputMode="search"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          submitBehavior="blurAndSubmit"
          onSubmitEditing={Keyboard.dismiss}
          hitSlop={FieldHitSlop}
          style={styles.searchInput}
        />
      </View>

      <View>
        <IconButton icon="shopping-basket" accessibilityLabel="Basket" disabled />
        <View style={styles.basketDot} pointerEvents="none" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: Sizes.appBar,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.edgeMargin,
  },
  searchWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  /* Absolute is required here: the glyph sits inside the field, `absolute left-6`. */
  searchIcon: {
    position: 'absolute',
    left: Spacing.lg,
    zIndex: 1,
  },
  /* The corner matches the home screen's `SearchField`, not the design's pill. */
  searchInput: {
    ...Typography.bodySm,
    height: Sizes.searchHeightCompact,
    color: Palette.onSurface,
    paddingLeft: Spacing.xl,
    paddingRight: Spacing.md,
    /* Android gives a text input its own vertical padding, which unbalances a fixed height. */
    paddingVertical: 0,
    borderRadius: Radius.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.outlineVariant,
    backgroundColor: Palette.surfaceContainerLowest,
  },
  /* Absolute is required here too: the dot overlaps the basket glyph's top corner. */
  basketDot: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: Sizes.badgeDot,
    height: Sizes.badgeDot,
    borderRadius: Radius.full,
    backgroundColor: Palette.error,
  },
});
