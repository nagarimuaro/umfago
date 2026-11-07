import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { colors, formatRupiah, rounded, spacing } from '../../constants/theme';
import { useDriver } from '../../hooks/use-driver';

export default function ProfileScreen() {
  const router = useRouter();
  const { driver } = useDriver();

  const handleWithdraw = () => {
    Alert.alert(
      'Tarik Saldo Driver',
      `Saldo yang tersedia untuk ditarik: ${formatRupiah(driver.balance)}. Lanjutkan penarikan ke rekening bank terdaftar?`,
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Tarik Dana', onPress: () => Alert.alert('Berhasil', 'Permintaan penarikan diproses ke BCA **** 8812.') },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Keluar Aplikasi', 'Apakah Anda yakin ingin keluar dari akun driver?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => Alert.alert('Keluar', 'Sesi Anda telah diakhiri.') },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil Driver</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Image source={{ uri: driver.avatarUrl }} style={styles.avatar} />
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.driverName}>{driver.name}</Text>
              <MaterialIcons name="verified" size={16} color={colors.primary} />
            </View>
            <Text style={styles.driverPhone}>{driver.phone}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color={colors.primary} />
                <Text style={styles.ratingText}>{driver.rating.toFixed(1)}</Text>
              </View>
              <Text style={styles.tripCountBadge}>{driver.totalTrips} Total Perjalanan</Text>
            </View>
          </View>
        </View>

        {/* Driver Balance Card */}
        <View style={styles.balanceCard}>
          <View>
            <Text style={styles.balanceLabel}>SALDO DOMPET DRIVER</Text>
            <Text style={styles.balanceAmount}>{formatRupiah(driver.balance)}</Text>
          </View>
          <TouchableOpacity activeOpacity={0.8} onPress={handleWithdraw} style={styles.withdrawBtn}>
            <MaterialIcons name="payments" size={18} color={colors.black} />
            <Text style={styles.withdrawText}>Tarik Saldo</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Navigation Group */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupLabel}>KENDARAAN & VERIFIKASI</Text>

          {/* Vehicle Info */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/profile/vehicle')}
            style={styles.menuItem}
          >
            <View style={styles.menuIconCircle}>
              <FontAwesome5 name="motorcycle" size={16} color={colors.primary} />
            </View>
            <View style={styles.menuTextGroup}>
              <Text style={styles.menuTitle}>Informasi Kendaraan</Text>
              <Text style={styles.menuSubtitle}>{driver.vehicle.model} • {driver.vehicle.plateNumber}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* KYC Documents */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/profile/kyc')}
            style={styles.menuItem}
          >
            <View style={styles.menuIconCircle}>
              <MaterialIcons name="verified-user" size={18} color={colors.primary} />
            </View>
            <View style={styles.menuTextGroup}>
              <Text style={styles.menuTitle}>Dokumen & Verifikasi (KYC)</Text>
              <Text style={styles.menuSubtitle}>KTP, SIM C, SKCK Terverifikasi</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* App Settings Group */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupLabel}>PENGATURAN & PREFERENSI</Text>

          {/* App Settings */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/profile/settings')}
            style={styles.menuItem}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="settings-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.menuTextGroup}>
              <Text style={styles.menuTitle}>Pengaturan Aplikasi</Text>
              <Text style={styles.menuSubtitle}>Navigasi Peta, Auto-Accept, Notifikasi</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Help Center */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => Alert.alert('Bantuan Driver', 'Pusat bantuan UmfaGo Driver: support@umfago.id')}
            style={styles.menuItem}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="help-buoy-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.menuTextGroup}>
              <Text style={styles.menuTitle}>Bantuan & Layanan Bintang</Text>
              <Text style={styles.menuSubtitle}>Pusat Bantuan Driver 24/7</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity activeOpacity={0.8} onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={18} color="#FF8A80" />
          <Text style={styles.logoutText}>Keluar dari Akun</Text>
        </TouchableOpacity>

        {/* App Version Info */}
        <Text style={styles.versionText}>UmfaGo Driver v1.0.0 (Build 57.0)</Text>
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
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    backgroundColor: '#131313',
  },
  headerTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#1F2020',
    borderRadius: rounded.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  driverName: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  driverPhone: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1C290D',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: rounded.full,
  },
  ratingText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  tripCountBadge: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1B1C1C',
    borderRadius: rounded.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  balanceLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  balanceAmount: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: rounded.full,
  },
  withdrawText: {
    color: colors.black,
    fontSize: 12,
    fontWeight: '800',
  },
  menuGroup: {
    gap: spacing.sm,
  },
  groupLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#1F2020',
    borderRadius: rounded.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextGroup: {
    flex: 1,
  },
  menuTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  menuSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#261212',
    borderWidth: 1,
    borderColor: '#541F1F',
    paddingVertical: 14,
    borderRadius: rounded.full,
    marginTop: spacing.xs,
  },
  logoutText: {
    color: '#FF8A80',
    fontSize: 14,
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: spacing.sm,
  },
});

