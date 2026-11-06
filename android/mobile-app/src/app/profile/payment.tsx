import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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

interface WalletHistoryItem {
  id: number;
  amount: number;
  type: string;
  status: string;
  note: string;
  created_at: string;
}

const BACKEND_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

export default function PaymentMethodsScreen() {
  const { user, token, refreshProfile } = useAuth();
  const [balance, setBalance] = useState(user?.balance || 0);
  const [history, setHistory] = useState<WalletHistoryItem[]>([]);
  const [topUpModal, setTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('50000');
  const [loading, setLoading] = useState(false);

  const loadWallet = async () => {
    if (!token) return;
    try {
      const [wRes, hRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/wallet`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BACKEND_URL}/api/customer/wallet/history`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (wRes.ok) {
        const wData = await wRes.json();
        setBalance(wData.balance || 0);
      }
      if (hRes.ok) {
        const hData = await hRes.json();
        setHistory(hData.transactions || []);
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    loadWallet();
  }, [token]);

  const handleTopUp = async () => {
    const amt = parseInt(topUpAmount, 10);
    if (!amt || amt < 10000) {
      Alert.alert('Perhatian', 'Minimal isi saldo Rp 10.000');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/wallet/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: amt }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengisi saldo');
      }

      setTopUpModal(false);
      Alert.alert('Berhasil', `Isi saldo sebesar Rp ${amt.toLocaleString('id-ID')} berhasil.`);
      await loadWallet();
      await refreshProfile();
    } catch (err) {
      Alert.alert('Gagal', err instanceof Error ? err.message : 'Isi saldo gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" accessibilityLabel="Kembali" onPress={() => router.back()} />
        <DSText variant="headlineBase" style={styles.headerTitle}>
          Metode Pembayaran
        </DSText>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Card Saldo E-Wallet Utama */}
        <Card elevation="soft" padding="none" radius="xl" style={styles.walletCard}>
          <View style={styles.walletInner}>
            <View>
              <DSText variant="labelSm" color={Brand.ink} style={styles.walletLabel}>
                SALDO OPENJEK WALLET
              </DSText>
              <DSText variant="headlineXl" color={Brand.ink} style={styles.walletBalance}>
                Rp {balance.toLocaleString('id-ID')}
              </DSText>
            </View>
            <TouchableOpacity
              style={styles.topUpBtn}
              onPress={() => setTopUpModal(true)}>
              <Icon name="add" size={20} color={Brand.ink} />
              <DSText variant="labelMd" color={Brand.ink} style={styles.topUpText}>
                Isi Saldo
              </DSText>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Pilihan Metode Bayar Lainnya */}
        <View style={styles.section}>
          <DSText variant="headlineSm" style={styles.sectionTitle}>
            Metode Tersedia
          </DSText>
          <Card elevation="soft" padding="none" radius="xl">
            <View style={styles.methodRow}>
              <View style={styles.methodIcon}>
                <Icon name="wallet" size={24} color={Brand.ink} />
              </View>
              <View style={styles.methodInfo}>
                <DSText variant="headlineBaseSemi">OpenJek Wallet</DSText>
                <DSText variant="bodySm" color={Palette.secondary}>
                  Saldo aktif Rp {balance.toLocaleString('id-ID')} (Utama)
                </DSText>
              </View>
              <Icon name="check-circle" size={24} color={Palette.primary} />
            </View>

            <View style={[styles.methodRow, styles.divider]}>
              <View style={[styles.methodIcon, { backgroundColor: Palette.surfaceContainer }]}>
                <Icon name="payments" size={24} color={Palette.secondary} />
              </View>
              <View style={styles.methodInfo}>
                <DSText variant="headlineBaseSemi">Uang Tunai (Cash)</DSText>
                <DSText variant="bodySm" color={Palette.secondary}>
                  Bayar langsung ke driver setelah perjalanan
                </DSText>
              </View>
              <Icon name="check" size={20} color={Palette.surfaceDim} />
            </View>
          </Card>
        </View>

        {/* Riwayat Mutasi Dompet */}
        <View style={styles.section}>
          <DSText variant="headlineSm" style={styles.sectionTitle}>
            Riwayat Transaksi
          </DSText>
          {history.length === 0 ? (
            <Card elevation="soft" padding="md" radius="xl">
              <DSText variant="bodyMd" color={Palette.secondary} style={styles.emptyText}>
                Belum ada riwayat transaksi dompet.
              </DSText>
            </Card>
          ) : (
            <Card elevation="soft" padding="none" radius="xl">
              {history.map((tx, idx) => (
                <View
                  key={tx.id}
                  style={[styles.historyRow, idx !== history.length - 1 && styles.divider]}>
                  <View style={styles.historyInfo}>
                    <DSText variant="bodyMd" style={styles.txType}>
                      {tx.type} · {tx.status}
                    </DSText>
                    <DSText variant="bodySm" color={Palette.secondary}>
                      {tx.note || 'Transaksi e-wallet'}
                    </DSText>
                  </View>
                  <DSText
                    variant="headlineBaseSemi"
                    color={tx.type === 'DEPOSIT' || tx.type === 'REFUND' ? Palette.primary : Palette.onSurface}>
                    {tx.type === 'DEPOSIT' || tx.type === 'REFUND' ? '+' : '-'}Rp{' '}
                    {tx.amount.toLocaleString('id-ID')}
                  </DSText>
                </View>
              ))}
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Modal Top Up Saldo */}
      <Modal visible={topUpModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <DSText variant="headlineBase">Isi Saldo Wallet</DSText>
              <TouchableOpacity onPress={() => setTopUpModal(false)}>
                <Icon name="close" size={24} color={Palette.onSurface} />
              </TouchableOpacity>
            </View>

            <DSText variant="bodyMd" color={Palette.secondary}>
              Pilih atau ketik nominal isi saldo (simulasi instan database):
            </DSText>

            <View style={styles.presetRow}>
              {['20000', '50000', '100000', '200000'].map((nom) => (
                <TouchableOpacity
                  key={nom}
                  style={[
                    styles.presetBtn,
                    topUpAmount === nom && styles.presetBtnActive,
                  ]}
                  onPress={() => setTopUpAmount(nom)}>
                  <DSText
                    variant="labelSm"
                    color={topUpAmount === nom ? Brand.ink : Palette.onSurface}>
                    Rp {parseInt(nom, 10).toLocaleString('id-ID')}
                  </DSText>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              value={topUpAmount}
              onChangeText={setTopUpAmount}
              placeholder="Nominal lainnya (min. 10.000)"
              placeholderTextColor={Palette.secondary}
            />

            <Button
              label={loading ? 'Memproses...' : 'Konfirmasi Isi Saldo'}
              variant="primary"
              size="lg"
              disabled={loading}
              onPress={handleTopUp}
              style={styles.modalSubmit}
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
  walletCard: {
    backgroundColor: Brand.ctaAction,
    padding: Spacing.lg,
  },
  walletInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletLabel: {
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  walletBalance: {
    fontWeight: '800',
    marginTop: Spacing.xs,
  },
  topUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Palette.surfaceContainerLowest,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  topUpText: {
    fontWeight: '700',
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    backgroundColor: Brand.ctaAction + '35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodInfo: {
    flex: 1,
    gap: 2,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.surfaceContainer,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  historyInfo: {
    gap: 2,
  },
  txType: {
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
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
    gap: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  presetBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surfaceContainer,
  },
  presetBtnActive: {
    backgroundColor: Brand.ctaAction,
  },
  modalInput: {
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Palette.surfaceContainerHigh,
    color: Palette.onSurface,
  },
  modalSubmit: {
    marginTop: Spacing.xs,
  },
});
