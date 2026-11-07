import type { ReactNode } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { colors, rounded, spacing } from '../../constants/theme';

interface DsButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function DsButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}: DsButtonProps) {
  const getContainerStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryBtn;
      case 'secondary':
        return styles.secondaryBtn;
      case 'danger':
        return styles.dangerBtn;
      case 'ghost':
        return styles.ghostBtn;
      default:
        return styles.primaryBtn;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryText;
      case 'secondary':
        return styles.secondaryText;
      case 'danger':
        return styles.dangerText;
      case 'ghost':
        return styles.ghostText;
      default:
        return styles.primaryText;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return styles.sizeSm;
      case 'lg':
        return styles.sizeLg;
      default:
        return styles.sizeMd;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.baseBtn, getContainerStyle(), getSizeStyle(), disabled && styles.disabledBtn, style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.black : colors.primary} />
      ) : (
        <>
          {icon}
          <Text style={[styles.baseText, getTextStyle(), textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  baseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rounded.full,
    gap: spacing.sm,
  },
  sizeSm: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  sizeMd: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  sizeLg: {
    paddingVertical: 18,
    paddingHorizontal: 28,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
  },
  primaryText: {
    color: colors.black,
    fontWeight: '800',
  },
  secondaryBtn: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  secondaryText: {
    color: colors.white,
    fontWeight: '600',
  },
  dangerBtn: {
    backgroundColor: '#351010',
    borderWidth: 1,
    borderColor: '#7A1C1C',
  },
  dangerText: {
    color: '#FF8A80',
    fontWeight: '700',
  },
  ghostBtn: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  baseText: {
    fontSize: 15,
    letterSpacing: 0.2,
  },
  disabledBtn: {
    opacity: 0.45,
  },
});
