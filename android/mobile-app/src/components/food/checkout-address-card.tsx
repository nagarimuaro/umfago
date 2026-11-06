import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ds/card';
import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { CheckoutTextButton } from '@/components/food/checkout-text-button';
import { Palette, Radius, Sizes, Spacing } from '@/constants/design-system';
import { FoodCheckoutCopy } from '@/constants/food-checkout';
import type { FoodAddress } from '@/types/food';

export type CheckoutAddressCardProps = {
  address: FoodAddress;
  onEdit: () => void;
};

/**
 * Where the order is going: a pin, the address, its courier note, and an Edit button that
 * opens the select-address screen.
 *
 * The design writes the street and the district as two lines separated by a `<br>`, so
 * they are joined into one text node rather than stacked — that keeps the line spacing
 * consistent between them and lets a long street wrap into the district line's column.
 */
export function CheckoutAddressCard({ address, onEdit }: CheckoutAddressCardProps) {
  const lines = [address.address, address.area].filter(Boolean).join('\n');

  return (
    <Card level={1} radius="md" padding="md">
      <View style={styles.row}>
        <View style={styles.left}>
          {/* The pin's own `mt-1` drops it to the heading's cap height. */}
          <View style={styles.pin}>
            <Icon name="location-on" size={Sizes.iconLg} color={Palette.primary} />
          </View>

          <View style={styles.text}>
            <DSText variant="headlineXsSemi" style={styles.heading}>
              {FoodCheckoutCopy.addressTitle}
            </DSText>
            <DSText variant="bodyMdSemi">{address.label}</DSText>

            {lines ? (
              <DSText variant="bodySmMedium" color={Palette.onSurfaceVariant} style={styles.lines}>
                {lines}
              </DSText>
            ) : null}

            {address.note ? (
              <View style={styles.note}>
                <Icon name="edit-note" size={Sizes.iconSm} color={Palette.onSurfaceVariant} />
                <DSText variant="labelSm" color={Palette.onSurfaceVariant}>
                  {`${FoodCheckoutCopy.notePrefix} ${address.note}`}
                </DSText>
              </View>
            ) : null}
          </View>
        </View>

        <CheckoutTextButton label={FoodCheckoutCopy.edit} onPress={onEdit} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pin: {
    marginTop: Spacing.base,
  },
  text: {
    flex: 1,
  },
  heading: {
    marginBottom: Spacing.base,
  },
  lines: {
    marginTop: Spacing.base,
  },
  /* `inline-flex` — the chip hugs its text instead of filling the column. */
  note: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.base,
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: Radius.tiny,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.surfaceVariant,
  },
});
