import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors, formatRupiah, rounded, spacing } from '../../constants/theme';
import { useDriver } from '../../hooks/use-driver';
import { SwipeToAccept } from './SwipeToAccept';

interface ActiveOrderHUDProps {
  onOpenChat?: () => void;
  onOpenNavigation?: () => void;
}

export const ActiveOrderHUD: React.FC<ActiveOrderHUDProps> = ({ onOpenChat }) => {
  const { currentOrder, advanceOrderStep } = useDriver();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const dragStartY = useRef<number | null>(null);

  if (!currentOrder) return null;

  const isHeadingToPickup = currentOrder.step === 'heading_to_pickup';
  const isArrivedAtPickup = currentOrder.step === 'arrived_at_pickup';
  const isInTrip = currentOrder.step === 'in_trip';

  const getSwipeConfig = () => {
    if (isHeadingToPickup) {
      return {
        title: 'Geser jika Sudah Tiba',
        iconName: 'location-sharp' as const,
        knobColor: colors.primary,
        activeFillColor: 'rgba(200, 255, 0, 0.25)',
      };
    }
    if (isArrivedAtPickup) {
      return {
        title: 'Geser untuk Mulai Perjalanan',
        iconName: 'arrow-forward-sharp' as const,
        knobColor: '#00E676',
        activeFillColor: 'rgba(0, 230, 118, 0.25)',
      };
    }
    if (isInTrip) {
      return {
        title: 'Geser untuk Selesaikan Order',
        iconName: 'flag-sharp' as const,
        knobColor: '#FFD600',
        activeFillColor: 'rgba(255, 214, 0, 0.25)',
      };
    }
    return {
      title: 'Geser untuk Lanjutkan',
      iconName: 'arrow-forward-sharp' as const,
      knobColor: colors.primary,
      activeFillColor: 'rgba(200, 255, 0, 0.25)',
    };
  };

  const handleCallCustomer = () => {
    const telUrl = `tel:${currentOrder.customer.phone.replace(/[^0-9+]/g, '')}`;
    Linking.openURL(telUrl).catch(() => {
      Alert.alert('Panggilan Telepon', `Menghubungi ${currentOrder.customer.name}: ${currentOrder.customer.phone}`);
    });
  };

  // PanResponder to swipe up to expand, swipe down to collapse (down to swipe button)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dy < -15) {
          setIsExpanded(true);
        } else if (g.dy > 15) {
          setIsExpanded(false);
        }
      },
    })
  ).current;

  const swipeConfig = getSwipeConfig();

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Top Swipeable Grabber Handle */}
      <View
        style={styles.handleArea}
        // Support mouse drag on web as well as touch
        {...(Platform.OS === 'web'
          ? {
              onMouseDown: (e: any) => {
                dragStartY.current = e.clientY;
              },
              onMouseUp: (e: any) => {
                if (dragStartY.current !== null) {
                  const dy = e.clientY - dragStartY.current;
                  dragStartY.current = null;
                  if (dy < -15) {
                    setIsExpanded(true);
                  } else if (dy > 15) {
                    setIsExpanded(false);
                  }
                }
              },
            }
          : {})}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setIsExpanded((prev) => !prev)}
          style={styles.grabberTouch}
        >
          <View style={styles.grabberPill} />
          <View style={styles.expandHintRow}>
            <Ionicons
              name={isExpanded ? 'chevron-down' : 'chevron-up'}
              size={13}
              color={colors.textSecondary}
            />
            <Text style={styles.expandHintText}>
              {isExpanded ? 'Geser ke bawah untuk minimalkan' : 'Geser ke atas untuk buka detail'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* HUD Body */}
      <View style={styles.hudBody}>
        {/* Detailed Sections (Hidden when collapsed down to the swipe button) */}
        {isExpanded && (
          <>
            {/* Earnings Row */}
            <View style={styles.statusRow}>
              <Text style={styles.earningsLabel}>Pendapatan Bersih</Text>
              <Text style={styles.orderAmount}>{formatRupiah(currentOrder.driverEarnings)}</Text>
            </View>

            {/* Customer Info & Contact Row */}
            <View style={styles.customerBox}>
              <View style={styles.customerLeft}>
                <View style={styles.customerAvatar}>
                  <Ionicons name="person" size={18} color={colors.onSurface} />
                </View>
                <View>
                  <Text style={styles.customerName}>{currentOrder.customer.name}</Text>
                  <Text style={styles.customerRating}>
                    ⭐ {currentOrder.customer.rating} • Pembayaran {currentOrder.paymentMethod === 'cash' ? 'Tunai' : 'Non-Tunai'}
                  </Text>
                </View>
              </View>

              <View style={styles.contactButtons}>
                <TouchableOpacity activeOpacity={0.8} onPress={handleCallCustomer} style={styles.contactBtn}>
                  <Ionicons name="call" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onOpenChat || handleCallCustomer}
                  style={styles.contactBtn}
                >
                  <Ionicons name="chatbubble-ellipses" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Target Address Card */}
            <View style={styles.addressBox}>
              <MaterialIcons
                name={isInTrip ? 'location-on' : 'my-location'}
                size={18}
                color={isInTrip ? '#FF5252' : colors.primary}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.targetLabel}>
                  {isInTrip ? 'LOKASI TUJUAN ANTAR' : 'LOKASI PENJEMPUTAN'}
                </Text>
                <Text style={styles.targetAddress} numberOfLines={2}>
                  {isInTrip ? currentOrder.destination.address : currentOrder.pickup.address}
                </Text>
                {isInTrip
                  ? currentOrder.destination.landmark && (
                      <Text style={styles.targetNote}>Catatan: {currentOrder.destination.landmark}</Text>
                    )
                  : currentOrder.pickup.landmark && (
                      <Text style={styles.targetNote}>Catatan: {currentOrder.pickup.landmark}</Text>
                    )}
              </View>
            </View>
          </>
        )}

        {/* Action Row: Only Swipe to Advance Slider (Cancel Button Removed Once Order Accepted) */}
        <View style={styles.buttonRow}>
          <View style={styles.swipeSliderContainer}>
            <SwipeToAccept
              onAccept={advanceOrderStep}
              title={swipeConfig.title}
              iconName={swipeConfig.iconName}
              knobColor={swipeConfig.knobColor}
              activeFillColor={swipeConfig.activeFillColor}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#161717',
    borderTopLeftRadius: rounded.lg,
    borderTopRightRadius: rounded.lg,
    borderTopWidth: 2,
    borderTopColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 2,
    backgroundColor: '#1A1C1C',
    borderTopLeftRadius: rounded.lg,
    borderTopRightRadius: rounded.lg,
  },
  grabberTouch: {
    alignItems: 'center',
    width: '100%',
    paddingBottom: 4,
  },
  grabberPill: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#404444',
    marginBottom: 4,
  },
  expandHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandHintText: {
    color: '#8A8F8F',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  guidanceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F2020',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2B2D2D',
  },
  guidanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  guidanceDistance: {
    fontSize: 13,
    fontWeight: '800',
  },
  guidanceStreet: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: rounded.full,
  },
  mapsText: {
    color: colors.black,
    fontWeight: '800',
    fontSize: 12,
  },
  hudBody: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  orderAmount: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  customerBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1C1E1E',
    padding: spacing.sm,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: '#2D3030',
  },
  customerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  customerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2D3030',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  customerRating: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  contactBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#262929',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3D4141',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#1C1E1E',
    padding: spacing.sm,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: '#2D3030',
  },
  targetLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  targetAddress: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  targetNote: {
    color: colors.primary,
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  cancelBtn: {
    width: 52,
    height: 60,
    borderRadius: 26,
    backgroundColor: '#261818',
    borderWidth: 1.5,
    borderColor: '#FF5252',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeSliderContainer: {
    flex: 1,
  },
});
