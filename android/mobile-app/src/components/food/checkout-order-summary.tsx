import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ds/card';
import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { formatRupiah } from '@/constants/booking';
import {
  MinTouchTarget,
  Opacity,
  Palette,
  Radius,
  Sizes,
  Spacing,
} from '@/constants/design-system';
import { FoodCheckoutCopy } from '@/constants/food-checkout';
import type { CartEntry } from '@/lib/cart';

/** `py-3` around a 20pt glyph leaves the button under the 48pt minimum. */
const AddButtonHeight = Sizes.iconMd + Spacing.sm * 2;
const AddSlop = Math.max(0, Math.ceil((MinTouchTarget - AddButtonHeight) / 2));
const AddHitSlop = { top: AddSlop, bottom: AddSlop };

function OrderLine({ entry }: { entry: CartEntry }) {
  const { item, quantity } = entry;

  return (
    <View style={styles.line}>
      <DSText variant="labelMd" color={Palette.onSurfaceVariant} style={styles.quantity}>
        {`${quantity}x`}
      </DSText>

      <View style={styles.thumb}>
        <Image
          source={{ uri: item.image }}
          style={styles.photo}
          contentFit="cover"
          transition={200}
          accessibilityIgnoresInvertColors
        />
      </View>

      <View style={styles.lineText}>
        <DSText variant="bodyMdSemi">{item.name}</DSText>
        <DSText
          variant="labelSm"
          color={Palette.onSurfaceVariant}
          numberOfLines={1}
          style={styles.lineNote}>
          {item.description}
        </DSText>
      </View>

      {/* The design only ever draws a 1x line, so the figure is the line's own total. */}
      <DSText variant="labelBaseSemi">{formatRupiah(item.price * quantity)}</DSText>
    </View>
  );
}

export type CheckoutOrderSummaryProps = {
  merchantName: string;
  entries: readonly CartEntry[];
  onAddMore: () => void;
};

/** What is being ordered, from which store, with a way back to the menu for more. */
export function CheckoutOrderSummary({
  merchantName,
  entries,
  onAddMore,
}: CheckoutOrderSummaryProps) {
  return (
    <Card level={1} radius="md" padding="md">
      <View style={styles.header}>
        <Icon name="storefront" size={Sizes.iconLg} color={Palette.onSurfaceVariant} />
        <DSText variant="headlineSm">{merchantName}</DSText>
      </View>

      <View style={styles.lines}>
        {entries.map((entry) => (
          <OrderLine key={entry.item.id} entry={entry} />
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={FoodCheckoutCopy.addMoreItems}
        onPress={onAddMore}
        hitSlop={AddHitSlop}
        style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
        <Icon name="add-circle" size={Sizes.iconMd} color={Palette.onSurface} />
        <DSText variant="labelMd">{FoodCheckoutCopy.addMoreItems}</DSText>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.surfaceVariant,
  },
  lines: {
    gap: Spacing.md,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  /* `w-6 mt-1` — a fixed 24pt column, dropped to the item name's baseline. */
  quantity: {
    width: Spacing.lg,
    marginTop: Spacing.base,
  },
  thumb: {
    width: Sizes.orderThumb,
    height: Sizes.orderThumb,
    flexShrink: 0,
    borderRadius: Radius.base,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.surfaceVariant,
    backgroundColor: Palette.surfaceContainer,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  lineText: {
    flex: 1,
  },
  lineNote: {
    marginTop: Spacing.base,
  },
  addButton: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.outlineVariant,
  },
  pressed: {
    opacity: Opacity.pressedText,
  },
});
