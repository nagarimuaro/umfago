import type { ReactNode } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors, rounded, spacing } from '../../constants/theme';

interface DsCardProps {
  children: ReactNode;
  style?: ViewStyle;
  variant?: 'container' | 'low' | 'high';
}

export function DsCard({ children, style, variant = 'container' }: DsCardProps) {
  const getBgColor = () => {
    switch (variant) {
      case 'low':
        return colors.surfaceLow;
      case 'high':
        return colors.surfaceHigh;
      default:
        return colors.surfaceContainer;
    }
  };

  return <View style={[styles.card, { backgroundColor: getBgColor() }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: spacing.lg,
  },
});
