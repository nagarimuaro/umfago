import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { formatRupiah } from '@/constants/booking';
import {
  Opacity,
  Palette,
  Radius,
  ShadowRaised,
  Sizes,
  Spacing,
} from '@/constants/design-system';

export type CartBarProps = {
  /** Total pieces in the cart. The bar is only rendered when this is above zero. */
  count: number;
  total: number;
  label: string;
  /** Absent while no cart screen exists, which draws the bar disabled. */
  onPress?: () => void;
};

/**
 * The cart bar floating over the menu.
 *
 * The design pins it above a bottom navigation bar this screen does not carry, so it sits
 * above the safe-area inset instead, the way the booking screens' footers do. It is drawn
 * disabled until there is a cart screen for it to open.
 */
export function CartBar({ count, total, label, onPress }: CartBarProps) {
  const insets = useSafeAreaInsets();
  const countLabel = count === 1 ? '1 item' : `${count} items`;

  return (
    /* Absolute is required here: the bar floats over the scrolling menu. */
    <View style={[styles.dock, { paddingBottom: Spacing.md + insets.bottom }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${countLabel}, ${formatRupiah(total)}`}
        accessibilityState={{ disabled: !onPress }}
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => [styles.bar, pressed && styles.pressed]}>
        <View>
          <DSText variant="labelBase" color={Palette.primaryContainer}>
            {countLabel}
          </DSText>
          <DSText variant="headlineSm" color={Palette.onPrimary}>
            {formatRupiah(total)}
          </DSText>
        </View>

        <View style={styles.action}>
          <DSText variant="headlineSmSemi" color={Palette.onPrimary}>
            {label}
          </DSText>
          <Icon name="shopping-bag" size={Sizes.iconLg} color={Palette.onPrimary} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  /* Absolute is required here: the design floats the bar over the menu it belongs to. */
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.md,
  },
  bar: {
    width: '100%',
    maxWidth: Sizes.cartBarMax,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Palette.primary,
    borderRadius: Radius.md,
    ...ShadowRaised,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  pressed: {
    opacity: Opacity.pressedSubtle,
  },
});
