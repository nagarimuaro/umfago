import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { DSText } from './ds-text';

import { Brand, MinTouchTarget, Palette, Radius, Spacing } from '@/constants/design-system';

export type ServiceChipProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress?: () => void;
};

/** Horizontal-scroll ride option chip. Active state: ink border + subtle tint. */
export function ServiceChip({ icon, label, active = false, onPress }: ServiceChipProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active ? styles.active : styles.inactive,
        pressed && styles.pressed,
      ]}>
      <Ionicons name={icon} size={20} color={active ? Brand.ink : Palette.onSurfaceVariant} />
      <DSText variant="labelMd" color={active ? Brand.ink : Palette.onSurface}>
        {label}
      </DSText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: MinTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.base,
    borderWidth: 1,
  },
  active: {
    borderColor: Brand.ink,
    backgroundColor: Palette.surfaceContainerHigh,
  },
  inactive: {
    borderColor: Brand.cardStroke,
    backgroundColor: Palette.surfaceContainerLowest,
  },
  pressed: {
    opacity: 0.7,
  },
});
