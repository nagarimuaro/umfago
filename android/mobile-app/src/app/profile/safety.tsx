import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ds/button';
import { Card } from '@/components/ds/card';
import { DSText } from '@/components/ds/ds-text';
import { Icon, type IconName } from '@/components/ds/icon';
import { IconButton } from '@/components/ds/icon-button';
import { Brand, Palette, Radius, Spacing } from '@/constants/design-system';

interface SafetyItem {
  id: string;
  icon: IconName;
  title: string;
  desc: string;
}

const SAFETY_FEATURES: SafetyItem[] = [
  {
    id: 'sos',
    icon: 'call',
    title: 'Tombol Darurat (SOS 24/7)',
    desc: 'Langsung hubungi call center kepolisian dan tim respons darurat OpenJek dalam satu sentuhan.',
  },
  {
    id: 'share',
    icon: 'navigation',
    title: 'Bagikan Perjalanan',
    desc: 'Kirim tautan live-tracking perjalanan ke keluarga atau teman terdekat melalui WhatsApp.',
  },
  {
    id: 'pin',
    icon: 'lock',
    title: 'Verifikasi PIN Perjalanan',
    desc: 'Pastikan Anda menaiki kendaraan yang benar dengan mencocokkan 4-digit PIN sebelum jalan.',
  },
  {
    id: 'insurance',
    icon: 'verified-user',
    title: 'Asuransi Perjalanan',
    desc: 'Setiap perjalanan terlindungi asuransi kecelakaan diri dari awal penjemputan hingga tiba.',
  },
];

export default function SafetyCenterScreen() {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" accessibilityLabel="Kembali" onPress={() => router.back()} />
        <DSText variant="headlineBase" style={styles.headerTitle}>
          Pusat Keselamatan
        </DSText>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner SOS Darurat */}
        <Card elevation="soft" padding="none" radius="xl" style={styles.sosCard}>
          <View style={styles.sosInner}>
            <View style={styles.sosIconCircle}>
              <Icon name="verified-user" size={32} color="#ffffff" />
            </View>
            <View style={styles.sosTextWrap}>
              <DSText variant="headlineBase" color="#ffffff">
                Perlindungan Utama Anda
              </DSText>
              <DSText variant="bodySm" color="rgba(255,255,255,0.85)">
                Keamanan dan kenyamanan Anda adalah prioritas nomor satu OpenJek.
              </DSText>
            </View>
          </View>
        </Card>

        {/* Fitur-fitur Keselamatan */}
        <View style={styles.section}>
          <DSText variant="headlineSm" style={styles.sectionTitle}>
            Fitur Keamanan Aktif
          </DSText>
          <Card elevation="soft" padding="none" radius="xl">
            {SAFETY_FEATURES.map((feat, idx) => (
              <View
                key={feat.id}
                style={[styles.featureRow, idx !== SAFETY_FEATURES.length - 1 && styles.divider]}>
                <View style={styles.featureIcon}>
                  <Icon name={feat.icon} size={22} color={Brand.ink} />
                </View>
                <View style={styles.featureInfo}>
                  <DSText variant="headlineBaseSemi">{feat.title}</DSText>
                  <DSText variant="bodySm" color={Palette.secondary}>
                    {feat.desc}
                  </DSText>
                </View>
              </View>
            ))}
          </Card>
        </View>

        <Button
          label="Hubungi Layanan Darurat (110 / 112)"
          variant="danger"
          size="lg"
          icon="call"
          onPress={() => {}}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.edgeMargin,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.surfaceVariant,
    backgroundColor: Palette.surfaceContainerLowest,
  },
  headerTitle: {
    fontWeight: '700',
  },
  spacer: {
    width: 40,
  },
  content: {
    paddingHorizontal: Spacing.edgeMargin,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.xl,
  },
  sosCard: {
    backgroundColor: Palette.primary,
    padding: Spacing.lg,
  },
  sosInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  sosIconCircle: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosTextWrap: {
    flex: 1,
    gap: 4,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.lg,
    backgroundColor: Brand.ctaAction + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureInfo: {
    flex: 1,
    gap: 3,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.surfaceContainer,
  },
});
