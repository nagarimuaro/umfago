import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, rounded, spacing } from '../../constants/theme';

interface DsCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'container' | 'low' | 'high';
}

export const DsCard: React.FC<DsCardProps> = ({ children, style, variant = 'container' }) => {
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
};

const styles = StyleSheet.create({
  card: {
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: spacing.lg,
  },
});
