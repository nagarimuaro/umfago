import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { DriverHeader } from '../../components/home/DriverHeader';
import { RadarMapView } from '../../components/home/RadarMapView';
import { OnlineStatusToggle } from '../../components/home/OnlineStatusToggle';
import { SurgeAlertCard } from '../../components/home/SurgeAlertCard';
import { EarningsCard } from '../../components/home/EarningsCard';
import { IncomingOrderModal } from '../../components/order/IncomingOrderModal';
import { ActiveOrderHUD } from '../../components/order/ActiveOrderHUD';
import { useDriver } from '../../hooks/use-driver';
import { spacing } from '../../constants/theme';
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

        {/* Floating Card Stack (Over the Radar Map) */}
        {!currentOrder && (
          <View style={styles.floatingStack} pointerEvents="box-none">
            {/* Online / Offline Quick Slider */}
            <View pointerEvents="auto">
              <OnlineStatusToggle />
            </View>

            {/* Surge Hotspot Alert Card */}
            {selectedSurge && (
              <View pointerEvents="auto">
                <SurgeAlertCard surge={selectedSurge} onPressNavigate={handleSelectSurge} />
              </View>
            )}

            {/* Shift Earnings Bento Card */}
            <View pointerEvents="auto">
              <EarningsCard
                onPressWallet={() => router.push('/shift')}
                onPressShiftSummary={() => router.push('/shift')}
              />
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
  activeOrderWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 40,
  },
});
