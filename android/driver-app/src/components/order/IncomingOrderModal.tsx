import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { colors, formatRupiah, rounded, spacing } from '../../constants/theme';
import { DriverOrder } from '../../types/order';

interface IncomingOrderModalProps {
  order: DriverOrder | null;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingOrderModal: React.FC<IncomingOrderModalProps> = ({ order, onAccept, onReject }) => {
  const [timeLeft, setTimeLeft] = useState<number>(15);

  useEffect(() => {
    if (!order) return;
    setTimeLeft(order.expiresInSeconds || 15);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onReject();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [order, onReject]);

  if (!order) return null;

  const progressPercent = Math.max(0, Math.min(100, (timeLeft / (order.expiresInSeconds || 15)) * 100));

  return (
    <Modal visible={!!order} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Top Urgency Header & Countdown Bar */}
          <View style={styles.header}>
            <View style={styles.urgencyPill}>
              <View style={styles.pulseDot} />
              <Text style={styles.urgencyText}>ORDER MASUK • {timeLeft}s</Text>
            </View>
            <Text style={styles.orderCode}>{order.code}</Text>
          </View>

          {/* Linear Countdown Progress Bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>

          {/* Earnings Spotlight Card */}
          <View style={styles.earningsCard}>
            <View>
              <Text style={styles.earningsLabel}>Pendapatan Bersih Driver</Text>
              <Text style={styles.earningsAmount}>{formatRupiah(order.driverEarnings)}</Text>
            </View>
            <View style={styles.serviceBadge}>
              <FontAwesome5
                name={order.serviceType === 'food' ? 'utensils' : 'motorcycle'}
                size={14}
                color={colors.black}
              />
              <Text style={styles.serviceText}>
                {order.serviceType === 'food' ? 'UmfaFood' : 'UmfaRide'}
              </Text>
            </View>
          </View>

          {/* Route Details */}
          <View style={styles.routeCard}>
            {/* Pickup */}
            <View style={styles.pointRow}>
              <View style={styles.pickupDot} />
              <View style={styles.pointTextGroup}>
                <Text style={styles.pointCategory}>PENJEMPUTAN (1.2 km)</Text>
                <Text style={styles.pointAddress} numberOfLines={1}>
                  {order.pickup.address}
                </Text>
                {order.pickup.landmark && (
                  <Text style={styles.pointLandmark}>{order.pickup.landmark}</Text>
                )}
              </View>
            </View>

            {/* Connecting Line */}
            <View style={styles.connectingLine} />

            {/* Destination */}
            <View style={styles.pointRow}>
              <View style={styles.dropoffDot} />
              <View style={styles.pointTextGroup}>
                <Text style={styles.pointCategory}>TUJUAN ({order.distanceKm} km)</Text>
                <Text style={styles.pointAddress} numberOfLines={1}>
                  {order.destination.address}
                </Text>
              </View>
            </View>
          </View>

          {/* Customer Info Snippet */}
          <View style={styles.customerRow}>
            <View style={styles.customerAvatar}>
              <Ionicons name="person" size={16} color={colors.onSurface} />
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{order.customer.name}</Text>
              <Text style={styles.customerMeta}>⭐ {order.customer.rating} • Pembayaran Non-Tunai</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity activeOpacity={0.8} onPress={onReject} style={styles.rejectBtn}>
              <Text style={styles.rejectText}>Tolak</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.8} onPress={onAccept} style={styles.acceptBtn}>
              <MaterialIcons name="check-circle" size={20} color={colors.black} />
              <Text style={styles.acceptText}>TERIMA ORDER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#191A1A',
    borderTopLeftRadius: rounded.lg,
    borderTopRightRadius: rounded.lg,
    padding: spacing.lg,
    borderTopWidth: 2,
    borderTopColor: colors.primary,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  urgencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#273500',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  urgencyText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  orderCode: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.surfaceHigh,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  earningsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F2020',
    borderRadius: rounded.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  earningsLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  earningsAmount: {
    color: colors.primary,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: rounded.full,
  },
  serviceText: {
    color: colors.black,
    fontSize: 12,
    fontWeight: '800',
  },
  routeCard: {
    backgroundColor: '#131414',
    borderRadius: rounded.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#232525',
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  dropoffDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#FF5252',
    marginTop: 4,
  },
  connectingLine: {
    width: 2,
    height: 20,
    backgroundColor: colors.outlineVariant,
    marginLeft: 4,
    marginVertical: 2,
  },
  pointTextGroup: {
    flex: 1,
  },
  pointCategory: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pointAddress: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
  },
  pointLandmark: {
    color: colors.primary,
    fontSize: 11,
    fontStyle: 'italic',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#1F2020',
    borderRadius: rounded.sm,
    padding: spacing.sm,
  },
  customerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  customerMeta: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingVertical: 15,
    borderRadius: rounded.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  acceptBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: rounded.full,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  acceptText: {
    color: colors.black,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

