import { Pressable, StyleSheet, View } from 'react-native';

import { DSText } from '@/components/ds/ds-text';
import { FontFamily, MinTouchTarget, Opacity, Palette, Spacing } from '@/constants/design-system';

/** Grows the text-only action up to the spec's 48pt minimum tap target. */
const ActionHitSlop = Spacing.sm;

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.header}>
      <DSText variant="headlineMd" style={styles.title}>
        {title}
      </DSText>
      {actionLabel ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel} ${title}`}
          onPress={onAction}
          hitSlop={ActionHitSlop}
          style={({ pressed }) => pressed && styles.pressed}>
          <DSText variant="labelMd" color={Palette.primary} style={styles.action}>
            {actionLabel}
          </DSText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MinTouchTarget - Spacing.md,
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.headline,
  },
  action: {
    fontFamily: FontFamily.bodySemi,
  },
  pressed: {
    opacity: Opacity.pressedText,
  },
});
