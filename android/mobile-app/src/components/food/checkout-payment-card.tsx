import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ds/card';
import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { CheckoutTextButton } from '@/components/food/checkout-text-button';
import { formatRupiah } from '@/constants/booking';
import { Palette, Radius, Sizes, Spacing } from '@/constants/design-system';
import { FoodCheckoutCopy } from '@/constants/food-checkout';

export type CheckoutPaymentCardProps = {
  paymentMethod?: 'wallet' | 'cash';
  /** Wallet balance in rupiah, drawn as "Balance: Rp85.000". */
  balance: number;
  /** Absent while no payment picker exists, which draws "Change" disabled. */
  onChange?: () => void;
};

/** How the order is paid: the wallet or cash, and a way to switch method. */
export function CheckoutPaymentCard({
  paymentMethod = 'wallet',
  balance,
  onChange,
}: CheckoutPaymentCardProps) {
  const isCash = paymentMethod === 'cash';

  return (
    <Card level={1} radius="md" padding="md">
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={[styles.badge, isCash && styles.cashBadge]}>
            <Icon
              name={isCash ? 'payments' : 'account-balance-wallet'}
              size={Sizes.iconMd}
              color={isCash ? '#b45309' : Palette.onSurface}
            />
          </View>

          <View style={styles.text}>
            <DSText variant="labelSm" color={Palette.onSurfaceVariant}>
              {FoodCheckoutCopy.paymentTitle}
            </DSText>
            <DSText variant="bodyMdSemi">
              {isCash ? 'Tunai (Cash)' : FoodCheckoutCopy.paymentName}
            </DSText>
            <DSText
              variant="labelSm"
              color={isCash ? Palette.onSurfaceVariant : Palette.primary}>
              {isCash
                ? 'Bayar langsung ke kurir saat makanan tiba'
                : `${FoodCheckoutCopy.balanceLabel}: ${formatRupiah(balance)}`}
            </DSText>
          </View>
        </View>

        <CheckoutTextButton
          label={FoodCheckoutCopy.change}
          onPress={onChange}
          color={Palette.onSurface}
          isOutlined
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  badge: {
    width: Sizes.avatar,
    height: Sizes.avatar,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: Palette.primaryContainer,
  },
  cashBadge: {
    backgroundColor: '#fef3c7',
  },
  text: {
    flex: 1,
  },
});
