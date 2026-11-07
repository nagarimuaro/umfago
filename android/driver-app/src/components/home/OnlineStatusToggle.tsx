import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors, rounded, spacing } from '../../constants/theme';
import { useDriver } from '../../hooks/use-driver';
import { SurgeArea } from '../../types/driver';

interface OnlineStatusToggleProps {
  surge?: SurgeArea | null;
  onPressSurge?: (surge: SurgeArea) => void;
}

export const OnlineStatusToggle: React.FC<OnlineStatusToggleProps> = ({
  surge,
  onPressSurge,
}) => {
  const { isOnline, toggleOnline, currentOrder, surgeAreas } = useDriver();

  const activeSurge = surge ?? surgeAreas[0];

  return (
    <View style={styles.container}>
      {/* Left Content Area */}
      {isOnline ? (
        // When Online: Replace "Siap Terima Order" with Area Ramai Surge Hotspot Info
        <TouchableOpacity
          style={styles.surgeGroup}
          activeOpacity={0.7}
          onPress={() => activeSurge && onPressSurge?.(activeSurge)}
          disabled={!onPressSurge || !activeSurge}
        >
          <View style={styles.iconCircle}>
            <MaterialIcons name="local-fire-department" size={20} color={colors.primary} />
          </View>

          <View style={styles.textGroup}>
            <View style={styles.badgeRow}>
              <Text style={styles.labelTitle}>Area Ramai</Text>
              {activeSurge?.multiplier && (
                <View style={styles.multiplierPill}>
                  <Text style={styles.multiplierText}>{activeSurge.multiplier}x</Text>
                </View>
              )}
            </View>
            <Text style={styles.areaName} numberOfLines={1}>
              {activeSurge?.name ?? 'Grand Indonesia & Sudirman'}
            </Text>
          </View>

          {onPressSurge && activeSurge && (
            <View style={styles.navigateBtn}>
              <Ionicons name="navigate-outline" size={16} color={colors.primary} />
            </View>
          )}
        </TouchableOpacity>
      ) : (
        // When Offline: Clean Driver Istirahat Status
        <View style={styles.offlineGroup}>
          <View style={styles.offlineIconCircle}>
            <Ionicons name="moon" size={16} color={colors.textSecondary} />
          </View>
          <View style={styles.textGroup}>
            <Text style={styles.offlineLabel}>Status Driver</Text>
            <Text style={styles.offlineSub} numberOfLines={1}>
              Driver Sedang Istirahat
            </Text>
          </View>
        </View>
      )}

      {/* Subtle Divider */}
      <View style={styles.divider} />

      {/* Right Quick Toggle Switch Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={toggleOnline}
        disabled={!!currentOrder}
        style={[
          styles.toggleBtn,
          {
            backgroundColor: isOnline ? 'rgba(200, 255, 0, 0.12)' : colors.surfaceLow,
            borderColor: isOnline ? colors.primary : colors.outline,
          },
        ]}
      >
        <Text
          style={[
            styles.toggleText,
            { color: isOnline ? colors.primary : colors.textSecondary },
          ]}
        >
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </Text>
        <Ionicons
          name={isOnline ? 'toggle' : 'toggle-outline'}
          size={22}
          color={isOnline ? colors.primary : colors.offline}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(27, 28, 28, 0.96)',
    borderRadius: rounded.lg,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.outline,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  surgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
    gap: spacing.sm,
  },
  offlineGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2A2B27',
    borderWidth: 1,
    borderColor: '#3A3D2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E2020',
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: {
    flex: 1,
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  labelTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
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
    fontWeight: '800',
  },
  areaName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.2,
  },
  offlineLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  offlineSub: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  navigateBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(200, 255, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(200, 255, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: colors.outline,
    marginRight: spacing.sm,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: rounded.full,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
