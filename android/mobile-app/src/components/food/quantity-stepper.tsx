import { StyleSheet, View } from 'react-native';

import { DSText } from '@/components/ds/ds-text';
import { IconButton } from '@/components/ds/icon-button';
import { Palette, Radius, Sizes, Spacing } from '@/constants/design-system';

export type QuantityStepperProps = {
  quantity: number;
  /** Item name, so each glyph announces what it changes. */
  itemName: string;
  onChange: (quantity: number) => void;
};

/**
 * The minus / count / plus control that replaces the add button once an item is in the
 * cart. The design draws the two glyphs bare, without a button box, so they keep their
 * 14pt size and reach the spec's 48pt target through the hit slop `IconButton` adds.
 */
export function QuantityStepper({ quantity, itemName, onChange }: QuantityStepperProps) {
  return (
    <View style={styles.stepper}>
      <IconButton
        icon="remove"
        accessibilityLabel={`Remove one ${itemName}`}
        box={Sizes.iconXs}
        size={Sizes.iconXs}
        onPress={() => onChange(quantity - 1)}
      />

      <DSText variant="priceLabel">{quantity}</DSText>

      <IconButton
        icon="add"
        accessibilityLabel={`Add one more ${itemName}`}
        box={Sizes.iconXs}
        size={Sizes.iconXs}
        color={Palette.primary}
        onPress={() => onChange(quantity + 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.base,
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radius.full,
  },
});
