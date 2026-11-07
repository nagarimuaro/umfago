import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { colors, formatRupiah, rounded, spacing } from '../../constants/theme';
import { DriverOrder } from '../../types/order';
import { SoundService } from '../../services/sound';

interface IncomingOrderModalProps {
  order: DriverOrder | null;
  onAccept: () => void;
  onReject: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const IncomingOrderModal: React.FC<IncomingOrderModalProps> = ({ order, onAccept, onReject }) => {
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const panY = useRef(new Animated.Value(0)).current;

  // Sound & Countdown Timer
  useEffect(() => {
    if (!order) {
      SoundService.stopOrderAlert();
      return;
    }

    // Play high-volume order dispatch alert sound
    SoundService.playOrderAlert();

    setTimeLeft(order.expiresInSeconds || 15);
    panY.setValue(0);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          SoundService.stopOrderAlert();
          onReject();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      SoundService.stopOrderAlert();
    };
  }, [order, onReject]);

  const handleAccept = () => {
    SoundService.stopOrderAlert();
    onAccept();
  };

  const handleReject = () => {
    SoundService.stopOrderAlert();
    onReject();
  };

  // PanResponder for Swipe Up & Down Gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 4,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          // Dragging down
          panY.setValue(gestureState.dy);
        } else {
          // Dragging up with rubber-band resistance
          panY.setValue(gestureState.dy * 0.2);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 140 || gestureState.vy > 0.6) {
          // Swipe down to dismiss/reject
          Animated.timing(panY, {
            toValue: SCREEN_HEIGHT,
            duration: 220,
            useNativeDriver: true,
          }).start(() => {
            handleReject();
          });
        } else {
          // Snap back up
          Animated.spring(panY, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!order) return null;

  const totalTime = order.expiresInSeconds || 15;
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / totalTime) * 100));

  return (
    <Modal visible={!!order} transparent animationType="slide" statusBarTranslucent>
      <View style={styles.backdrop}>
        {/* Full Screen Animated Order Card */}
        <Animated.View
          style={[
            styles.fullCard,
            {
              transform: [{ translateY: panY }],
            },
          ]}
        >
          <SafeAreaView style={styles.safeArea}>
            {/* Top Drag & Swipe Header Handle */}
            <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
              <View style={styles.grabberPill} />
              <View style={styles.swipeHintRow}>
                <Ionicons name="swap-vertical" size={14} color={colors.primary} />
                <Text style={styles.swipeHintText}>Geser ke bawah untuk menolak order</Text>
              </View>
            </View>

            {/* Top Status & Urgency Header */}
            <View {...panResponder.panHandlers} style={styles.header}>
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
                      <Ionicons name="card-outline" size={12} color={colors.primary} />
                      <Text style={[styles.metaPillText, { color: colors.primary }]}>Non-Tunai</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.serviceBadge}>
                  <FontAwesome5
                    name={order.serviceType === 'food' ? 'utensils' : 'motorcycle'}
                    size={16}
                    color={colors.black}
                  />
                  <Text style={styles.serviceText}>
                    {order.serviceType === 'food' ? 'UmfaFood' : 'UmfaRide'}
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
                    <Text style={styles.pointCategory}>TITIK JEMPUT (1.2 km dari Anda)</Text>
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
                  <Text style={styles.paymentBadgeText}>DOMPET</Text>
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

            {/* Fixed Bottom Action Buttons */}
            <View style={styles.actionsFooter}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleReject}
                style={styles.rejectBtn}
              >
                <Ionicons name="close" size={20} color="#FF8A80" />
                <Text style={styles.rejectText}>Tolak Order</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleAccept}
                style={styles.acceptBtn}
              >
                <MaterialIcons name="check-circle" size={22} color={colors.black} />
                <Text style={styles.acceptText}>TERIMA ORDER</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
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
    borderTopWidth: 3,
    borderTopColor: colors.primary,
  },
  safeArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  dragHandleArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  grabberPill: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#383A3A',
  },
  swipeHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  swipeHintText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  urgencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#263400',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: rounded.full,
    borderWidth: 1.5,
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
    letterSpacing: 0.6,
  },
  orderCode: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#262828',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  earningsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E2020',
    borderRadius: rounded.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#303232',
  },
  earningsLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  earningsAmount: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 2,
    marginBottom: 8,
  },
  tripMetaPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#131414',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.sm,
  },
  metaPillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  serviceBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: rounded.md,
  },
  serviceText: {
    color: colors.black,
    fontSize: 13,
    fontWeight: '900',
  },
  routeCard: {
    backgroundColor: '#1A1B1B',
    borderRadius: rounded.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#2D2F2F',
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  pickupPinContainer: {
    width: 20,
    alignItems: 'center',
    marginTop: 3,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  dropoffPinContainer: {
    width: 20,
    alignItems: 'center',
    marginTop: 3,
  },
  dropoffDot: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#FF5252',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  routeDottedLineContainer: {
    width: 20,
    alignItems: 'center',
    marginVertical: 4,
  },
  routeDottedLine: {
    width: 2,
    height: 24,
    backgroundColor: '#383B3B',
  },
  pointTextGroup: {
    flex: 1,
  },
  pointCategory: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pointAddress: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 2,
  },
  landmarkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(200, 255, 0, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
    marginTop: 6,
  },
  landmarkText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  noteText: {
    color: '#E0E0E0',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 5,
    backgroundColor: '#202222',
    padding: 6,
    borderRadius: rounded.sm,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#1E2020',
    borderRadius: rounded.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#2F3131',
  },
  customerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  customerRating: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  paymentBadge: {
    backgroundColor: '#263400',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: rounded.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  paymentBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  safetyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(200, 255, 0, 0.08)',
    borderRadius: rounded.md,
    padding: spacing.md,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 24 : spacing.lg,
    backgroundColor: '#141515',
    borderTopWidth: 1,
    borderTopColor: '#262828',
  },
  rejectBtn: {
    flex: 1,
    height: 54,
    borderRadius: rounded.md,
    backgroundColor: '#2B1B1B',
    borderWidth: 1.5,
    borderColor: '#FF5252',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  rejectText: {
    color: '#FF8A80',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  acceptBtn: {
    flex: 2,
    height: 54,
    borderRadius: rounded.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
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
    letterSpacing: 0.6,
  },
});
