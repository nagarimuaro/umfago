import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { VehicleCard } from '../../components/profile/VehicleCard';
import { useDriver } from '../../hooks/use-driver';
import { colors, rounded, spacing } from '../../constants/theme';

export default function VehicleScreen() {
  const router = useRouter();
  const { driver } = useDriver();

  const handleUpdate = () => {
    Alert.alert(
      'Perbarui Kendaraan',
      'Untuk mengganti plat nomor atau unit kendaraan, silakan lampirkan foto fisik STNK terbaru untuk diverifikasi tim operasional.',
      [{ text: 'Tutup' }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Informasi Kendaraan</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Vehicle Card */}
        <VehicleCard vehicle={driver.vehicle} />

        {/* Requirements Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Pastikan pajak kendaraan selalu aktif dan fisik kendaraan terawat demi kenyamanan dan keselamatan berkendara.
          </Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity activeOpacity={0.8} onPress={handleUpdate} style={styles.updateBtn}>
          <Text style={styles.updateText}>Ajukan Perubahan Kendaraan</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#131313',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    backgroundColor: '#131313',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#1F2020',
    borderRadius: rounded.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  updateBtn: {
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingVertical: 14,
    borderRadius: rounded.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  updateText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});

