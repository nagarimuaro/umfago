import { Pressable, StyleSheet, View } from 'react-native';

import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { formatRupiah } from '@/constants/booking';
import type { PaymentMethodOption } from '@/constants/booking';
import {
  MinTouchTarget,
  Neutral,
  Opacity,
  Overlay,
  Palette,
  Radius,
  Sizes,
  Spacing,
} from '@/constants/design-system';

export type PaymentSelectorProps = {
  method: PaymentMethodOption;
  /** Wallet balance in rupiah. Omit for methods that carry no balance, e.g. cash. */
  balance?: number | null;
  onPress?: () => void;
};

/** Tapping cycles to the next payment method; the design's picker sheet is not built yet. */
export function PaymentSelector({ method, balance, onPress }: PaymentSelectorProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Metode pembayaran: ${method.label}`}
      accessibilityHint="Ketuk untuk mengganti metode pembayaran"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.leading}>
        <View style={styles.disc}>
          <Icon name={method.icon} size={Sizes.iconLg} color={Palette.primary} />
        </View>

        <View>
          <DSText variant="labelMd" color={Neutral.gray900}>
            {method.label}
          </DSText>
          {typeof balance === 'number' ? (
            <DSText variant="bodyXs" color={Neutral.gray500}>
              {formatRupiah(balance)}
            </DSText>
          ) : null}
        </View>
      </View>

      <Icon name="chevron-right" size={Sizes.iconLg} color={Neutral.gray400} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MinTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    borderRadius: Radius.xl,
    backgroundColor: Overlay.surfaceVariantSoft,
    marginBottom: Spacing.lg,
  },
  leading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  disc: {
    width: Sizes.avatar,
    height: Sizes.avatar,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Overlay.primarySoft,
  },
  pressed: {
    opacity: Opacity.pressedSubtle,
  },
});
