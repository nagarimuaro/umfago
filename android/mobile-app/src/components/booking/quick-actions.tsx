import { ScrollView, StyleSheet, Pressable } from 'react-native';

import { DSText } from '@/components/ds/ds-text';
import { Icon, type IconName } from '@/components/ds/icon';
import { Neutral, Opacity, Palette, Radius, Sizes, Spacing } from '@/constants/design-system';

export type QuickAction = {
  id: string;
  label: string;
  icon: IconName;
  /**
   * Keeps the chip drawn as the design specifies while stopping it from firing, so a
   * shortcut whose flow does not exist yet is announced as unavailable rather than
   * silently doing nothing when tapped.
   */
  disabled?: boolean;
};

export type QuickActionsProps = {
  actions: readonly QuickAction[];
  onPress: (id: string) => void;
};

/**
 * Saved-place shortcuts under the route fields: Home / Work / Later. The design draws
 * them as `bg-surface-container-low` chips with a `surface-variant` hairline, scrollable
 * when they overflow narrow screens.
 */
export function QuickActions({ actions, onPress }: QuickActionsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="none">
      {actions.map((action) => (
        <Pressable
          key={action.id}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityState={{ disabled: !!action.disabled }}
          disabled={action.disabled}
          onPress={() => onPress(action.id)}
          style={({ pressed }) => [
            styles.chip,
            pressed && !action.disabled && styles.pressed,
          ]}>
          <Icon
            name={action.icon}
            size={Sizes.iconMd}
            color={action.disabled ? Neutral.gray300 : Neutral.gray500}
          />
          <DSText
            variant="labelMd"
            color={action.disabled ? Neutral.gray300 : Neutral.gray900}>
            {action.label}
          </DSText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingBottom: Spacing.base,
  },
  chip: {
    height: Sizes.quickAction,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.base,
    backgroundColor: Palette.surfaceContainerLow,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Neutral.gray200,
  },
  pressed: {
    opacity: Opacity.pressed,
  },
});
