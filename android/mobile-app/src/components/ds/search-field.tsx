import { Pressable, StyleSheet } from 'react-native';

import { DSText } from './ds-text';
import { Icon } from './icon';

import {
  Brand,
  MinTouchTarget,
  Opacity,
  Palette,
  Radius,
  Sizes,
  Spacing,
} from '@/constants/design-system';

/**
 * Read-only search affordance. Tapping it opens the destination screen rather than
 * focusing an inline input, so the home screen never owns keyboard state.
 */
export function SearchField({
  placeholder,
  onPress,
}: {
  placeholder: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="search"
      accessibilityLabel={placeholder}
      onPress={onPress}
      style={({ pressed }) => [styles.field, pressed && styles.pressed]}>
      <Icon name="search" size={Sizes.iconMd} color={Palette.onSurfaceVariant} />
      <DSText variant="bodyMd" color={Palette.secondary}>
        {placeholder}
      </DSText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: MinTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.cardStroke,
    backgroundColor: Palette.surfaceContainerLow,
  },
  pressed: {
    opacity: Opacity.pressed,
  },
});
