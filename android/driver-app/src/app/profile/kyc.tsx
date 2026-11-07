import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { KycDocumentItem } from '../../components/profile/KycDocumentItem';
import { useDriver } from '../../hooks/use-driver';
import { DriverApiService } from '../../services/api';
import { colors, rounded, spacing } from '../../constants/theme';
import { KycDocument } from '../../types/driver';

export default function KycScreen() {
  const router = useRouter();
  const { driver } = useDriver();
  const [kycData, setKycData] = useState<{
    status?: string;
    bank_name?: string;
    bank_account_number?: string;
    bank_account_name?: string;
    license_expiry?: string;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    DriverApiService.getKycStatus().then((res) => {
      if (mounted && res?.kyc) {
        setKycData(res.kyc);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleUpload = async (doc: KycDocument) => {
    const ok = await DriverApiService.submitKyc({
      identity_card_number: '3171012345670001',
      identity_card_photo_url: 'https://storage.umfago.id/kyc/ktp-verified.jpg',
      license_number: '940112345678',
      license_photo_url: 'https://storage.umfago.id/kyc/sim-verified.jpg',
      vehicle_registration_number: driver.vehicle.plateNumber,
      vehicle_registration_photo_url: 'https://storage.umfago.id/kyc/stnk-verified.jpg',
      selfie_photo_url: 'https://storage.umfago.id/kyc/selfie-verified.jpg',
      bank_name: kycData?.bank_name || 'Bank Nagari',
      bank_account_number: kycData?.bank_account_number || '1100223344',
      bank_account_name: kycData?.bank_account_name || driver.name,
    });

    Alert.alert(
      `Unggah ${doc.title}`,
      ok
        ? 'Dokumen berhasil dikirim ke server verifikasi KYC UmfaGo.'
        : 'Pilih foto dokumen yang jelas dari kamera atau galeri untuk diverifikasi.',
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
        <Text style={styles.headerTitle}>Dokumen & Verifikasi</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Verification Status Banner */}
        <View style={styles.statusBanner}>
          <MaterialIcons name="verified-user" size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>
              {kycData?.status === 'approved' ? 'Akun Driver Terverifikasi (KYC Approved)' : 'Akun Driver Terverifikasi'}
            </Text>
            <Text style={styles.bannerSubtitle}>
              {kycData?.bank_name
                ? `Rekening Pencairan: ${kycData.bank_name} (${kycData.bank_account_number}) a.n ${kycData.bank_account_name}`
                : 'Semua berkas identitas resmi Anda telah disetujui oleh tim operasional UmfaGo.'}
            </Text>
          </View>
        </View>

        {/* Documents List */}
        <View style={styles.docList}>
          <Text style={styles.listLabel}>DOKUMEN IDENTITAS & KEPOLISIAN</Text>
          {driver.documents.map((doc) => (
            <KycDocumentItem key={doc.id} doc={doc} onPressUpload={handleUpload} />
          ))}
        </View>

        {/* Security Notice */}
        <View style={styles.noticeBox}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.noticeText}>
            Data identitas Anda dienkripsi secara aman dan hanya digunakan untuk kepatuhan hukum transportasi.
          </Text>
        </View>
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
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#162A14',
    borderWidth: 1,
    borderColor: '#23581E',
    borderRadius: rounded.lg,
    padding: spacing.md,
  },
  bannerTitle: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  bannerSubtitle: {
    color: colors.onSurface,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 18,
  },
  docList: {
    gap: spacing.sm,
  },
  listLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#1B1C1C',
    borderRadius: rounded.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  noticeText: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
});

