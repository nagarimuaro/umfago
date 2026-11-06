import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { formatRupiah } from '@/constants/booking';
import {
  Opacity,
  Palette,
  Radius,
  ShadowRise,
  Sizes,
  Spacing,
} from '@/constants/design-system';
import { FoodCheckoutCopy } from '@/constants/food-checkout';

export type CheckoutBarProps = {
  /** The grand total, repeated from the payment summary above. */
  total: number;
  paymentMethod?: 'wallet' | 'cash';
  /** Absent while no order-tracking flow exists, which draws the button disabled. */
  onPlaceOrder?: () => void;
};

/**
 * The fixed bar at the foot of the checkout: the total, the wallet/cash paying it, and the
 * button that commits the order.
 *
 * The design pins this with `fixed bottom-0 ... pb-safe`, so it docks over the scrolling
 * page and pads itself by the safe-area inset the way the cart bar does. The button is a
 * bespoke pressable rather than the shared `Button`: the design draws headline-bold 16pt
 * text in `on-surface` on a lime fill, which no `Button` variant renders.
 */
export function CheckoutBar({ total, paymentMethod = 'wallet', onPlaceOrder }: CheckoutBarProps) {
  const insets = useSafeAreaInsets();
  const amount = formatRupiah(total);
  const isCash = paymentMethod === 'cash';

  return (
    /* Absolute is required here: the design fixes the bar over the page it belongs to. */
    <View style={[styles.dock, { paddingBottom: Spacing.edgeMargin + insets.bottom }]}>
      <View style={styles.summary}>
        <View>
          <DSText variant="labelSm" color={Palette.onSurfaceVariant}>
            {FoodCheckoutCopy.barTotal}
          </DSText>
          <DSText variant="priceHeadline">{amount}</DSText>
        </View>

        <View style={styles.wallet}>
          <Icon
            name={isCash ? 'payments' : 'account-balance-wallet'}
            size={Sizes.iconXs}
            color={Palette.onSurfaceVariant}
          />
          <DSText variant="labelSm" color={Palette.onSurfaceVariant}>
            {isCash ? 'Tunai' : FoodCheckoutCopy.paymentName}
          </DSText>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${FoodCheckoutCopy.placeOrder}, ${amount}`}
        accessibilityState={{ disabled: !onPlaceOrder }}
        disabled={!onPlaceOrder}
        onPress={onPlaceOrder}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
        <DSText variant="headlineSm">{FoodCheckoutCopy.placeOrder}</DSText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  /* Absolute is required here: the design fixes the bar to the bottom of the viewport. */
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.edgeMargin,
    backgroundColor: Palette.surfaceContainerLowest,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.surfaceVariant,
    ...ShadowRise,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  wallet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  cta: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: Palette.primaryContainer,
    borderRadius: Radius.md,
  },
  pressed: {
    opacity: Opacity.pressedSubtle,
  },
});
