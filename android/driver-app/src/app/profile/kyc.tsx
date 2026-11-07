import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { KycDocumentItem } from '../../components/profile/KycDocumentItem';
import { useDriver } from '../../hooks/use-driver';
import { colors, rounded, spacing } from '../../constants/theme';
import { KycDocument } from '../../types/driver';

export default function KycScreen() {
  const router = useRouter();
  const { driver } = useDriver();

  const handleUpload = (doc: KycDocument) => {
    Alert.alert(
      `Unggah ${doc.title}`,
      'Pilih foto dokumen yang jelas dari kamera atau galeri untuk diverifikasi.',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Buka Kamera', onPress: () => Alert.alert('Kamera', 'Memuat modul kamera...') },
        { text: 'Pilih dari Galeri', onPress: () => Alert.alert('Galeri', 'Memuat galeri foto...') },
      ]
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
            <Text style={styles.bannerTitle}>Akun Driver Terverifikasi</Text>
            <Text style={styles.bannerSubtitle}>
              Semua berkas identitas resmi Anda telah disetujui oleh tim operasional UmfaGo.
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
