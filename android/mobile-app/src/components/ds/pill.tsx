import { StyleSheet, View } from 'react-native';

import { DSText } from './ds-text';
import { Icon, type IconName } from './icon';

import { FontFamily, Overlay, Palette, Radius, Sizes, Spacing } from '@/constants/design-system';

export type PillTone =
  | 'success'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'surface'
  | 'onDark'
  | 'accent';

/** Semantic accents are reserved for status, per the spec. */
const tones: Record<PillTone, { bg: string; fg: string }> = {
  success: { bg: '#e3f6d4', fg: '#3b4d00' },
  warning: { bg: '#ffeccc', fg: '#7a4b00' },
  info: { bg: Palette.tertiaryContainer, fg: Palette.onTertiaryFixedVariant },
  neutral: { bg: Palette.surfaceContainerHigh, fg: Palette.onSurface },
  /** Opaque white chip that floats over imagery, e.g. the restaurant rating badge. */
  surface: { bg: Palette.surfaceContainerLowest, fg: Palette.onSurface },
  /** Translucent chip over a saturated fill, e.g. the "New Users" promo badge. */
  onDark: { bg: Overlay.onDarkStrong, fg: Palette.onPrimary },
  /** `bg-primary-container` label beside a menu item's name, e.g. "Popular". */
  accent: { bg: Palette.primaryContainer, fg: Palette.onPrimaryContainer },
};

export type PillProps = {
  label: string;
  tone?: PillTone;
  /** Leading glyph, tinted independently of the label when `iconColor` is given. */
  icon?: IconName;
  iconColor?: string;
  /** `true` renders the markup's 10px uppercase badge label instead of label-sm. */
  compact?: boolean;
  /**
   * Defaults to the fully rounded chip. The food category screen's rating badge is
   * drawn `rounded-sm` instead, so the corner is overridable.
   */
  radius?: keyof typeof Radius;
  /**
   * Horizontal padding. Defaults to the markup's usual `px-1.5`; the store screen's
   * "Popular" badge is drawn `px-2`.
   */
  paddingX?: keyof typeof Spacing;
};

export function Pill({
  label,
  tone = 'neutral',
  icon,
  iconColor,
  compact = false,
  radius = 'full',
  paddingX,
}: PillProps) {
  const { bg, fg } = tones[tone];

  return (
    <View
      style={[
        styles.pill,
        compact && styles.pillCompact,
        { backgroundColor: bg, borderRadius: Radius[radius] },
        paddingX ? { paddingHorizontal: Spacing[paddingX] } : null,
      ]}>
      {icon ? <Icon name={icon} size={Sizes.iconSm - 4} color={iconColor ?? fg} /> : null}
      <DSText variant={compact ? 'labelXs' : 'labelSm'} color={fg} style={styles.label}>
        {compact ? label.toUpperCase() : label}
      </DSText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.hair,
    paddingHorizontal: Spacing.tight,
    paddingVertical: Spacing.hair,
  },
  pillCompact: {
    paddingHorizontal: Spacing.xs,
  },
  label: {
    fontFamily: FontFamily.headline,
  },
});
