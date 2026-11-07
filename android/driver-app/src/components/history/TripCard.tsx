import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { colors, formatRupiah, rounded, spacing } from '../../constants/theme';
import { DriverOrder } from '../../types/order';

interface TripCardProps {
  order: DriverOrder;
  onPress: (order: DriverOrder) => void;
}

export const TripCard: React.FC<TripCardProps> = ({ order, onPress }) => {
  const isCompleted = order.status === 'completed';
  const isFood = order.serviceType === 'food';

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => onPress(order)} style={styles.card}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.serviceGroup}>
          <View style={[styles.serviceIconCircle, { backgroundColor: isFood ? colors.surfaceHigh : colors.primary }]}>
            <FontAwesome5
              name={isFood ? 'utensils' : 'motorcycle'}
              size={16}
              color={isFood ? colors.primary : colors.black}
            />
          </View>
          <View>
            <Text style={styles.serviceTitle}>{isFood ? 'UmfaFood' : 'UmfaRide'}</Text>
            <Text style={styles.serviceMeta}>
              {order.createdAt} • {order.distanceKm} km
            </Text>
          </View>
        </View>

        <View style={styles.fareGroup}>
          <Text style={styles.fareAmount}>{formatRupiah(order.driverEarnings)}</Text>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isCompleted ? '#162A14' : '#351010',
                borderColor: isCompleted ? '#23581E' : '#7A1C1C',
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: isCompleted ? colors.primary : '#FF8A80' },
              ]}
            >
              {isCompleted ? 'SELESAI' : 'DIBATALKAN'}
            </Text>
          </View>
        </View>
      </View>

      {/* Route Timeline */}
      <View style={styles.timelineContainer}>
        {/* Origin */}
        <View style={styles.pointRow}>
          <View style={styles.pickupDot} />
          <Text style={styles.addressText} numberOfLines={1}>
            {order.restaurantName || order.pickup.address}
          </Text>
        </View>

        {/* Dashed connector */}
        <View style={styles.connector} />

        {/* Destination */}
        <View style={styles.pointRow}>
          <View style={styles.dropoffDot} />
          <Text style={styles.addressText} numberOfLines={1}>
            {order.destination.address}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1F2020',
    borderRadius: rounded.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderCard,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2D2D',
    paddingBottom: spacing.sm,
  },
  serviceGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  serviceIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  serviceMeta: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  fareGroup: {
    alignItems: 'flex-end',
  },
  fareAmount: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  statusPill: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: rounded.full,
    marginTop: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  timelineContainer: {
    gap: 4,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pickupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  dropoffDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#FF5252',
  },
  connector: {
    width: 2,
    height: 10,
    backgroundColor: colors.outlineVariant,
    marginLeft: 3,
  },
  addressText: {
    color: colors.onSurface,
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});

