import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  RefreshControl,
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
import { Icon, type IconName } from '@/components/ds/icon';
import { IconButton } from '@/components/ds/icon-button';
import { formatRupiah } from '@/constants/booking';
import { Brand, FontFamily, Overlay, Palette, Radius, Sizes, Spacing } from '@/constants/design-system';
import { useAuth } from '@/hooks/use-auth';
import {
  fetchWalletBalance,
  fetchWalletHistory,
  formatTransactionDate,
  requestDeposit,
  requestPayPPOB,
  requestTransfer,
  type WalletTransactionItem,
} from '@/services/wallet';

const PRESET_TOPUP_AMOUNTS = ['20000', '50000', '100000', '200000', '500000'];

export interface PPOBProduct {
  id: string;
  name: string;
  nominal: number;
  price: number;
}

export interface PPOBServiceItem {
  id: string;
  name: string;
  label: string;
  icon: IconName;
  color: string;
  bg: string;
  placeholder: string;
  inputLabel: string;
  keyboardType?: 'phone-pad' | 'number-pad' | 'default';
  products: PPOBProduct[];
}

export const PPOB_SERVICES: PPOBServiceItem[] = [
  {
    id: 'PULSA',
    name: 'Pulsa Seluler',
    label: 'Pulsa',
    icon: 'smartphone',
    color: '#2563eb',
    bg: '#eff6ff',
    inputLabel: 'Nomor Handphone',
    placeholder: 'Contoh: 081234567890',
    keyboardType: 'phone-pad',
    products: [
      { id: 'p10', name: 'Pulsa Rp 10.000', nominal: 10000, price: 11000 },
      { id: 'p25', name: 'Pulsa Rp 25.000', nominal: 25000, price: 26000 },
      { id: 'p50', name: 'Pulsa Rp 50.000', nominal: 50000, price: 51000 },
      { id: 'p100', name: 'Pulsa Rp 100.000', nominal: 100000, price: 101000 },
    ],
  },
  {
    id: 'DATA',
    name: 'Paket Data Internet',
    label: 'Paket Data',
    icon: 'wifi',
    color: '#0284c7',
    bg: '#f0f9ff',
    inputLabel: 'Nomor Handphone',
    placeholder: 'Contoh: 081234567890',
    keyboardType: 'phone-pad',
    products: [
      { id: 'd5', name: 'Data 5 GB (30 Hari)', nominal: 25000, price: 25000 },
      { id: 'd15', name: 'Data 15 GB (30 Hari)', nominal: 50000, price: 50000 },
      { id: 'd30', name: 'Data 30 GB (30 Hari)', nominal: 85000, price: 85000 },
      { id: 'd50', name: 'Data 50 GB (30 Hari)', nominal: 120000, price: 120000 },
    ],
  },
  {
    id: 'PLN',
    name: 'Token & Tagihan Listrik PLN',
    label: 'Listrik PLN',
    icon: 'bolt',
    color: '#ca8a04',
    bg: '#fefce8',
    inputLabel: 'ID Pelanggan / No. Meter',
    placeholder: 'Contoh: 14234567890',
    keyboardType: 'number-pad',
    products: [
      { id: 'pln20', name: 'Token PLN Rp 20.000', nominal: 20000, price: 21500 },
      { id: 'pln50', name: 'Token PLN Rp 50.000', nominal: 50000, price: 51500 },
      { id: 'pln100', name: 'Token PLN Rp 100.000', nominal: 100000, price: 101500 },
      { id: 'pln200', name: 'Token PLN Rp 200.000', nominal: 200000, price: 201500 },
    ],
  },
  {
    id: 'BPJS',
    name: 'Iuran BPJS Kesehatan',
    label: 'BPJS',
    icon: 'health-and-safety',
    color: '#16a34a',
    bg: '#f0fdf4',
    inputLabel: 'Nomor Kartu BPJS / VA',
    placeholder: 'Contoh: 0001234567890',
    keyboardType: 'number-pad',
    products: [
      { id: 'bpjs1', name: 'Kelas 3 (1 Bulan)', nominal: 35000, price: 35000 },
      { id: 'bpjs2', name: 'Kelas 2 (1 Bulan)', nominal: 100000, price: 100000 },
      { id: 'bpjs3', name: 'Kelas 1 (1 Bulan)', nominal: 150000, price: 150000 },
    ],
  },
  {
    id: 'PDAM',
    name: 'Tagihan Air PDAM',
    label: 'Air PDAM',
    icon: 'water-drop',
    color: '#0891b2',
    bg: '#ecfeff',
    inputLabel: 'Nomor Pelanggan PDAM',
    placeholder: 'Contoh: 10293847',
    keyboardType: 'number-pad',
    products: [
      { id: 'pdam1', name: 'Tagihan Standar 1 Bulan', nominal: 45000, price: 47500 },
      { id: 'pdam2', name: 'Tagihan Pemakaian Tinggi', nominal: 85000, price: 87500 },
      { id: 'pdam3', name: 'Tagihan Niaga / Toko', nominal: 150000, price: 152500 },
    ],
  },
  {
    id: 'INTERNET',
    name: 'Internet & TV Kabel',
    label: 'Internet & TV',
    icon: 'tv',
    color: '#9333ea',
    bg: '#faf5ff',
    inputLabel: 'ID Pelanggan Internet',
    placeholder: 'Contoh: 123891029',
    keyboardType: 'number-pad',
    products: [
      { id: 'net1', name: 'Paket Hemat 30 Mbps', nominal: 180000, price: 182500 },
      { id: 'net2', name: 'Paket Cepat 50 Mbps', nominal: 280000, price: 282500 },
      { id: 'net3', name: 'Paket Ultra 100 Mbps', nominal: 420000, price: 422500 },
    ],
  },
  {
    id: 'GAME',
    name: 'Voucher & Top Up Game',
    label: 'Voucher Game',
    icon: 'sports-esports',
    color: '#dc2626',
    bg: '#fef2f2',
    inputLabel: 'ID Akun / User ID Game',
    placeholder: 'Contoh: 12345678 (2041)',
    keyboardType: 'default',
    products: [
      { id: 'gm1', name: '86 Diamonds / Poin', nominal: 20000, price: 21000 },
      { id: 'gm2', name: '257 Diamonds / Poin', nominal: 60000, price: 62000 },
      { id: 'gm3', name: '706 Diamonds / Poin', nominal: 150000, price: 155000 },
      { id: 'gm4', name: 'Weekly Diamond Pass', nominal: 28000, price: 29000 },
    ],
  },
  {
    id: 'PAJAK',
    name: 'PBB & Pajak Daerah',
    label: 'PBB & Pajak',
    icon: 'receipt-long',
    color: '#ea580c',
    bg: '#fff7ed',
    inputLabel: 'Nomor Objek Pajak (NOP)',
    placeholder: 'Contoh: 327301000100100010',
    keyboardType: 'number-pad',
    products: [
      { id: 'pbb1', name: 'Tagihan PBB Tahun Berjalan', nominal: 120000, price: 122500 },
      { id: 'pbb2', name: 'Tagihan PBB + Denda', nominal: 210000, price: 212500 },
    ],
  },
];

type FilterTab = 'ALL' | 'DEPOSIT' | 'PAYMENT' | 'TRANSFER' | 'REFUND';

/** Helper dialog cross-platform yang bekerja di Expo Web maupun iOS/Android */
function notify(title: string, message: string, onOk?: () => void) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    onOk?.();
  } else {
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
  }
}

export default function PaymentMethodsScreen() {
  const { user, token, refreshProfile } = useAuth();
  const params = useLocalSearchParams<{ action?: string }>();

  const [balance, setBalance] = useState<number>(user?.balance ?? 0);
  const [history, setHistory] = useState<WalletTransactionItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');

  const [refreshing, setRefreshing] = useState(false);
  const [loadingTopUp, setLoadingTopUp] = useState(false);
  const [loadingTransfer, setLoadingTransfer] = useState(false);

  // Modal Top Up
  const [topUpModal, setTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('50000');
  const [errorTopUp, setErrorTopUp] = useState<string | null>(null);

  // Modal Transfer Saldo ke Pengguna Lain (P2P)
  const [transferModal, setTransferModal] = useState(false);
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState('50000');
  const [transferNote, setTransferNote] = useState('');
  const [errorTransfer, setErrorTransfer] = useState<string | null>(null);

  // Modal Pembayaran Layanan PPOB
  const [ppobModal, setPpobModal] = useState(false);
  const [selectedPPOB, setSelectedPPOB] = useState<PPOBServiceItem>(PPOB_SERVICES[0]);
  const [selectedProduct, setSelectedProduct] = useState<PPOBProduct>(PPOB_SERVICES[0].products[0]);
  const [ppobCustNo, setPpobCustNo] = useState('');
  const [loadingPPOB, setLoadingPPOB] = useState(false);
  const [errorPPOB, setErrorPPOB] = useState<string | null>(null);

  const handleSelectPPOB = (item: PPOBServiceItem) => {
    setSelectedPPOB(item);
    setSelectedProduct(item.products[0]);
    setPpobCustNo('');
    setErrorPPOB(null);
    setPpobModal(true);
  };

  // Muat data saldo dan riwayat transaksi dari backend
  const loadWalletData = useCallback(
    async (filter: FilterTab = activeFilter) => {
      if (!token) return;
      try {
        const [balRes, histRes] = await Promise.all([
          fetchWalletBalance(token).catch(() => ({ balance: 0, currency: 'IDR' })),
          fetchWalletHistory(token, {
            type: filter === 'ALL' ? undefined : filter,
            per_page: 30,
          }).catch(() => ({ transactions: [] })),
        ]);

        if (typeof balRes.balance === 'number') {
          setBalance(balRes.balance);
        }
        if (Array.isArray(histRes.transactions)) {
          setHistory(histRes.transactions);
        }
      } catch {
        // Fallback jika jaringan offline
      }
    },
    [token]
  );

  useEffect(() => {
    loadWalletData(activeFilter);
  }, [loadWalletData, activeFilter]);

  // Buka modal otomatis bila dipanggil via query param (misal dari tombol Home Top Up / Transfer)
  useEffect(() => {
    if (params.action === 'topup') {
      setErrorTopUp(null);
      setTopUpModal(true);
    } else if (params.action === 'transfer') {
      setErrorTransfer(null);
      setTransferModal(true);
    }
  }, [params.action]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadWalletData(activeFilter), refreshProfile().catch(() => {})]);
    setRefreshing(false);
  };

  // Handler Top Up via backend Midtrans / Mode Simulasi
  const handleTopUpSubmit = async () => {
    setErrorTopUp(null);
    const amt = parseInt(topUpAmount, 10);
    if (!amt || isNaN(amt) || amt < 10000) {
      const err = 'Minimal isi saldo adalah Rp 10.000';
      setErrorTopUp(err);
      notify('Perhatian', err);
      return;
    }

    if (!token) {
      const err = 'Silakan masuk terlebih dahulu';
      setErrorTopUp(err);
      notify('Perhatian', err);
      return;
    }

    setLoadingTopUp(true);
    try {
      const data = await requestDeposit(token, amt);
      setTopUpModal(false);

      if (data.redirect_url) {
        if (Platform.OS === 'web') {
          window.open(data.redirect_url, '_blank');
        } else {
          Alert.alert(
            'Pembayaran Dibuat',
            'Silakan selesaikan pembayaran di halaman Midtrans yang akan terbuka.',
            [
              {
                text: 'Buka Pembayaran',
                onPress: () => Linking.openURL(data.redirect_url!),
              },
            ]
          );
        }
      } else {
        // Mode Simulasi (dev/test)
        const newBal = data.new_balance ?? balance + amt;
        setBalance(newBal);
        notify(
          'Top Up Berhasil',
          `Saldo sebesar ${formatRupiah(amt)} berhasil ditambahkan ke dompet Anda.`
        );
      }

      await loadWalletData(activeFilter);
      await refreshProfile();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Isi saldo gagal';
      setErrorTopUp(msg);
      notify('Gagal', msg);
    } finally {
      setLoadingTopUp(false);
    }
  };

  // Handler Transfer Saldo ke Pengguna Lain (P2P)
  const handleTransferSubmit = async () => {
    setErrorTransfer(null);
    const target = transferRecipient.trim();
    if (!target) {
      const err = 'Masukkan nomor HP atau email penerima';
      setErrorTransfer(err);
      notify('Perhatian', err);
      return;
    }

    const amt = parseInt(transferAmount, 10);
    if (!amt || isNaN(amt) || amt < 10000) {
      const err = 'Minimal transfer adalah Rp 10.000';
      setErrorTransfer(err);
      notify('Perhatian', err);
      return;
    }

    if (amt > balance) {
      const err = `Saldo tidak mencukupi (Saldo Anda: ${formatRupiah(balance)})`;
      setErrorTransfer(err);
      notify('Saldo Tidak Cukup', err);
      return;
    }

    if (!token) {
      const err = 'Silakan masuk terlebih dahulu';
      setErrorTransfer(err);
      notify('Perhatian', err);
      return;
    }

    setLoadingTransfer(true);
    try {
      const res = await requestTransfer(token, {
        recipient: target,
        amount: amt,
        note: transferNote.trim() || undefined,
      });

      setTransferModal(false);
      setTransferRecipient('');
      setTransferNote('');

      const recipientDisplay = res.recipient?.name
        ? `${res.recipient.name} (${res.recipient.phone || res.recipient.email || target})`
        : target;

      notify(
        'Transfer Berhasil',
        `Berhasil mentransfer ${formatRupiah(amt)} ke ${recipientDisplay}.\nSisa saldo Anda: ${formatRupiah(res.new_balance ?? balance - amt)}`
      );

      if (typeof res.new_balance === 'number') {
        setBalance(res.new_balance);
      }
      await Promise.all([loadWalletData(activeFilter), refreshProfile().catch(() => {})]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transfer gagal diproses';
      setErrorTransfer(msg);
      notify('Gagal', msg);
    } finally {
      setLoadingTransfer(false);
    }
  };

  // Handler Pembayaran Layanan PPOB via OpenPay
  const handlePPOBSubmit = async () => {
    setErrorPPOB(null);
    const custNo = ppobCustNo.trim();
    if (!custNo) {
      const err = `Harap masukkan ${selectedPPOB.inputLabel.toLowerCase()}`;
      setErrorPPOB(err);
      notify('Perhatian', err);
      return;
    }

    if (selectedProduct.price > balance) {
      const err = `Saldo OpenPay Anda tidak mencukupi (Saldo aktif: ${formatRupiah(balance)}). Silakan lakukan Top Up terlebih dahulu.`;
      setErrorPPOB(err);
      notify('Saldo Tidak Cukup', err);
      return;
    }

    if (!token) {
      const err = 'Silakan masuk terlebih dahulu';
      setErrorPPOB(err);
      notify('Perhatian', err);
      return;
    }

    setLoadingPPOB(true);
    try {
      const res = await requestPayPPOB(token, {
        service: selectedPPOB.id,
        customer_no: custNo,
        amount: selectedProduct.price,
        product_name: selectedProduct.name,
      });

      setPpobModal(false);
      setPpobCustNo('');

      notify(
        'Pembayaran Berhasil!',
        `Pembayaran ${selectedProduct.name} ke nomor ${custNo} senilai ${formatRupiah(selectedProduct.price)} telah berhasil menggunakan saldo OpenPay.\nSisa saldo: ${formatRupiah(res.new_balance ?? balance - selectedProduct.price)}`
      );

      if (typeof res.new_balance === 'number') {
        setBalance(res.new_balance);
      }
      await Promise.all([loadWalletData(activeFilter), refreshProfile().catch(() => {})]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Pembayaran PPOB gagal';
      setErrorPPOB(msg);
      notify('Gagal', msg);
    } finally {
      setLoadingPPOB(false);
    }
  };

  const getTxTypeLabel = (tx: WalletTransactionItem) => {
    const t = tx.type?.toUpperCase();
    switch (t) {
      case 'DEPOSIT':
        return 'Isi Saldo (Top Up)';
      case 'PAYMENT':
        if (tx.note?.toLowerCase().includes('ppob')) {
          return 'Pembayaran PPOB';
        }
        return 'Pembayaran Order';
      case 'REFUND':
        return 'Pengembalian Dana';
      case 'TRANSFER':
        return tx.note?.toLowerCase().startsWith('transfer dari')
          ? 'Transfer Masuk'
          : 'Transfer Keluar';
      case 'EARNING':
        return 'Pendapatan';
      case 'FEE':
        return 'Biaya Layanan';
      case 'BONUS':
        return 'Bonus Promo';
      default:
        return tx.type || 'Transaksi';
    }
  };

  const isCreditType = (tx: WalletTransactionItem) => {
    const t = tx.type?.toUpperCase();
    if (t === 'TRANSFER') {
      return tx.note?.toLowerCase().startsWith('transfer dari');
    }
    return t === 'DEPOSIT' || t === 'REFUND' || t === 'EARNING' || t === 'BONUS';
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'SUCCESS') {
      return { text: 'BERHASIL', bg: '#dcfce7', color: '#15803d' };
    }
    if (s === 'PENDING') {
      return { text: 'MENUNGGU', bg: '#fef3c7', color: '#b45309' };
    }
    return { text: 'GAGAL', bg: '#fee2e2', color: '#b91c1c' };
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      {/* Header Bar */}
      <View style={styles.header}>
        <IconButton icon="arrow-back" accessibilityLabel="Kembali" onPress={() => router.back()} />
        <DSText variant="headlineBase" style={styles.headerTitle}>
          OpenPay & Layanan PPOB
        </DSText>
        <IconButton
          icon="refresh"
          accessibilityLabel="Refresh Saldo"
          onPress={onRefresh}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Card Saldo E-Wallet Utama */}
        <Card
          level={2}
          elevation="floating"
          radius="xl"
          padding="edgeMargin"
          background={Palette.onBackground}
          style={styles.mainWalletCard}>
          <View style={[styles.cardDecoration, { pointerEvents: 'none' }]} />

          <View style={styles.walletHeader}>
            <View>
              <DSText variant="labelSm" color={Palette.surfaceContainer}>
                SALDO OPENPAY AKTIF
              </DSText>
              <DSText
                variant="headlineLgMobile"
                color={Palette.surfaceContainerLowest}
                style={styles.balanceText}>
                {formatRupiah(balance)}
              </DSText>
            </View>
            <View style={styles.walletIconCircle}>
              <Icon
                name="account-balance-wallet"
                size={Sizes.iconLg}
                color={Brand.ctaAction}
              />
            </View>
          </View>

          {/* Quick Action Buttons */}
          <View style={styles.walletActions}>
            <Button
              label="Isi Saldo"
              icon="add-circle"
              variant="primary"
              size="sm"
              onPress={() => {
                setErrorTopUp(null);
                setTopUpModal(true);
              }}
              style={styles.actionBtn}
            />
            <Button
              label="Transfer Saldo"
              icon="send"
              variant="surface"
              size="sm"
              onPress={() => {
                setErrorTransfer(null);
                setTransferModal(true);
              }}
              style={styles.actionBtn}
            />
          </View>
        </Card>

        {/* Layanan PPOB & Tagihan */}
        <View style={styles.section}>
          <View style={styles.ppobHeader}>
            <DSText variant="headlineSm" style={styles.sectionTitle}>
              Layanan PPOB & Tagihan
            </DSText>
            <DSText variant="labelSm" color={Palette.primary}>
              Bayar Instan
            </DSText>
          </View>

          <Card elevation="soft" padding="md" radius="xl">
            <View style={styles.ppobGrid}>
              {PPOB_SERVICES.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.ppobItem}
                  activeOpacity={0.7}
                  onPress={() => handleSelectPPOB(item)}>
                  <View style={[styles.ppobIconCircle, { backgroundColor: item.bg }]}>
                    <Icon name={item.icon} size={24} color={item.color} />
                  </View>
                  <DSText variant="labelSm" style={styles.ppobLabel} numberOfLines={1}>
                    {item.label}
                  </DSText>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        </View>

        {/* Riwayat Mutasi Dompet */}
        <View style={styles.section}>
          <View style={styles.historyHeader}>
            <DSText variant="headlineSm" style={styles.sectionTitle}>
              Riwayat Transaksi
            </DSText>
          </View>

          {/* Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterBar}>
            {(
              [
                { id: 'ALL', label: 'Semua' },
                { id: 'DEPOSIT', label: 'Top Up' },
                { id: 'PAYMENT', label: 'Pembayaran' },
                { id: 'TRANSFER', label: 'Transfer' },
                { id: 'REFUND', label: 'Pengembalian' },
              ] as const
            ).map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveFilter(tab.id)}
                style={[
                  styles.filterChip,
                  activeFilter === tab.id && styles.filterChipActive,
                ]}>
                <DSText
                  variant="labelSm"
                  color={activeFilter === tab.id ? Brand.ink : Palette.secondary}>
                  {tab.label}
                </DSText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {history.length === 0 ? (
            <Card elevation="soft" padding="lg" radius="xl" style={styles.emptyCard}>
              <Icon name="receipt-long" size={40} color={Palette.surfaceContainerHighest} />
              <DSText variant="bodyMd" color={Palette.secondary} style={styles.emptyText}>
                Belum ada catatan transaksi pada kategori ini.
              </DSText>
            </Card>
          ) : (
            <Card elevation="soft" padding="none" radius="xl">
              {history.map((tx, idx) => {
                const isCredit = isCreditType(tx);
                const badge = getStatusBadge(tx.status);
                const isLast = idx === history.length - 1;

                return (
                  <View
                    key={tx.id}
                    style={[styles.historyRow, !isLast && styles.divider]}>
                    <View
                      style={[
                        styles.historyIconDisc,
                        {
                          backgroundColor: isCredit
                            ? '#dcfce7'
                            : Palette.surfaceContainer,
                        },
                      ]}>
                      <Icon
                        name={isCredit ? 'arrow-downward' : 'arrow-upward'}
                        size={18}
                        color={isCredit ? '#15803d' : Palette.onSurface}
                      />
                    </View>

                    <View style={styles.historyInfo}>
                      <View style={styles.historyTypeRow}>
                        <DSText variant="headlineBaseSemi" style={styles.txTitle}>
                          {getTxTypeLabel(tx)}
                        </DSText>
                        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                          <DSText
                            variant="labelSm"
                            color={badge.color}
                            style={styles.statusBadgeText}>
                            {badge.text}
                          </DSText>
                        </View>
                      </View>

                      <DSText variant="bodySm" color={Palette.secondary} numberOfLines={1}>
                        {tx.note || 'Transaksi OpenPay'}
                      </DSText>

                      <DSText variant="labelSm" color={Palette.outline}>
                        {formatTransactionDate(tx.created_at)}
                      </DSText>
                    </View>

                    <DSText
                      variant="headlineBaseSemi"
                      color={isCredit ? '#15803d' : Palette.onSurface}
                      style={styles.amountText}>
                      {isCredit ? '+' : '-'}
                      {formatRupiah(tx.amount)}
                    </DSText>
                  </View>
                );
              })}
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Modal Top Up Saldo */}
      <Modal visible={topUpModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitle}>
                <Icon name="add-circle" size={24} color={Brand.ink} />
                <DSText variant="headlineBase">Isi Saldo OpenPay</DSText>
              </View>
              <TouchableOpacity
                onPress={() => setTopUpModal(false)}
                accessibilityLabel="Tutup modal">
                <Icon name="close" size={24} color={Palette.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {errorTopUp ? (
                <View style={styles.errorBox}>
                  <Icon name="error" size={18} color="#b91c1c" />
                  <DSText variant="bodySm" color="#b91c1c" style={styles.errorText}>
                    {errorTopUp}
                  </DSText>
                </View>
              ) : null}

              <DSText variant="bodyMd" color={Palette.secondary}>
                Pilih nominal instan atau masukkan jumlah yang Anda inginkan (min. Rp 10.000):
              </DSText>

              {/* Nominal Chips */}
              <View style={styles.presetRow}>
                {PRESET_TOPUP_AMOUNTS.map((nom) => (
                  <TouchableOpacity
                    key={nom}
                    style={[
                      styles.presetBtn,
                      topUpAmount === nom && styles.presetBtnActive,
                    ]}
                    onPress={() => {
                      setErrorTopUp(null);
                      setTopUpAmount(nom);
                    }}>
                    <DSText
                      variant="labelSm"
                      color={topUpAmount === nom ? Brand.ink : Palette.onSurface}>
                      {formatRupiah(parseInt(nom, 10))}
                    </DSText>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Input Nominal Bebas */}
              <View style={styles.inputWrapper}>
                <DSText variant="labelSm" color={Palette.secondary}>
                  Nominal Top Up (Rp)
                </DSText>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="number-pad"
                  value={topUpAmount}
                  onChangeText={(val) => {
                    setErrorTopUp(null);
                    setTopUpAmount(val.replace(/[^0-9]/g, ''));
                  }}
                  placeholder="Contoh: 100000"
                  placeholderTextColor={Palette.secondary}
                />
              </View>

              <Button
                label={loadingTopUp ? 'Memproses...' : 'Lanjutkan Top Up'}
                variant="primary"
                size="lg"
                disabled={loadingTopUp}
                onPress={handleTopUpSubmit}
                style={styles.modalSubmit}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Transfer Saldo ke Pengguna Lain (P2P) */}
      <Modal visible={transferModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitle}>
                <Icon name="send" size={24} color={Brand.ink} />
                <DSText variant="headlineBase">Transfer Saldo OpenPay</DSText>
              </View>
              <TouchableOpacity
                onPress={() => setTransferModal(false)}
                accessibilityLabel="Tutup modal">
                <Icon name="close" size={24} color={Palette.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {errorTransfer ? (
                <View style={styles.errorBox}>
                  <Icon name="error" size={18} color="#b91c1c" />
                  <DSText variant="bodySm" color="#b91c1c" style={styles.errorText}>
                    {errorTransfer}
                  </DSText>
                </View>
              ) : null}

              <View style={styles.balanceInfoBox}>
                <DSText variant="labelSm" color={Palette.secondary}>
                  Saldo Aktif Anda
                </DSText>
                <DSText variant="headlineBaseSemi" color={Brand.ink}>
                  {formatRupiah(balance)}
                </DSText>
                {balance < 10000 ? (
                  <DSText variant="bodySm" color="#b91c1c">
                    * Minimal saldo untuk transfer adalah Rp 10.000.
                  </DSText>
                ) : null}
              </View>

              {/* Penerima Transfer */}
              <View style={styles.inputWrapper}>
                <DSText variant="labelSm" color={Palette.secondary}>
                  Penerima (Nomor HP atau Email Terdaftar)
                </DSText>
                <TextInput
                  style={styles.modalInput}
                  value={transferRecipient}
                  onChangeText={(val) => {
                    setErrorTransfer(null);
                    setTransferRecipient(val);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Contoh: 08123456789 atau user@mail.com"
                  placeholderTextColor={Palette.secondary}
                />
              </View>

              {/* Nominal Transfer */}
              <View style={styles.inputWrapper}>
                <View style={styles.rowBetween}>
                  <DSText variant="labelSm" color={Palette.secondary}>
                    Nominal Transfer (Rp)
                  </DSText>
                  {balance >= 10000 ? (
                    <TouchableOpacity
                      onPress={() => {
                        setErrorTransfer(null);
                        setTransferAmount(String(balance));
                      }}>
                      <DSText variant="labelSm" color={Palette.primary}>
                        Transfer Semua ({formatRupiah(balance)})
                      </DSText>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Quick amount chips */}
                <View style={styles.presetRow}>
                  {['10000', '20000', '50000', '100000'].map((nom) => {
                    const n = parseInt(nom, 10);
                    const disabled = n > balance;
                    return (
                      <TouchableOpacity
                        key={nom}
                        disabled={disabled}
                        style={[
                          styles.presetBtn,
                          transferAmount === nom && styles.presetBtnActive,
                          disabled && { opacity: 0.4 },
                        ]}
                        onPress={() => {
                          setErrorTransfer(null);
                          setTransferAmount(nom);
                        }}>
                        <DSText
                          variant="labelSm"
                          color={transferAmount === nom ? Brand.ink : Palette.onSurface}>
                          {formatRupiah(n)}
                        </DSText>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TextInput
                  style={styles.modalInput}
                  keyboardType="number-pad"
                  value={transferAmount}
                  onChangeText={(val) => {
                    setErrorTransfer(null);
                    setTransferAmount(val.replace(/[^0-9]/g, ''));
                  }}
                  placeholder="Contoh: 50000 (min. 10.000)"
                  placeholderTextColor={Palette.secondary}
                />
              </View>

              {/* Catatan Transfer */}
              <View style={styles.inputWrapper}>
                <DSText variant="labelSm" color={Palette.secondary}>
                  Catatan (Opsional)
                </DSText>
                <TextInput
                  style={styles.modalInput}
                  value={transferNote}
                  onChangeText={setTransferNote}
                  placeholder="Contoh: Bayar patungan makan siang"
                  placeholderTextColor={Palette.secondary}
                />
              </View>

              <Button
                label={loadingTransfer ? 'Memproses...' : 'Kirim Saldo'}
                variant="primary"
                size="lg"
                disabled={loadingTransfer || balance < 10000}
                onPress={handleTransferSubmit}
                style={styles.modalSubmit}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Pembayaran Layanan PPOB */}
      <Modal visible={ppobModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitle}>
                <View style={[styles.ppobModalIconCircle, { backgroundColor: selectedPPOB.bg }]}>
                  <Icon name={selectedPPOB.icon} size={22} color={selectedPPOB.color} />
                </View>
                <DSText variant="headlineBase">{selectedPPOB.name}</DSText>
              </View>
              <TouchableOpacity
                onPress={() => setPpobModal(false)}
                accessibilityLabel="Tutup modal">
                <Icon name="close" size={24} color={Palette.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {errorPPOB ? (
                <View style={styles.errorBox}>
                  <Icon name="error" size={18} color="#b91c1c" />
                  <DSText variant="bodySm" color="#b91c1c" style={styles.errorText}>
                    {errorPPOB}
                  </DSText>
                </View>
              ) : null}

              {/* Input Nomor Pelanggan / HP */}
              <View style={styles.inputWrapper}>
                <DSText variant="labelSm" color={Palette.secondary}>
                  {selectedPPOB.inputLabel}
                </DSText>
                <TextInput
                  style={styles.modalInput}
                  value={ppobCustNo}
                  onChangeText={(val) => {
                    setErrorPPOB(null);
                    setPpobCustNo(val);
                  }}
                  keyboardType={selectedPPOB.keyboardType || 'default'}
                  placeholder={selectedPPOB.placeholder}
                  placeholderTextColor={Palette.secondary}
                />
              </View>

              {/* Pilihan Nominal / Paket */}
              <View style={styles.inputWrapper}>
                <DSText variant="labelSm" color={Palette.secondary}>
                  Pilih Produk / Denominasi
                </DSText>
                <View style={styles.productList}>
                  {selectedPPOB.products.map((prod) => {
                    const isSelected = selectedProduct.id === prod.id;
                    return (
                      <TouchableOpacity
                        key={prod.id}
                        activeOpacity={0.7}
                        onPress={() => {
                          setErrorPPOB(null);
                          setSelectedProduct(prod);
                        }}
                        style={[
                          styles.productCard,
                          isSelected && styles.productCardActive,
                        ]}>
                        <View style={styles.productInfo}>
                          <DSText
                            variant="labelSm"
                            style={[
                              styles.productName,
                              isSelected && { color: Brand.ink, fontWeight: '700' },
                            ]}>
                            {prod.name}
                          </DSText>
                          <DSText
                            variant="headlineBaseSemi"
                            color={isSelected ? Brand.ink : Palette.primary}>
                            {formatRupiah(prod.price)}
                          </DSText>
                        </View>
                        <View
                          style={[
                            styles.radioCircle,
                            isSelected && styles.radioCircleActive,
                          ]}>
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Rincian Pembayaran */}
              <View style={styles.balanceInfoBox}>
                <View style={styles.rowBetween}>
                  <DSText variant="labelSm" color={Palette.secondary}>
                    Metode Bayar
                  </DSText>
                  <DSText variant="labelSm" color={Brand.ink} style={{ fontWeight: '700' }}>
                    OpenPay Wallet
                  </DSText>
                </View>
                <View style={styles.rowBetween}>
                  <DSText variant="labelSm" color={Palette.secondary}>
                    Saldo OpenPay
                  </DSText>
                  <DSText
                    variant="labelSm"
                    color={balance >= selectedProduct.price ? '#15803d' : '#b91c1c'}>
                    {formatRupiah(balance)}
                  </DSText>
                </View>
                <View
                  style={[
                    styles.rowBetween,
                    {
                      marginTop: 4,
                      paddingTop: 4,
                      borderTopWidth: 1,
                      borderTopColor: Palette.surfaceContainer,
                    },
                  ]}>
                  <DSText variant="headlineBaseSemi">Total Bayar</DSText>
                  <DSText variant="headlineBaseSemi" color={Brand.ink}>
                    {formatRupiah(selectedProduct.price)}
                  </DSText>
                </View>
                {balance < selectedProduct.price && (
                  <DSText variant="bodySm" color="#b91c1c" style={{ marginTop: 2 }}>
                    * Saldo tidak mencukupi untuk transaksi ini.
                  </DSText>
                )}
              </View>

              <Button
                label={
                  loadingPPOB
                    ? 'Memproses...'
                    : `Bayar ${formatRupiah(selectedProduct.price)}`
                }
                variant="primary"
                size="lg"
                disabled={loadingPPOB || balance < selectedProduct.price}
                onPress={handlePPOBSubmit}
                style={styles.modalSubmit}
              />
            </ScrollView>
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
  content: {
    paddingHorizontal: Spacing.edgeMargin,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
    gap: Spacing.xl,
  },
  mainWalletCard: {
    gap: Spacing.md,
    overflow: 'hidden',
  },
  cardDecoration: {
    position: 'absolute',
    right: -Sizes.avatar,
    top: -Sizes.avatar,
    width: Sizes.promoCard,
    height: Sizes.promoCard,
    borderRadius: Radius.full,
    backgroundColor: Overlay.decoration,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  balanceText: {
    fontFamily: FontFamily.headline,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  walletIconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Overlay.onDarkSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    zIndex: 1,
  },
  actionBtn: {
    flex: 1,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterBar: {
    gap: Spacing.xs,
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceContainer,
  },
  filterChipActive: {
    backgroundColor: Brand.ctaAction,
  },
  ppobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ppobGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  ppobItem: {
    width: '23%',
    alignItems: 'center',
    gap: 6,
  },
  ppobIconCircle: {
    width: 52,
    height: 52,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ppobLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    color: Palette.onSurface,
  },
  ppobModalIconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productList: {
    gap: Spacing.xs,
  },
  productCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.surfaceContainerHigh,
  },
  productCardActive: {
    backgroundColor: Brand.ctaAction + '1A',
    borderColor: Brand.ctaAction,
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  productName: {
    color: Palette.secondary,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Palette.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: Brand.ctaAction,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: Brand.ctaAction,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.surfaceContainer,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  historyIconDisc: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyInfo: {
    flex: 1,
    gap: 3,
  },
  historyTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  txTitle: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.sm,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  amountText: {
    fontSize: 15,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    maxHeight: '90%',
  },
  modalScroll: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.sm,
  },
  modalHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#fee2e2',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  errorText: {
    flex: 1,
  },
  balanceInfoBox: {
    backgroundColor: Palette.surfaceContainerLow,
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: 2,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
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
  inputWrapper: {
    gap: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
