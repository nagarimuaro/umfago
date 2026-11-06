import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ds/card';
import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { CheckoutTextButton } from '@/components/food/checkout-text-button';
import { formatRupiah } from '@/constants/booking';
import { Palette, Radius, Sizes, Spacing } from '@/constants/design-system';
import { FoodCheckoutCopy } from '@/constants/food-checkout';

export type CheckoutPaymentCardProps = {
  /** Wallet balance in rupiah, drawn as "Balance: Rp85.000". */
  balance: number;
  /** Absent while no payment picker exists, which draws "Change" disabled. */
  onChange?: () => void;
};

/** How the order is paid: the wallet, its balance, and a way to switch method. */
export function CheckoutPaymentCard({ balance, onChange }: CheckoutPaymentCardProps) {
  return (
    <Card level={1} radius="md" padding="md">
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={styles.badge}>
            <Icon name="account-balance-wallet" size={Sizes.iconMd} color={Palette.onSurface} />
          </View>

          <View style={styles.text}>
            <DSText variant="labelSm" color={Palette.onSurfaceVariant}>
              {FoodCheckoutCopy.paymentTitle}
            </DSText>
            <DSText variant="bodyMdSemi">{FoodCheckoutCopy.paymentName}</DSText>
            <DSText variant="labelSm" color={Palette.primary}>
              {`${FoodCheckoutCopy.balanceLabel}: ${formatRupiah(balance)}`}
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
  text: {
    flex: 1,
  },
});
