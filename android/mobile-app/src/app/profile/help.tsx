import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ds/button';
import { Card } from '@/components/ds/card';
import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { IconButton } from '@/components/ds/icon-button';
import { Brand, Palette, Radius, Spacing } from '@/constants/design-system';
import { useAuth } from '@/hooks/use-auth';
import { ENV } from '@/constants/env';

const BACKEND_URL = ENV.API_URL;

interface FAQItem {
  id: string;
  q: string;
  a: string;
}

const FAQ_LIST: FAQItem[] = [
  {
    id: '1',
    q: 'Bagaimana cara memesan perjalanan?',
    a: 'Pilih layanan Motor atau Mobil di menu utama, tentukan lokasi jemput dan tujuan Anda, pilih metode bayar (Tunai atau E-Wallet), lalu tekan Pesan Sekarang.',
  },
  {
    id: '2',
    q: 'Bagaimana jika saldo terpotong saat order dibatalkan?',
    a: 'Sistem UmfaGo secara otomatis mengembalikan dana penuh ke dompet Anda seketika setelah order berstatus dibatalkan.',
  },
  {
    id: '3',
    q: 'Bagaimana cara menggunakan kode promo?',
    a: 'Di halaman konfirmasi perjalanan, ketuk baris Promo/Voucher lalu masukkan kode promo aktif seperti HEMAT10 atau DISKON20.',
  },
  {
    id: '4',
    q: 'Barang saya tertinggal di kendaraan driver, apa yang harus dilakukan?',
    a: 'Segera buat tiket bantuan melalui tombol Kirim Tiket Bantuan di bawah dengan menyertakan perkiraan waktu dan rincian barang.',
  },
];

export default function HelpSupportScreen() {
  const { user, token } = useAuth();
  const [ticketModal, setTicketModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('ride_issue');
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>('1');

  const handleSubmitTicket = async () => {
    if (!subject.trim() || !desc.trim()) {
      Alert.alert('Perhatian', 'Subjek dan penjelasan masalah wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      if (token) {
        await fetch(`${BACKEND_URL}/api/support/tickets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            category,
            subject: subject.trim(),
            description: desc.trim(),
          }),
        });
      }
      Alert.alert(
        'Tiket Diterima',
        'Laporan Anda berhasil dikirim ke tim Customer Service UmfaGo. Kami akan menindaklanjuti keluhan Anda.',
      );
      setTicketModal(false);
      setSubject('');
      setDesc('');
    } catch {
      Alert.alert('Gagal Mengirim', 'Koneksi ke server terganggu. Silakan coba kembali.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" accessibilityLabel="Kembali" onPress={() => router.back()} />
        <DSText variant="headlineBase" style={styles.headerTitle}>
          Bantuan & Dukungan
        </DSText>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hubungi Tim CS */}
        <Card elevation="soft" padding="none" radius="xl" style={styles.contactCard}>
          <View style={styles.contactInner}>
            <View style={styles.contactIconCircle}>
              <Icon name="chat" size={28} color={Brand.ink} />
            </View>
            <View style={styles.contactText}>
              <DSText variant="headlineBase">Punya Kendala Perjalanan?</DSText>
              <DSText variant="bodySm" color={Palette.secondary}>
                Tim Customer Support UmfaGo siap membantu kendala akun, transaksi, atau keamanan.
              </DSText>
            </View>
          </View>
          <Button
            label="Kirim Tiket Bantuan CS"
            variant="primary"
            size="md"
            onPress={() => setTicketModal(true)}
            style={styles.ticketBtn}
          />
        </Card>

        {/* FAQ Accordion */}
        <View style={styles.section}>
          <DSText variant="headlineSm" style={styles.sectionTitle}>
            Pertanyaan Sering Diajukan (FAQ)
          </DSText>
          <Card elevation="soft" padding="none" radius="xl">
            {FAQ_LIST.map((faq, idx) => {
              const isExpanded = expandedId === faq.id;
              return (
                <View key={faq.id} style={idx !== FAQ_LIST.length - 1 && styles.divider}>
                  <TouchableOpacity
                    style={styles.faqHeader}
                    onPress={() => setExpandedId(isExpanded ? null : faq.id)}>
                    <DSText variant="headlineBaseSemi" style={styles.faqQuestion}>
                      {faq.q}
                    </DSText>
                    <Icon
                      name={isExpanded ? 'expand-less' : 'expand-more'}
                      size={24}
                      color={Palette.secondary}
                    />
                  </TouchableOpacity>
                  {isExpanded ? (
                    <View style={styles.faqBody}>
                      <DSText variant="bodyMd" color={Palette.secondary} style={styles.faqAnswer}>
                        {faq.a}
                      </DSText>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </Card>
        </View>
      </ScrollView>

      {/* Modal Kirim Tiket */}
      <Modal visible={ticketModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalTop}>
              <DSText variant="headlineBase">Buat Tiket Bantuan</DSText>
              <TouchableOpacity onPress={() => setTicketModal(false)}>
                <Icon name="close" size={24} color={Palette.onSurface} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <DSText variant="labelMd">Topik Masalah</DSText>
              <TextInput
                style={styles.input}
                placeholder="Misal: Kendala pembayaran atau barang tertinggal"
                placeholderTextColor={Palette.secondary}
                value={subject}
                onChangeText={setSubject}
              />
            </View>

            <View style={styles.formGroup}>
              <DSText variant="labelMd">Penjelasan Lengkap</DSText>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={4}
                placeholder="Tuliskan detail kronologi kejadian..."
                placeholderTextColor={Palette.secondary}
                value={desc}
                onChangeText={setDesc}
              />
            </View>

            <Button
              label={loading ? 'Mengirim...' : 'Kirim Tiket Laporan'}
              variant="primary"
              size="lg"
              disabled={loading}
              onPress={handleSubmitTicket}
              style={styles.submitBtn}
            />
          </View>
        </View>
      </Modal>
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
  contactCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  contactInner: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  contactIconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Brand.ctaAction,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactText: {
    flex: 1,
    gap: 2,
  },
  ticketBtn: {
    width: '100%',
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  faqQuestion: {
    flex: 1,
  },
  faqBody: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  faqAnswer: {
    lineHeight: 22,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.surfaceContainer,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Palette.surfaceContainerLowest,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  modalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  formGroup: {
    gap: Spacing.xs,
  },
  input: {
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Palette.surfaceContainerHigh,
    color: Palette.onSurface,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitBtn: {
    marginTop: Spacing.sm,
  },
});
