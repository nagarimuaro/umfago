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

export const ActiveOrderHUD: React.FC<ActiveOrderHUDProps> = ({ onOpenChat, onOpenNavigation }) => {
  const { currentOrder, advanceOrderStep, cancelActiveOrder } = useDriver();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  if (!currentOrder) return null;

  const isHeadingToPickup = currentOrder.step === 'heading_to_pickup';
  const isArrivedAtPickup = currentOrder.step === 'arrived_at_pickup';
  const isInTrip = currentOrder.step === 'in_trip';

  const getStepTitle = () => {
    if (isHeadingToPickup) return 'Menuju Penjemputan';
    if (isArrivedAtPickup) return 'Tiba di Penjemputan';
    if (isInTrip) return 'Mengantar ke Destinasi';
    return 'Pesanan Berlangsung';
  };

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

  const handleOpenMaps = () => {
    const target = isHeadingToPickup ? currentOrder.pickup : currentOrder.destination;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Navigasi', `Menuju: ${target.address}`);
    });
  };

  const handleCancel = () => {
    Alert.alert(
      'Batalkan Pesanan?',
      'Apakah Anda yakin ingin membatalkan pesanan ini? Pembatalan dapat mempengaruhi performa driver.',
      [
        { text: 'Tidak', style: 'cancel' },
        { text: 'Ya, Batalkan', style: 'destructive', onPress: () => cancelActiveOrder('Driver request') },
      ]
    );
  };

  // PanResponder to swipe up to expand, swipe down to collapse
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 10,
      onPanResponderRelease: (_, g) => {
        if (g.dy < -20) {
          // Swipe up -> Expand
          setIsExpanded(true);
        } else if (g.dy > 20) {
          // Swipe down -> Collapse
          setIsExpanded(false);
        }
      },
    })
  ).current;

  const swipeConfig = getSwipeConfig();

  return (
    <View style={styles.container}>
      {/* Top Swipeable Grabber Handle */}
      <View
        {...panResponder.panHandlers}
        style={styles.handleArea}
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
              {isExpanded ? 'Geser ke bawah untuk minimalkan' : 'Geser ke atas untuk detail lengkap'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Turn-by-Turn Instruction Strip */}
      <View style={styles.guidanceStrip}>
        <View style={styles.guidanceLeft}>
          <MaterialIcons
            name={isInTrip ? 'navigation' : isArrivedAtPickup ? 'place' : 'turn-slight-right'}
            size={24}
            color={swipeConfig.knobColor}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.guidanceDistance, { color: swipeConfig.knobColor }]}>
              {isInTrip
                ? `${currentOrder.distanceKm} km Menuju Alamat Tujuan`
                : isArrivedAtPickup
                ? 'Tiba di Penjemputan'
                : '300 meter Menuju Titik Jemput'}
            </Text>
            <Text style={styles.guidanceStreet} numberOfLines={1}>
              {isInTrip ? currentOrder.destination.address : currentOrder.pickup.address}
            </Text>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.8} onPress={handleOpenMaps} style={styles.mapsBtn}>
          <Ionicons name="navigate" size={15} color={colors.black} />
          <Text style={styles.mapsText}>Peta</Text>
        </TouchableOpacity>
      </View>

      {/* HUD Body */}
      <View style={styles.hudBody}>
        {/* Step Indicator Header */}
        <View style={styles.statusRow}>
          <View style={styles.stepBadge}>
            <View style={[styles.dotPulse, { backgroundColor: swipeConfig.knobColor }]} />
            <Text style={styles.stepTitle}>{getStepTitle()}</Text>
          </View>
          <Text style={styles.orderAmount}>{formatRupiah(currentOrder.driverEarnings)}</Text>
        </View>

        {/* Detailed Sections (Shown when card is expanded) */}
        {isExpanded && (
          <>
            {/* Customer Info & Contact Row */}
            <View style={styles.customerBox}>
              <View style={styles.customerLeft}>
                <View style={styles.customerAvatar}>
                  <Ionicons name="person" size={18} color={colors.onSurface} />
                </View>
                <View>
                  <Text style={styles.customerName}>{currentOrder.customer.name}</Text>
                  <Text style={styles.customerRating}>⭐ {currentOrder.customer.rating} • Pembayaran Non-Tunai</Text>
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

        {/* Action Row: Cancel Button & Swipe to Advance Slider */}
        <View style={styles.buttonRow}>
          <TouchableOpacity activeOpacity={0.8} onPress={handleCancel} style={styles.cancelBtn}>
            <Ionicons name="close" size={20} color="#FF8A80" />
          </TouchableOpacity>

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
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#222525',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: '#333838',
  },
  dotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepTitle: {
    color: colors.white,
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
