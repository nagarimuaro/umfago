import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { colors, formatRupiah, rounded, spacing } from '../../constants/theme';
import { DriverOrder } from '../../types/order';
import { SoundService } from '../../services/sound';
import { SwipeToAccept } from './SwipeToAccept';

interface IncomingOrderModalProps {
  order: DriverOrder | null;
  onAccept: () => void;
  onReject: () => void;
  onTimeout?: () => void;
}

export const IncomingOrderModal: React.FC<IncomingOrderModalProps> = ({ order, onAccept, onReject, onTimeout }) => {
  const [timeLeft, setTimeLeft] = useState<number>(15);

  // Sound & Countdown Timer
  useEffect(() => {
    if (!order) {
      SoundService.stopOrderAlert();
      return;
    }

    // Play high-volume order dispatch alert sound
    SoundService.playOrderAlert();

    setTimeLeft(order.expiresInSeconds || 15);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          SoundService.stopOrderAlert();
          if (onTimeout) {
            onTimeout();
          } else {
            onReject();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      SoundService.stopOrderAlert();
    };
  }, [order, onReject, onTimeout]);

  const handleAccept = () => {
    SoundService.stopOrderAlert();
    onAccept();
  };

  const handleReject = () => {
    SoundService.stopOrderAlert();
    onReject();
  };

  if (!order) return null;

  const totalTime = order.expiresInSeconds || 15;
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / totalTime) * 100));

  return (
    <Modal visible={!!order} transparent animationType="slide" statusBarTranslucent>
      <View style={styles.backdrop}>
        {/* Full Screen Stable Order Card (No swipe-down cancel) */}
        <View style={styles.fullCard}>
          <SafeAreaView style={styles.safeArea}>
            {/* Top Header Handle & Title */}
            <View style={styles.dragHandleArea}>
              <View style={styles.grabberPill} />
              <View style={styles.headerTitleRow}>
                <Ionicons name="flash" size={14} color={colors.primary} />
                <Text style={styles.headerTitleText}>Pesanan Baru Masuk</Text>
              </View>
            </View>

            {/* Top Status & Urgency Header */}
            <View style={styles.header}>
              <View style={styles.urgencyPill}>
                <View style={styles.pulseDot} />
                <Text style={styles.urgencyText}>ORDER MASUK • {timeLeft} DETIK</Text>
              </View>
              <Text style={styles.orderCode}>{order.code}</Text>
            </View>

            {/* Countdown Progress Bar */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>

            {/* Scrollable Order Details Body */}
            <ScrollView
              style={styles.scrollBody}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              {/* Earnings Spotlight Card */}
              <View style={styles.earningsCard}>
                <View>
                  <Text style={styles.earningsLabel}>Pendapatan Bersih Driver</Text>
                  <Text style={styles.earningsAmount}>{formatRupiah(order.driverEarnings)}</Text>
                  <View style={styles.tripMetaPills}>
                    <View style={styles.metaPill}>
                      <Ionicons name="speedometer-outline" size={12} color={colors.textSecondary} />
                      <Text style={styles.metaPillText}>{order.distanceKm} km</Text>
                    </View>
                    <View style={styles.metaPill}>
                      <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                      <Text style={styles.metaPillText}>± {order.estimatedDurationMinutes} mnt</Text>
                    </View>
                    <View style={styles.metaPill}>
                      <Ionicons
                        name={order.paymentMethod === 'cash' ? 'cash-outline' : 'card-outline'}
                        size={12}
                        color={colors.primary}
                      />
                      <Text style={[styles.metaPillText, { color: colors.primary }]}>
                        {order.paymentMethod === 'cash' ? 'Tunai' : 'Non-Tunai'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.serviceBadge}>
                  <FontAwesome5
                    name={order.serviceType === 'food' ? 'utensils' : order.serviceType === 'car' ? 'car' : 'motorcycle'}
                    size={16}
                    color={colors.black}
                  />
                  <Text style={styles.serviceText}>
                    {order.serviceType === 'food' ? 'UmfaFood' : order.serviceType === 'car' ? 'UmfaCar' : 'UmfaRide'}
                  </Text>
                </View>
              </View>

              {/* Complete Route Section */}
              <View style={styles.routeCard}>
                {/* Pickup Point */}
                <View style={styles.pointRow}>
                  <View style={styles.pickupPinContainer}>
                    <View style={styles.pickupDot} />
                  </View>
                  <View style={styles.pointTextGroup}>
                    <Text style={styles.pointCategory}>TITIK JEMPUT PELANGGAN</Text>
                    <Text style={styles.pointAddress}>
                      {order.pickup.address}
                    </Text>
                    {order.pickup.landmark && (
                      <View style={styles.landmarkPill}>
                        <Ionicons name="flag-outline" size={12} color={colors.primary} />
                        <Text style={styles.landmarkText}>{order.pickup.landmark}</Text>
                      </View>
                    )}
                    {order.pickup.notes && (
                      <Text style={styles.noteText}>Catatan: "{order.pickup.notes}"</Text>
                    )}
                  </View>
                </View>

                {/* Vertical Dotted Route Line */}
                <View style={styles.routeDottedLineContainer}>
                  <View style={styles.routeDottedLine} />
                </View>

                {/* Destination Point */}
                <View style={styles.pointRow}>
                  <View style={styles.dropoffPinContainer}>
                    <View style={styles.dropoffDot} />
                  </View>
                  <View style={styles.pointTextGroup}>
                    <Text style={styles.pointCategory}>DESTINASI TUJUAN ({order.distanceKm} km)</Text>
                    <Text style={styles.pointAddress}>
                      {order.destination.address}
                    </Text>
                    {order.destination.landmark && (
                      <View style={styles.landmarkPill}>
                        <Ionicons name="business-outline" size={12} color="#FF5252" />
                        <Text style={[styles.landmarkText, { color: '#FF8A80' }]}>
                          {order.destination.landmark}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Customer Profile Box */}
              <View style={styles.customerCard}>
                <View style={styles.customerAvatar}>
                  <Ionicons name="person" size={20} color={colors.onSurface} />
                </View>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{order.customer.name}</Text>
                  <Text style={styles.customerRating}>⭐ {order.customer.rating} • Pelanggan Terverifikasi</Text>
                </View>
                <View style={styles.paymentBadge}>
                  <Text style={styles.paymentBadgeText}>
                    {order.paymentMethod === 'cash' ? 'TUNAI' : 'DOMPET'}
                  </Text>
                </View>
              </View>

              {/* Safety & Fare Guarantee Notice */}
              <View style={styles.safetyBox}>
                <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
                <Text style={styles.safetyText}>
                  Tarif bersih driver dijamin 100% masuk ke dompet tanpa potongan tak terduga.
                </Text>
              </View>
            </ScrollView>

            {/* Bottom Actions: Swipe Right to Accept & Dismiss Option */}
            <View style={styles.actionsFooter}>
              {/* Swipe to Accept Button (Swiped to the right) */}
              <SwipeToAccept
                onAccept={handleAccept}
                title="Geser ke Kanan untuk Terima"
              />

              {/* Tolak Button underneath */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleReject}
                style={styles.rejectRowBtn}
              >
                <Ionicons name="close-circle-outline" size={16} color="#FF6E6E" />
                <Text style={styles.rejectRowText}>Tolak Pesanan Ini ({timeLeft}s)</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  fullCard: {
    flex: 1,
    backgroundColor: '#141515',
    borderTopLeftRadius: rounded.lg,
    borderTopRightRadius: rounded.lg,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  dragHandleArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: '#181A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#242626',
  },
  grabberPill: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#404444',
    marginBottom: 6,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 6,
  },
  headerTitleText: {
    color: '#D0D4D4',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#181A1A',
  },
  urgencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(200, 255, 0, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: rounded.full,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(200, 255, 0, 0.3)',
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
  },
  urgencyText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  orderCode: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#262929',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  scrollBody: {
    flex: 1,
    backgroundColor: '#141515',
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  earningsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E2020',
    padding: spacing.lg,
    borderRadius: rounded.md,
    borderWidth: 1.5,
    borderColor: '#303434',
  },
  earningsLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  earningsAmount: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tripMetaPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#262929',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: rounded.sm,
  },
  metaPillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  serviceBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: rounded.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  serviceText: {
    color: colors.black,
    fontWeight: '800',
    fontSize: 12,
  },
  routeCard: {
    backgroundColor: '#1A1C1C',
    borderRadius: rounded.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#292C2C',
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  pickupPinContainer: {
    marginTop: 2,
    width: 20,
    alignItems: 'center',
  },
  pickupDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  dropoffPinContainer: {
    marginTop: 2,
    width: 20,
    alignItems: 'center',
  },
  dropoffDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  routeDottedLineContainer: {
    marginLeft: 9,
    height: 28,
    justifyContent: 'center',
  },
  routeDottedLine: {
    width: 2,
    height: '100%',
    backgroundColor: '#3D4141',
  },
  pointTextGroup: {
    flex: 1,
  },
  pointCategory: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  pointAddress: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  landmarkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(200, 255, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  landmarkText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  noteText: {
    color: '#FBBF24',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2020',
    padding: spacing.md,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: '#292C2C',
    gap: spacing.md,
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2D3030',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  customerRating: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  paymentBadge: {
    backgroundColor: '#262929',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3D4141',
  },
  paymentBadgeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  safetyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(200, 255, 0, 0.08)',
    padding: spacing.md,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(200, 255, 0, 0.25)',
  },
  safetyText: {
    color: '#D8FFAA',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  actionsFooter: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 24 : spacing.md,
    backgroundColor: '#161818',
    borderTopWidth: 1,
    borderTopColor: '#262828',
  },
  rejectRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
  },
  rejectRowText: {
    color: '#FF8A80',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
