import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, rounded, spacing } from '../../constants/theme';

interface DsBadgeProps {
  label: string;
  variant?: 'lime' | 'surge' | 'neutral' | 'success' | 'warning' | 'danger';
  style?: ViewStyle;
}

export const DsBadge: React.FC<DsBadgeProps> = ({ label, variant = 'lime', style }) => {
  const getBadgeStyle = () => {
    switch (variant) {
      case 'lime':
        return { bg: colors.primary, text: colors.black, border: 'transparent' };
      case 'surge':
        return { bg: '#3D1515', text: '#FF5252', border: '#7A2222' };
      case 'success':
        return { bg: '#162A14', text: colors.primary, border: '#23581E' };
      case 'warning':
        return { bg: '#332700', text: '#FFD54F', border: '#664E00' };
      case 'danger':
        return { bg: '#3A1414', text: '#FF8A80', border: '#7A1C1C' };
      default:
        return { bg: colors.surfaceHigh, text: colors.onSurfaceVariant, border: colors.borderCard };
    }
  };

  const current = getBadgeStyle();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: current.bg, borderColor: current.border, borderWidth: current.border !== 'transparent' ? 1 : 0 },
        style,
      ]}
    >
      <Text style={[styles.text, { color: current.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
