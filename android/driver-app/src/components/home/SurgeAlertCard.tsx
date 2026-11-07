import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { colors, rounded, spacing } from '../../constants/theme';
import { SurgeArea } from '../../types/driver';

interface SurgeAlertCardProps {
  surge: SurgeArea;
  onPressNavigate?: (surge: SurgeArea) => void;
}

export const SurgeAlertCard: React.FC<SurgeAlertCardProps> = ({ surge, onPressNavigate }) => {
  return (
    <View style={styles.card}>
      <View style={styles.leftContent}>
        <View style={styles.iconCircle}>
          <MaterialIcons name="local-fire-department" size={22} color={colors.primary} />
        </View>
        <View style={styles.textGroup}>
          <View style={styles.badgeRow}>
            <Text style={styles.labelTitle}>Area Ramai</Text>
            <View style={styles.multiplierPill}>
              <Text style={styles.multiplierText}>{surge.multiplier}x</Text>
            </View>
          </View>
          <Text style={styles.areaName} numberOfLines={1}>
            {surge.name}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPressNavigate?.(surge)}
        style={styles.navigateBtn}
      >
        <Ionicons name="navigate-outline" size={18} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(27, 28, 28, 0.95)',
    borderRadius: rounded.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.outline,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    marginRight: spacing.sm,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2A2B27',
    borderWidth: 1,
    borderColor: '#3A3D2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  labelTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  multiplierPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: rounded.full,
  },
  multiplierText: {
    color: '#161F00',
    fontSize: 10,
    fontWeight: '900',
  },
  areaName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  navigateBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

