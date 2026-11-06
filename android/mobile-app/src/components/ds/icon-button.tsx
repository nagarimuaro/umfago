import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { Icon, type IconName } from './icon';

import { MinTouchTarget, Opacity, Palette, Radius, Sizes } from '@/constants/design-system';

export type IconButtonShape = 'circle' | 'rounded';

export type IconButtonProps = {
  icon: IconName;
  /** Required: an icon-only control has no visible text to announce. */
  accessibilityLabel: string;
  onPress?: () => void;
  size?: number;
  color?: string;
  background?: string;
  shape?: IconButtonShape;
  /**
   * Visible box size. Anything under the spec's 48pt minimum keeps its drawn size and
   * makes up the difference with `hitSlop`, so the design stays accurate while the tap
   * area does not shrink.
   */
  box?: number;
  /**
   * Marks the control as unavailable. It keeps its drawn size and colour so the layout
   * stays faithful to the design, but it no longer fires and assistive technology
   * announces it as disabled instead of implying an action that cannot happen.
   */
  disabled?: boolean;
  style?: ViewStyle;
};

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  size = Sizes.iconLg,
  color = Palette.onSurface,
  background,
  shape = 'circle',
  box,
  disabled = false,
  style,
}: IconButtonProps) {
  const visible = box ?? MinTouchTarget;
  const slop = Math.max(0, Math.ceil((MinTouchTarget - visible) / 2));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={slop || undefined}
      style={({ pressed }) => [
        styles.base,
        {
          width: visible,
          height: visible,
          borderRadius: shape === 'circle' ? Radius.full : Radius.base,
        },
        background ? { backgroundColor: background } : null,
        pressed && styles.pressed,
        style,
      ]}>
      <Icon name={icon} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pressed: {
    opacity: Opacity.pressedText,
  },
});
