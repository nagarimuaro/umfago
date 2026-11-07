import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RadarMapView } from '../../components/home/RadarMapView';
import { ActiveOrderHUD } from '../../components/order/ActiveOrderHUD';
import { useDriver } from '../../hooks/use-driver';
import { colors, spacing } from '../../constants/theme';

export default function ActiveOrderScreen() {
  const router = useRouter();
  const { currentOrder } = useDriver();

  if (!currentOrder) {
    router.replace('/(tabs)');
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Radar Map Canvas */}
        <RadarMapView />

        {/* Back Button Floating */}
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>

        {/* Bottom Active Order HUD */}
        <View style={styles.hudWrapper}>
          <ActiveOrderHUD
            onOpenChat={() => Alert.alert('Chat Pelanggan', `Membuka obrolan dengan ${currentOrder.customer.name}`)}
            onOpenNavigation={() => Alert.alert('Navigasi', 'Navigasi GPS terhubung.')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#131313',
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(27, 28, 28, 0.95)',
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  hudWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 40,
  },
});

