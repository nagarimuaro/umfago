import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { colors, formatRupiah, rounded, spacing } from '../../constants/theme';
import { useDriver } from '../../hooks/use-driver';

interface ActiveOrderHUDProps {
  onOpenChat?: () => void;
  onOpenNavigation?: () => void;
}

export const ActiveOrderHUD: React.FC<ActiveOrderHUDProps> = ({ onOpenChat, onOpenNavigation }) => {
  const { currentOrder, advanceOrderStep, cancelActiveOrder } = useDriver();

  if (!currentOrder) return null;

  const isHeadingToPickup = currentOrder.step === 'heading_to_pickup';
  const isArrivedAtPickup = currentOrder.step === 'arrived_at_pickup';
  const isInTrip = currentOrder.step === 'in_trip';

  const getStepTitle = () => {
    if (isHeadingToPickup) return 'Menuju Titik Penjemputan';
    if (isArrivedAtPickup) return 'Tiba di Penjemputan';
    if (isInTrip) return 'Mengantar ke Destinasi';
    return 'Pesanan Berlangsung';
  };

  const getStepActionLabel = () => {
    if (isHeadingToPickup) return 'SAYA SUDAH TIBA';
    if (isArrivedAtPickup) return 'MULAI PERJALANAN';
    if (isInTrip) return 'SELESAIKAN ORDER';
    return 'LANJUTKAN';
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

  return (
    <View style={styles.container}>
      {/* Turn-by-Turn Instruction Strip */}
      <View style={styles.guidanceStrip}>
        <View style={styles.guidanceLeft}>
          <MaterialIcons name="turn-slight-right" size={26} color={colors.primary} />
          <View>
            <Text style={styles.guidanceDistance}>250 meter</Text>
            <Text style={styles.guidanceStreet} numberOfLines={1}>
              {isHeadingToPickup ? currentOrder.pickup.address : currentOrder.destination.address}
            </Text>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.8} onPress={handleOpenMaps} style={styles.mapsBtn}>
          <Ionicons name="navigate" size={16} color={colors.black} />
          <Text style={styles.mapsText}>Peta</Text>
        </TouchableOpacity>
      </View>

      {/* Main HUD Body */}
      <View style={styles.hudBody}>
        {/* Step Indicator Header */}
        <View style={styles.statusRow}>
          <View style={styles.stepBadge}>
            <View style={styles.dotPulse} />
            <Text style={styles.stepTitle}>{getStepTitle()}</Text>
          </View>
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
              <Text style={styles.customerRating}>⭐ {currentOrder.customer.rating} • Pembayaran Non-Tunai</Text>
            </View>
          </View>

          <View style={styles.contactButtons}>
            <TouchableOpacity activeOpacity={0.8} onPress={handleCallCustomer} style={styles.contactBtn}>
              <Ionicons name="call" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} onPress={onOpenChat || handleCallCustomer} style={styles.contactBtn}>
              <Ionicons name="chatbubble-ellipses" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Target Address Card */}
        <View style={styles.addressBox}>
          <MaterialIcons
            name={isHeadingToPickup ? 'my-location' : 'location-on'}
            size={18}
            color={isHeadingToPickup ? colors.primary : '#FF5252'}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.targetLabel}>{isHeadingToPickup ? 'LOKASI JEMPUT' : 'LOKASI ANTAR'}</Text>
            <Text style={styles.targetAddress} numberOfLines={2}>
              {isHeadingToPickup ? currentOrder.pickup.address : currentOrder.destination.address}
            </Text>
            {isHeadingToPickup && currentOrder.pickup.landmark && (
              <Text style={styles.targetNote}>Catatan: {currentOrder.pickup.landmark}</Text>
            )}
          </View>
        </View>

        {/* Main Action Button (Advance lifecycle) */}
        <View style={styles.buttonRow}>
          <TouchableOpacity activeOpacity={0.8} onPress={handleCancel} style={styles.cancelBtn}>
            <Ionicons name="close" size={20} color="#FF8A80" />
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} onPress={advanceOrderStep} style={styles.primaryActionBtn}>
            <MaterialIcons name="done-all" size={22} color={colors.black} />
            <Text style={styles.primaryActionText}>{getStepActionLabel()}</Text>
          </TouchableOpacity>
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
  guidanceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F2020',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  guidanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  guidanceDistance: {
    color: colors.primary,
    fontSize: 14,
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
    fontSize: 12,
    fontWeight: '800',
  },
  hudBody: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepBadge: {
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
  dotPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  stepTitle: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  orderAmount: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '900',
  },
  customerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F2020',
    padding: spacing.md,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  customerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  customerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceHigh,
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
    marginTop: 2,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  contactBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: '#131414',
    padding: spacing.md,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: '#232525',
  },
  targetLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  targetAddress: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  targetNote: {
    color: colors.primary,
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  cancelBtn: {
    width: 52,
    height: 52,
    borderRadius: rounded.full,
    backgroundColor: '#351010',
    borderWidth: 1,
    borderColor: '#7A1C1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtn: {
    flex: 1,
    height: 52,
    borderRadius: rounded.full,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryActionText: {
    color: colors.black,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
});

