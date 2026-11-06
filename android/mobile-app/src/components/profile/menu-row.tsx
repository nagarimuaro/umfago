import { Pressable, StyleSheet, View } from 'react-native';

import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { MinTouchTarget, Opacity, Palette, Sizes, Spacing } from '@/constants/design-system';
import type { ProfileMenuItem } from '@/constants/profile';

type Props = {
  item: ProfileMenuItem;
  /** Suppresses the hairline under the last row inside the menu card. */
  isLast?: boolean;
  onPress?: () => void;
};

/**
 * One row of the profile screen's menu card.
 *
 * The design draws a chevron on every row. None of these destinations exist yet, so a
 * row without `onPress` keeps the chevron for visual fidelity but stays a plain view:
 * it is never announced as a button, so assistive technology does not offer an action
 * that cannot happen.
 */
export function MenuRow({ item, isLast = false, onPress }: Props) {
  const content = (
    <>
      <View style={styles.leading}>
        <Icon name={item.icon} size={Sizes.iconLg} color={Palette.onSurfaceVariant} />
        <DSText>{item.label}</DSText>
      </View>
      <Icon name="chevron-right" size={Sizes.iconLg} color={Palette.surfaceDim} />
    </>
  );

  const rowStyle = [styles.row, !isLast && styles.divider];

  if (!onPress) {
    return <View style={rowStyle}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      onPress={onPress}
      style={({ pressed }) => [rowStyle, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MinTouchTarget,
    padding: Spacing.md,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.surfaceContainer,
  },
  leading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flexShrink: 1,
  },
  pressed: {
    opacity: Opacity.pressed,
  },
});