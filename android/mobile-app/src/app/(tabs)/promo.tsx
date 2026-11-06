import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { Button } from '@/components/ds/button';
import { Card } from '@/components/ds/card';
import { DSText } from '@/components/ds/ds-text';
import { Icon, type IconName } from '@/components/ds/icon';
import { DefaultPromos } from '@/components/promo/promo-catalog';
import { PromoCard } from '@/components/promo/promo-card';
import { PromoDetailModal } from '@/components/promo/promo-detail-modal';
import type { PromoCategoryTab, PromoItem } from '@/components/promo/types';
import { PromoImages } from '@/constants/promo-images';
import {
  FontFamily,
  Opacity,
  Palette,
  Radius,
  ShadowXs,
  Sizes,
  Spacing,
} from '@/constants/design-system';
import { useAuth } from '@/hooks/use-auth';
import { useBooking } from '@/hooks/use-booking';
import { ENV } from '@/constants/env';

const BACKEND_URL = ENV.API_URL;

type CategoryFilter = {
  id: PromoCategoryTab;
  label: string;
  icon: IconName;
  activeColor: string;
};

const CATEGORIES: CategoryFilter[] = [
  { id: 'all', label: 'Semua', icon: 'local-offer', activeColor: '#007A14' },
  { id: 'ride', label: 'Ojek & Mobil', icon: 'two-wheeler', activeColor: '#007A14' },
  { id: 'food', label: 'OpenFood', icon: 'restaurant', activeColor: '#D83A00' },
  { id: 'send', label: 'Pengiriman', icon: 'local-shipping', activeColor: '#1E3A8A' },
  { id: 'ppob', label: 'OpenPay & PPOB', icon: 'account-balance-wallet', activeColor: '#B45309' },
];

export default function PromoScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { applyPromo, setService } = useBooking();

  const [activeCategory, setActiveCategory] = useState<PromoCategoryTab>('all');
  const [promos, setPromos] = useState<PromoItem[]>(DefaultPromos);
  const [selectedPromo, setSelectedPromo] = useState<PromoItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Voucher Input State
  const [inputCode, setInputCode] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimFeedback, setClaimFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Fetch Live Promos from backend API
  const fetchPromos = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/promos`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) return;
      const data = await res.json();
      const backendList: any[] = data.promos || [];

      if (backendList.length === 0) return;

      // Merge backend promos with default catalog
      const mergedList = [...DefaultPromos];

      backendList.forEach((bp) => {
        const existingIdx = mergedList.findIndex(
          (p) => p.code.toUpperCase() === bp.code.toUpperCase()
        );

        const expiryStr = bp.ends_at
          ? new Date(bp.ends_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : '31 Des 2026';

        const discountStr =
          bp.discount_type === 'percent'
            ? `Diskon ${bp.discount_value}%${bp.max_discount ? ` s/d Rp ${Number(bp.max_discount).toLocaleString('id-ID')}` : ''}`
            : `Potongan Rp ${Number(bp.discount_value).toLocaleString('id-ID')}`;

        if (existingIdx >= 0) {
          mergedList[existingIdx] = {
            ...mergedList[existingIdx],
            title: bp.name || mergedList[existingIdx].title,
            description: bp.description || mergedList[existingIdx].description,
            minFare: bp.min_fare || mergedList[existingIdx].minFare,
            maxDiscount: bp.max_discount || mergedList[existingIdx].maxDiscount,
            discountValue: bp.discount_value,
            discountHighlight: discountStr,
            expiryDate: expiryStr,
          };
        } else {
          mergedList.unshift({
            id: String(bp.ID || bp.code),
            code: bp.code,
            title: bp.name || `Promo ${bp.code}`,
            description: bp.description || `Diskon spesial dengan kode ${bp.code}`,
            discountHighlight: discountStr,
            category: 'ride',
            categoryLabel: 'OpenRide & Car',
            badge: 'SPESIAL',
            badgeTone: 'accent',
            minFare: bp.min_fare,
            maxDiscount: bp.max_discount,
            discountType: bp.discount_type || 'fixed',
            discountValue: bp.discount_value || 0,
            expiryDate: expiryStr,
            icon: 'local-offer',
            gradient: ['#007A14', '#00A825'],
            accentFg: '#007A14',
            serviceType: 'ride',
            image: PromoImages.ride,
            terms: [
              `Gunakan kode ${bp.code} saat konfirmasi pemesanan.`,
              `Minimum pemesanan Rp ${Number(bp.min_fare || 0).toLocaleString('id-ID')}.`,
              'Potongan otomatis mengurangi biaya tagihan perjalanan.',
              'Kuota terbatas selama masa periode promo berlangsung.',
            ],
          });
        }
      });

      setPromos(mergedList);
    } catch {
      // Fallback silently
    }
  }, [token]);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPromos();
    setRefreshing(false);
  }, [fetchPromos]);

  // Handle claiming voucher from text field
  const handleClaimCode = async () => {
    const trimmed = inputCode.trim().toUpperCase();
    if (!trimmed) {
      setClaimFeedback({ type: 'error', message: 'Ketikkan kode promo terlebih dahulu' });
      return;
    }

    setIsClaiming(true);
    setClaimFeedback(null);

    const result = await applyPromo(trimmed);
    setIsClaiming(false);

    if (result.success) {
      setClaimFeedback({
        type: 'success',
        message: result.message || `Kode ${trimmed} berhasil diaktifkan!`,
      });
      setInputCode('');

      const match = promos.find((p) => p.code.toUpperCase() === trimmed);
      if (match) {
        setSelectedPromo(match);
        setModalVisible(true);
      }
    } else {
      setClaimFeedback({
        type: 'error',
        message: result.message || 'Kode promo tidak valid atau telah berakhir.',
      });
    }
  };

  const filteredPromos = useMemo(() => {
    if (activeCategory === 'all') return promos;
    if (activeCategory === 'ride') {
      return promos.filter((p) => p.category === 'ride' || p.category === 'car');
    }
    return promos.filter((p) => p.category === activeCategory);
  }, [promos, activeCategory]);

  const handleSelectPromo = (promo: PromoItem) => {
    setSelectedPromo(promo);
    setModalVisible(true);
  };

  const handleApplyPromo = async (promo: PromoItem) => {
    await applyPromo(promo.code);

    if (promo.serviceType === 'ride' || promo.serviceType === 'car') {
      setService(promo.serviceType);
      router.push('/booking/service');
    } else if (promo.serviceType === 'send') {
      setService('send');
      router.push('/booking/service');
    } else if (promo.serviceType === 'food') {
      router.push('/food');
    } else if (promo.serviceType === 'ppob') {
      router.push('/profile/payment');
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007A14']}
              tintColor="#007A14"
            />
          }>
          {/* Hero Header Banner */}
          <LinearGradient
            colors={['#071F11', '#0F381E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroHeader}>
            <View style={styles.heroPill}>
              <Icon name="local-offer" size={14} color="#C8FF00" />
              <DSText variant="labelXs" color="#C8FF00" style={styles.heroPillText}>
                PUSAT VOUCHER & DISKON
              </DSText>
            </View>

            <DSText variant="headlineLg" color="#ffffff" style={styles.heroTitle}>
              Promo Spesial Hari Ini
            </DSText>

            <DSText variant="bodySm" color="#A7F3D0" style={styles.heroSubtitle}>
              Klaim voucher dan nikmati hematnya bepergian, pesan makan, & bayar tagihan.
            </DSText>

            <View style={styles.heroStatsRow}>
              <View style={styles.statChip}>
                <Icon name="check-circle" size={14} color="#34D399" />
                <DSText variant="labelXs" color="#ffffff" style={styles.statText}>
                  {promos.length} Kupon Siap Pakai
                </DSText>
              </View>
              <View style={styles.statChip}>
                <Icon name="electric-bolt" size={14} color="#FBBF24" />
                <DSText variant="labelXs" color="#ffffff" style={styles.statText}>
                  Diskon s/d Rp 15.000
                </DSText>
              </View>
            </View>
          </LinearGradient>

          {/* Top Voucher Input Card */}
          <View style={styles.insetNegative}>
            <Card level={2} elevation="soft" radius="lg" padding="md" style={styles.claimCard}>
              <View style={styles.claimTitleRow}>
                <View style={styles.claimIconWrap}>
                  <Icon name="confirmation-number" size={18} color="#007A14" />
                </View>
                <DSText variant="bodyMdSemi" color="#0F172A">
                  Punya Kode Promo / Voucher?
                </DSText>
              </View>

              <View style={styles.claimInputRow}>
                <TextInput
                  value={inputCode}
                  onChangeText={(text) => {
                    setInputCode(text);
                    if (claimFeedback) setClaimFeedback(null);
                  }}
                  placeholder="Ketik kode (contoh: HEMAT10)"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  style={styles.claimInput}
                />

                <Button
                  label={isClaiming ? '' : 'Terapkan'}
                  variant="primary"
                  size="md"
                  onPress={handleClaimCode}
                  disabled={isClaiming}
                  style={styles.claimButton}>
                  {isClaiming ? (
                    <ActivityIndicator size="small" color="#1A1A26" />
                  ) : null}
                </Button>
              </View>

              {/* Feedback Alert Banner */}
              {claimFeedback ? (
                <View
                  style={[
                    styles.feedbackBanner,
                    claimFeedback.type === 'success'
                      ? styles.feedbackSuccess
                      : styles.feedbackError,
                  ]}>
                  <Icon
                    name={claimFeedback.type === 'success' ? 'check-circle' : 'info'}
                    size={16}
                    color={claimFeedback.type === 'success' ? '#059669' : '#DC2626'}
                  />
                  <DSText
                    variant="labelSm"
                    color={claimFeedback.type === 'success' ? '#065F46' : '#991B1B'}
                    style={styles.feedbackText}>
                    {claimFeedback.message}
                  </DSText>
                </View>
              ) : null}
            </Card>
          </View>

          {/* Category Tabs Filter */}
          <View style={styles.categoryContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryTrack}>
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    onPress={() => setActiveCategory(cat.id)}
                    style={({ pressed }) => [
                      styles.categoryTab,
                      isActive && styles.categoryTabActive,
                      pressed && styles.pressed,
                    ]}>
                    <Icon
                      name={cat.icon}
                      size={18}
                      color={isActive ? '#C8FF00' : '#475569'}
                    />
                    <DSText
                      variant="labelSm"
                      color={isActive ? '#ffffff' : '#334155'}
                      style={[styles.categoryTabText, isActive && styles.categoryTabTextActive]}>
                      {cat.label}
                    </DSText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Promo List Section */}
          <View style={styles.inset}>
            <View style={styles.listHeaderRow}>
              <DSText variant="bodyMdSemi" color="#0F172A" style={styles.listSectionTitle}>
                Daftar Kupon Tersedia
              </DSText>
              <View style={styles.countBadge}>
                <DSText variant="labelXs" color="#007A14" style={styles.countBadgeText}>
                  {filteredPromos.length} Kupon
                </DSText>
              </View>
            </View>

            {filteredPromos.length > 0 ? (
              filteredPromos.map((promo) => (
                <PromoCard
                  key={promo.id}
                  promo={promo}
                  onSelect={handleSelectPromo}
                  onApply={handleApplyPromo}
                  onCopyCode={(code) => {
                    setClaimFeedback({
                      type: 'success',
                      message: `Kode ${code} disalin ke clipboard!`,
                    });
                  }}
                />
              ))
            ) : (
              <Card level={1} elevation="none" radius="lg" padding="lg" style={styles.emptyCard}>
                <Icon name="local-offer" size={44} color="#CBD5E1" />
                <DSText variant="bodyMdSemi" color="#1E293B" style={styles.emptyTitle}>
                  Belum Ada Promo
                </DSText>
                <DSText variant="bodySm" color="#64748B" style={styles.emptyDesc}>
                  Promo untuk kategori ini belum tersedia saat ini. Cek kembali nanti!
                </DSText>
              </Card>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Promo Detail Modal */}
      <PromoDetailModal
        visible={modalVisible}
        promo={selectedPromo}
        onClose={() => setModalVisible(false)}
        onApply={handleApplyPromo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingBottom: 110,
    gap: Spacing.sm,
  },
  heroHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl + Spacing.sm,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
    gap: Spacing.xs,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(200, 255, 0, 0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(200, 255, 0, 0.3)',
  },
  heroPillText: {
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontFamily: FontFamily.headline,
    fontWeight: '800',
    fontSize: 24,
    letterSpacing: -0.5,
    marginTop: Spacing.hair,
  },
  heroSubtitle: {
    lineHeight: 19,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statText: {
    fontWeight: '600',
  },
  insetNegative: {
    paddingHorizontal: Spacing.edgeMargin,
    marginTop: -Spacing.lg,
  },
  inset: {
    paddingHorizontal: Spacing.edgeMargin,
  },
  claimCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
  },
  claimTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  claimIconWrap: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  claimInput: {
    flex: 1,
    height: 46,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: '#F8FAFC',
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  claimButton: {
    minWidth: 88,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.base,
  },
  feedbackSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  feedbackError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  feedbackText: {
    flex: 1,
    fontWeight: '600',
  },
  categoryContainer: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.hair,
  },
  categoryTrack: {
    paddingHorizontal: Spacing.edgeMargin,
    gap: Spacing.xs,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...ShadowXs,
  },
  categoryTabActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  categoryTabText: {
    fontWeight: '600',
    fontSize: 13,
  },
  categoryTabTextActive: {
    fontWeight: '700',
    color: '#ffffff',
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
    marginTop: Spacing.xs,
  },
  listSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  countBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  countBadgeText: {
    fontWeight: '800',
    fontSize: 11,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    marginTop: Spacing.xs,
  },
  emptyDesc: {
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  pressed: {
    opacity: Opacity.pressedSubtle,
  },
});
