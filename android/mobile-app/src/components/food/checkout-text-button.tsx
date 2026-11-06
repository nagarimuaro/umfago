import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { DSText } from '@/components/ds/ds-text';
import {
  MinTouchTarget,
  Opacity,
  Palette,
  Radius,
  Spacing,
  Typography,
} from '@/constants/design-system';

/**
 * The checkout screen draws its two small text buttons as `py-1 px-2 rounded`, which is
 * 28pt tall — under the spec's 48pt minimum, so the difference is made up with `hitSlop`
 * the way `IconButton` does it.
 */
const BoxHeight = Typography.labelMd.lineHeight + Spacing.base * 2;
const Slop = Math.max(0, Math.ceil((MinTouchTarget - BoxHeight) / 2));
const ButtonHitSlop = { top: Slop, bottom: Slop };

export type CheckoutTextButtonProps = {
  label: string;
  /** Absent while the action has no destination, which draws the button disabled. */
  onPress?: () => void;
  color?: string;
  /** The "Change" button carries an outline; "Edit" does not. */
  isOutlined?: boolean;
  style?: ViewStyle;
};

/** A compact label-sized text button, `text-label-md font-semibold py-1 px-2 rounded`. */
export function CheckoutTextButton({
  label,
  onPress,
  color = Palette.primary,
  isOutlined = false,
  style,
}: CheckoutTextButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !onPress }}
      disabled={!onPress}
      onPress={onPress}
      hitSlop={ButtonHitSlop}
      style={({ pressed }) => [
        styles.base,
        isOutlined && styles.outlined,
        pressed && styles.pressed,
        style,
      ]}>
      <DSText variant="labelMd" color={color}>
        {label}
      </DSText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.sm,
  },
  outlined: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.outlineVariant,
  },
  pressed: {
    opacity: Opacity.pressedText,
  },
});
