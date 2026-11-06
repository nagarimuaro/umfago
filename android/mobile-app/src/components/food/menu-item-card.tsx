import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ds/card';
import { DSText } from '@/components/ds/ds-text';
import { IconButton } from '@/components/ds/icon-button';
import { Pill } from '@/components/ds/pill';
import { QuantityStepper } from '@/components/food/quantity-stepper';
import { formatRupiah } from '@/constants/booking';
import { Palette, Radius, Sizes, Spacing } from '@/constants/design-system';
import type { FoodMenuItem } from '@/types/food';

export type MenuItemCardProps = {
  item: FoodMenuItem;
  /** 0 renders the add button; anything higher renders the stepper. */
  quantity: number;
  onChangeQuantity: (quantity: number) => void;
};

/**
 * One row of the menu: the item's name, its optional label, a two-line description, the
 * price, and the control that puts it in the cart.
 *
 * The design marks the whole card as clickable but specifies no item detail screen, so the
 * card itself is not pressable — only its add control is.
 */
export function MenuItemCard({ item, quantity, onChangeQuantity }: MenuItemCardProps) {
  return (
    <Card level={1} elevation="xs" radius="base" padding="md" style={styles.card}>
      <View style={styles.body}>
        <View>
          <View style={[styles.nameRow, item.tag ? styles.nameRowTagged : null]}>
            <DSText variant="headlineBaseSemi" style={styles.name}>
              {item.name}
            </DSText>
            {item.tag ? <Pill label={item.tag} tone="accent" radius="sm" paddingX="xs" /> : null}
          </View>

          <DSText
            variant="bodySm"
            color={Palette.onSurfaceVariant}
            numberOfLines={2}
            style={styles.description}>
            {item.description}
          </DSText>
        </View>

        <View style={styles.priceRow}>
          <DSText variant="priceLabel">{formatRupiah(item.price)}</DSText>

          {quantity === 0 ? (
            <IconButton
              icon="add"
              accessibilityLabel={`Add ${item.name} to the cart`}
              box={Sizes.buttonCircle}
              size={Sizes.iconXs}
              color={Palette.onPrimaryContainer}
              background={Palette.primaryContainer}
              onPress={() => onChangeQuantity(1)}
            />
          ) : (
            <QuantityStepper
              quantity={quantity}
              itemName={item.name}
              onChange={onChangeQuantity}
            />
          )}
        </View>
      </View>

      <View style={styles.thumb}>
        <Image
          source={{ uri: item.image }}
          style={styles.photo}
          contentFit="cover"
          transition={200}
          accessibilityIgnoresInvertColors
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  /* `justify-between` pins the price row to the bottom of the taller of the two columns. */
  body: {
    flex: 1,
    justifyContent: 'space-between',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  /* The design only spaces the name from the description when a label sits beside it. */
  nameRowTagged: {
    marginBottom: Spacing.base,
  },
  name: {
    flexShrink: 1,
  },
  description: {
    marginTop: Spacing.base,
  },
  priceRow: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  thumb: {
    width: Sizes.menuThumb,
    height: Sizes.menuThumb,
    flexShrink: 0,
    borderRadius: Radius.base,
    overflow: 'hidden',
    backgroundColor: Palette.surfaceContainer,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
});
