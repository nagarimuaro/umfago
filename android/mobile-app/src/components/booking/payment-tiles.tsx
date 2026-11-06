import { Pressable, StyleSheet, View } from 'react-native';

import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { formatRupiah } from '@/constants/booking';
import type { PaymentMethodOption } from '@/constants/booking';
import {
  MinTouchTarget,
  Neutral,
  Opacity,
  Palette,
  Radius,
  Sizes,
  Spacing,
} from '@/constants/design-system';
import type { PaymentMethodId } from '@/types/order';

export type PaymentTilesProps = {
  methods: readonly PaymentMethodOption[];
  selected: PaymentMethodId;
  /** Rupiah balance per method id. Methods absent from the map show `caption` instead. */
  balances?: Partial<Record<PaymentMethodId, number>>;
  /** Fallback line for a method with no balance, e.g. "Bayar di tempat" for cash. */
  captions?: Partial<Record<PaymentMethodId, string>>;
  /** Nominal yang dibutuhkan untuk perjalanan ini (untuk mendeteksi saldo kurang). */
  requiredAmount?: number;
  onSelect: (id: PaymentMethodId) => void;
};

/**
 * Both payment methods shown at once, as the design draws them — the selected tile is
 * filled with `primary-container` and outlined in `primary`, the other stays on the low
 * container surface. Replaces the earlier tap-to-cycle row, which hid the alternative.
 */
export function PaymentTiles({
  methods,
  selected,
  balances,
  captions,
  requiredAmount,
  onSelect,
}: PaymentTilesProps) {
  return (
    <View style={styles.row}>
      {methods.map((method) => {
        const active = method.id === selected;
        const balance = balances?.[method.id];
        const isInsufficient =
          method.id === 'wallet' &&
          typeof balance === 'number' &&
          typeof requiredAmount === 'number' &&
          balance < requiredAmount;

        let secondary =
          typeof balance === 'number' ? formatRupiah(balance) : captions?.[method.id];
        if (isInsufficient) {
          secondary = `${formatRupiah(balance)} (Kurang)`;
        }

        return (
          <Pressable
            key={method.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${method.label}${secondary ? `, ${secondary}` : ''}`}
            onPress={() => onSelect(method.id)}
            style={({ pressed }) => [
              styles.tile,
              active ? styles.tileActive : styles.tileIdle,
              pressed && styles.pressed,
            ]}>
            <Icon
              name={method.icon}
              size={Sizes.iconLg}
              color={active ? Palette.primary : Neutral.gray500}
            />

            <View style={styles.labels}>
              <DSText
                variant="labelSm"
                color={active ? Palette.onPrimaryContainer : Neutral.gray500}
                numberOfLines={1}>
                {method.label}
              </DSText>
              {secondary ? (
                <DSText
                  variant="labelMd"
                  color={
                    isInsufficient
                      ? '#dc2626'
                      : active
                      ? Palette.onPrimaryContainer
                      : Neutral.gray900
                  }
                  numberOfLines={1}>
                  {secondary}
                </DSText>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tile: {
    flex: 1,
    minHeight: MinTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tileActive: {
    backgroundColor: Palette.primaryContainer,
    borderColor: Palette.primary,
  },
  tileIdle: {
    backgroundColor: Palette.surfaceContainerLow,
    borderColor: Neutral.gray200,
  },
  labels: {
    flex: 1,
  },
  pressed: {
    opacity: Opacity.pressedSubtle,
  },
});
