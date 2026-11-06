import { Pressable, StyleSheet, View, type PressableProps, type ViewStyle } from 'react-native';

import { DSText } from './ds-text';
import { Icon, type IconName } from './icon';

import {
  Brand,
  FontFamily,
  MinTouchTarget,
  Neutral,
  Opacity,
  Palette,
  Radius,
  Sizes,
  Spacing,
} from '@/constants/design-system';

export type ButtonVariant = 'primary' | 'secondary' | 'surface' | 'ghost' | 'dark' | 'danger';

/**
 * `md` fills the spec's 48pt minimum touch target. `sm` matches the compact chips in
 * the Stitch markup and reaches 48pt through `hitSlop` instead of visible height, so
 * the design stays pixel-accurate without shrinking the tap area. `lg` is the
 * full-width confirm button on the booking sheet, `h-14 rounded-xl`.
 */
export type ButtonSize = 'md' | 'sm' | 'lg';

export type ButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  style?: ViewStyle;
};

const fills: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: Brand.ctaAction },
  secondary: { backgroundColor: Brand.ink },
  surface: { backgroundColor: Palette.surfaceContainerLowest },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.cardStroke,
  },
  /**
   * `bg-gray-900` on the booking sheet. Distinct from `secondary` (`Brand.ink`, which
   * is lime-tinted) because the booking screens sit on the untinted Neutral ramp.
   */
  dark: { backgroundColor: Neutral.gray900 },
  /**
   * Destructive action drawn as an outline, `border border-error-container text-error`
   * on the profile screen's log-out control.
   */
  danger: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.errorContainer,
  },
};

const foregrounds: Record<ButtonVariant, string> = {
  primary: Brand.ctaOnAction,
  secondary: Palette.onPrimary,
  surface: Palette.onBackground,
  ghost: Palette.onSurface,
  dark: Palette.onPrimary,
  danger: Palette.error,
};

/** Grows the `sm` hit rectangle from its ~34pt visual height up to the 48pt minimum. */
const SmallHitSlop = Spacing.xs;

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const fg = foregrounds[variant];
  const small = size === 'sm';
  const large = size === 'lg';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={small ? SmallHitSlop : undefined}
      style={({ pressed }) => [
        styles.base,
        large ? styles.sizeLg : small ? styles.sizeSm : styles.sizeMd,
        fills[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}>
      {icon ? (
        <View style={styles.icon}>
          <Icon name={icon} size={small ? Sizes.iconBase : Sizes.iconMd} color={fg} />
        </View>
      ) : null}
      <DSText
        variant={large ? 'bodyLg' : small ? 'labelMd' : 'bodyMd'}
        color={fg}
        style={large ? styles.labelLg : small ? styles.labelSm : styles.label}>
        {label}
      </DSText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    borderRadius: Radius.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeMd: {
    minHeight: MinTouchTarget,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sizeSm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.pill,
  },
  sizeLg: {
    height: Sizes.ctaHeight,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.xl,
  },
  icon: {
    marginRight: Spacing.xs,
  },
  label: {
    fontFamily: FontFamily.bodySemi,
  },
  labelSm: {
    fontFamily: FontFamily.bodySemi,
  },
  labelLg: {
    fontFamily: FontFamily.headline,
  },
  pressed: {
    opacity: Opacity.pressedSubtle,
  },
  disabled: {
    opacity: 0.4,
  },
});
