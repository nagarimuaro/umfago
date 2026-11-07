import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, rounded } from '../../constants/theme';
import { useDriver } from '../../hooks/use-driver';

interface DriverHeaderProps {
  onPressProfile?: () => void;
  onPressNotification?: () => void;
  onPressEmergency?: () => void;
}

export const DriverHeader: React.FC<DriverHeaderProps> = ({
  onPressProfile,
  onPressNotification,
  onPressEmergency,
}) => {
  const { driver, isOnline } = useDriver();

  return (
    <View style={styles.header}>
      {/* Driver Avatar & Brand */}
      <View style={styles.leftGroup}>
        <TouchableOpacity activeOpacity={0.8} onPress={onPressProfile} style={styles.avatarWrapper}>
          <Image source={{ uri: driver.avatarUrl }} style={styles.avatar} />
          <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.primary : colors.offline }]} />
        </TouchableOpacity>
        <View>
          <Text style={styles.brandTitle}>UmfaGo</Text>
          <View style={styles.brandRow}>
            <Text style={styles.brandSubtitle}>DRIVER</Text>
            <View style={styles.vehiclePill}>
              <Text style={styles.vehicleText}>{driver.vehicle.type === 'motorcycle' ? 'MOTOR' : 'MOBIL'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.rightGroup}>
        {onPressEmergency && (
          <TouchableOpacity activeOpacity={0.8} onPress={onPressEmergency} style={styles.sosButton}>
            <Text style={styles.sosText}>SOS</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity activeOpacity={0.8} onPress={onPressNotification} style={styles.iconButton}>
          <Ionicons name="notifications-outline" size={20} color={colors.onSurface} />
          <View style={styles.notifBadge} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 64,
    backgroundColor: 'rgba(19, 19, 19, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 40,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.borderCard,
  },
  statusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.background,
  },
  brandTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandSubtitle: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  vehiclePill: {
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  vehicleText: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sosButton: {
    backgroundColor: '#351010',
    borderColor: '#7A1C1C',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: rounded.full,
  },
  sosText: {
    color: '#FF8A80',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
  },
});
