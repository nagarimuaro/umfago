import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, rounded, spacing } from '../../constants/theme';
import { useDriver } from '../../hooks/use-driver';

export const OnlineStatusToggle: React.FC = () => {
  const { isOnline, toggleOnline, currentOrder } = useDriver();

  const getStatusLabel = () => {
    if (currentOrder) return 'Sedang Menjalankan Order';
    if (isOnline) return 'Siap Terima Order';
    return 'Driver Sedang Istirahat';
  };

  return (
    <View style={styles.container}>
      {/* Left Status Indicator */}
      <View style={styles.statusGroup}>
        <View style={styles.dotContainer}>
          {isOnline && <View style={styles.pingRing} />}
          <View
            style={[
              styles.innerDot,
              { backgroundColor: currentOrder ? colors.busy : isOnline ? colors.primary : colors.offline },
            ]}
          />
        </View>
        <Text
          style={[
            styles.statusLabel,
            { color: currentOrder ? colors.busy : isOnline ? colors.primary : colors.textSecondary },
          ]}
        >
          {getStatusLabel()}
        </Text>
      </View>

      {/* Right Quick Toggle Switch Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={toggleOnline}
        disabled={!!currentOrder}
        style={[
          styles.toggleBtn,
          {
            backgroundColor: isOnline ? colors.surfaceHigh : colors.surfaceLow,
            borderColor: isOnline ? colors.primary : colors.outline,
          },
        ]}
      >
        <Text style={[styles.toggleText, { color: isOnline ? colors.white : colors.textSecondary }]}>
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </Text>
        <Ionicons
          name={isOnline ? 'toggle' : 'toggle-outline'}
          size={24}
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
    backgroundColor: 'rgba(25, 26, 26, 0.92)',
    borderRadius: rounded.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.outline,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  dotContainer: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pingRing: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    opacity: 0.35,
  },
  innerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: rounded.full,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});

