import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ds/card';
import { DSText } from '@/components/ds/ds-text';
import { formatRupiah } from '@/constants/booking';
import { Palette, Spacing } from '@/constants/design-system';
import { FoodCheckoutCopy } from '@/constants/food-checkout';
import type { FoodOrderCharges } from '@/types/food';

/** "Subtotal (1 item)" / "Subtotal (2 items)" — the design writes the count inline. */
function subtotalLabel(itemCount: number): string {
  const pieces = itemCount === 1 ? '1 item' : `${itemCount} items`;

  return `${FoodCheckoutCopy.subtotal} (${pieces})`;
}

function ChargeRow({ label, amount }: { label: string; amount: number }) {
  return (
    <View style={styles.row}>
      <DSText variant="bodySmMedium" color={Palette.onSurfaceVariant}>
        {label}
      </DSText>
      <DSText variant="labelBase">{formatRupiah(amount)}</DSText>
    </View>
  );
}

export type CheckoutChargesProps = {
  charges: FoodOrderCharges;
};

/** The Payment Summary card: three charge lines over the ruled grand total. */
export function CheckoutCharges({ charges }: CheckoutChargesProps) {
  return (
    <Card level={1} radius="md" padding="md">
      <DSText variant="bodyMdSemi" style={styles.title}>
        {FoodCheckoutCopy.summaryTitle}
      </DSText>

      <View style={styles.lines}>
        <ChargeRow label={subtotalLabel(charges.itemCount)} amount={charges.subtotal} />
        <ChargeRow label={FoodCheckoutCopy.deliveryFee} amount={charges.delivery} />
        <ChargeRow label={FoodCheckoutCopy.serviceFee} amount={charges.service} />
      </View>

      <View style={styles.total}>
        <DSText variant="bodyMdSemi">{FoodCheckoutCopy.totalPayment}</DSText>
        <DSText variant="priceHeadline">{formatRupiah(charges.total)}</DSText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.sm,
  },
  lines: {
    gap: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  /* `border-t my-3 pt-3` — the rule sits a gutter clear of the lines above and below. */
  total: {
    marginVertical: Spacing.sm,
    paddingTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.surfaceVariant,
  },
});
