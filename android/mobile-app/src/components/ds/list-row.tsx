import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { DSText } from './ds-text';

import { Brand, MinTouchTarget, Opacity, Palette, Sizes, Spacing } from '@/constants/design-system';

export type ListRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  /** Right-aligned value such as a formatted amount. Sits before the chevron. */
  trailing?: string;
  /** Draws a hairline divider above the row. Skip it on the first row of a group. */
  divider?: boolean;
  /**
   * Omit to render a static row. Without a handler the row is neither focusable nor
   * announced as a button, and the drill-down chevron is hidden, so the affordance
   * never promises an interaction the screen cannot deliver.
   */
  onPress?: () => void;
};

/** Drill-down list row: 24px leading icon, 16px vertical padding, trailing chevron. */
export function ListRow({ icon, title, subtitle, trailing, divider = false, onPress }: ListRowProps) {
  const content = (
    <>
      <Ionicons name={icon} size={Sizes.iconLg} color={Palette.onSurfaceVariant} />
      <View style={styles.text}>
        <DSText variant="bodyMd">{title}</DSText>
        {subtitle ? (
          <DSText variant="labelMd" color={Palette.secondary}>
            {subtitle}
          </DSText>
        ) : null}
      </View>
      {trailing ? <DSText variant="labelMd">{trailing}</DSText> : null}
      {onPress ? (
        <Ionicons name="chevron-forward" size={Sizes.iconMd} color={Palette.outline} />
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={[styles.row, divider && styles.divider]}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, divider && styles.divider, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MinTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.cardStroke,
  },
  text: {
    flex: 1,
    gap: Spacing.hair,
  },
  pressed: {
    opacity: Opacity.pressedText,
  },
});
