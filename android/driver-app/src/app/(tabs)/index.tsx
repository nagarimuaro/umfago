import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { DriverHeader } from '../../components/home/DriverHeader';
import { RadarMapView } from '../../components/home/RadarMapView';
import { OnlineStatusToggle } from '../../components/home/OnlineStatusToggle';
import { IncomingOrderModal } from '../../components/order/IncomingOrderModal';
import { ActiveOrderHUD } from '../../components/order/ActiveOrderHUD';
import { useDriver } from '../../hooks/use-driver';
import { colors, rounded, spacing } from '../../constants/theme';
import { SurgeArea } from '../../types/driver';

export default function DriverHomeScreen() {
  const router = useRouter();
  const {
    surgeAreas,
    incomingOrder,
    currentOrder,
    acceptIncomingOrder,
    rejectIncomingOrder,
    simulateIncomingOrder,
  } = useDriver();

  const [selectedSurge, setSelectedSurge] = useState<SurgeArea>(surgeAreas[0]);

  const getStepTitle = () => {
    if (!currentOrder) return '';
    if (currentOrder.step === 'heading_to_pickup') return 'Menuju Penjemputan';
    if (currentOrder.step === 'arrived_at_pickup') return 'Tiba di Penjemputan';
    if (currentOrder.step === 'in_trip') return 'Mengantar ke Destinasi';
    return 'Pesanan Berlangsung';
  };

  const getStepColor = () => {
    if (!currentOrder) return colors.primary;
    if (currentOrder.step === 'arrived_at_pickup') return '#00E676';
    if (currentOrder.step === 'in_trip') return '#FFD600';
    return colors.primary;
  };

  const handleSelectSurge = (surge: SurgeArea) => {
    setSelectedSurge(surge);
    Alert.alert(
      'Area Ramai Terdeteksi',
      `Menuju ${surge.name} (Multiplier ${surge.multiplier}x). Permintaan order sangat tinggi di area ini!`
    );
  };

  const handleSOS = () => {
    Alert.alert(
      'Bantuan Darurat Driver (SOS)',
      'Apakah Anda dalam situasi darurat? Tim Keamanan UmfaGo dan kontak darurat akan segera dihubungi.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'PANGGIL BANTUAN',
          style: 'destructive',
          onPress: () => Alert.alert('Panggilan Terkirim', 'Pusat Keamanan UmfaGo telah menerima sinyal lokasi GPS Anda.'),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <DriverHeader
        onPressProfile={() => router.push('/profile')}
        onPressNotification={() => Alert.alert('Notifikasi', 'Tidak ada pengumuman darurat baru dari dispatch.')}
        onPressEmergency={handleSOS}
      />

      {/* Fullscreen Night GPS Radar Map */}
      <View style={styles.mapContainer}>
        <RadarMapView
          onSelectSurge={handleSelectSurge}
          onSimulateOrder={simulateIncomingOrder}
        />

        {/* Floating Controls Stack (Over the Radar Map when Idle) */}
        {!currentOrder && (
          <View style={styles.floatingStack} pointerEvents="box-none">
            {/* Online / Offline Quick Slider with Live GPS Coordinates */}
            <View pointerEvents="auto">
              <OnlineStatusToggle />
            </View>
          </View>
        )}

        {/* Floating Step Status Badge Inside the Map (When Order is Active) */}
        {currentOrder && (
          <View style={styles.mapStepBadgeWrapper} pointerEvents="none">
            <View style={styles.stepBadge}>
              <View style={[styles.dotPulse, { backgroundColor: getStepColor() }]} />
              <Text style={styles.stepTitle}>{getStepTitle()}</Text>
            </View>
          </View>
        )}

        {/* Active Ongoing Order HUD */}
        {currentOrder && (
          <View style={styles.activeOrderWrapper}>
            <ActiveOrderHUD
              onOpenChat={() => Alert.alert('Chat Pelanggan', `Membuka obrolan dengan ${currentOrder.customer.name}`)}
              onOpenNavigation={() => Alert.alert('Navigasi Aktif', 'Navigasi GPS sedang memandu Anda.')}
            />
          </View>
        )}
      </View>

      {/* Urgent Incoming Order Dispatch Popup */}
      <IncomingOrderModal
        order={incomingOrder}
        onAccept={acceptIncomingOrder}
        onReject={rejectIncomingOrder}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#131313',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  floatingStack: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    right: spacing.lg,
    gap: spacing.sm,
    zIndex: 30,
  },
  mapStepBadgeWrapper: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    zIndex: 30,
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(26, 28, 28, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: '#333838',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
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
  activeOrderWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 40,
  },
});

