import { View, StyleSheet, type ViewProps, type ViewStyle } from 'react-native';

import {
  Brand,
  ElevationLevel2,
  Palette,
  Radius,
  ShadowFloating,
  ShadowSoft,
  ShadowXs,
  Spacing,
} from '@/constants/design-system';

export type CardElevation = 'none' | 'xs' | 'soft' | 'floating' | 'level2';

export type CardProps = ViewProps & {
  /**
   * Level 1 is a flat white surface with a hairline stroke.
   * Level 2 adds the diffused floating shadow and drops the stroke.
   */
  level?: 1 | 2;
  /**
   * Overrides the shadow that `level` implies. The Stitch markup uses two shadow
   * utilities (`shadow-soft`, `shadow-floating`) that are distinct from the spec's
   * elevation levels, so surfaces can opt into either.
   */
  elevation?: CardElevation;
  /** Defaults to `Radius.base`; the markup also uses `md` and `lg` on cards. */
  radius?: keyof typeof Radius;
  /** Defaults to `Spacing.md`. Pass `'none'` for cards whose children own the padding. */
  padding?: keyof typeof Spacing | 'none';
  /** Fill color. Defaults to the white level-1/2 surface. */
  background?: string;
};

const shadows: Record<CardElevation, ViewStyle> = {
  none: {},
  xs: ShadowXs,
  soft: ShadowSoft,
  floating: ShadowFloating,
  level2: ElevationLevel2,
};

export function Card({
  level = 1,
  elevation,
  radius = 'base',
  padding = 'md',
  background,
  style,
  ...rest
}: CardProps) {
  return (
    <View
      style={[
        styles.base,
        level === 1 && styles.stroke,
        shadows[elevation ?? (level === 1 ? 'none' : 'level2')],
        {
          borderRadius: Radius[radius],
          padding: padding === 'none' ? 0 : Spacing[padding],
        },
        background ? { backgroundColor: background } : null,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Palette.surfaceContainerLowest,
  },
  stroke: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.cardStroke,
  },
});
