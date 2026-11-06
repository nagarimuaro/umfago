import { useMemo, useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DSText } from '@/components/ds/ds-text';
import { Icon, type IconName } from '@/components/ds/icon';
import { IconButton } from '@/components/ds/icon-button';
import {
  Brand,
  FontFamily,
  Palette,
  Radius,
  ShadowSheet,
  ShadowSoft,
  Sizes,
  Spacing,
} from '@/constants/design-system';
import { FoodMerchants } from '@/constants/food';
import { FoodMenuItems } from '@/constants/food-store';
import { AvailablePromos } from '@/constants/pricing';
import { useBooking } from '@/hooks/use-booking';
import type { ServiceId } from '@/types/order';

export type ServiceSearchResult = {
  id: ServiceId | 'promo' | 'safety';
  title: string;
  category: string;
  description: string;
  icon: IconName;
  iconColor: string;
  iconBg: string;
  route: string;
};

const ALL_SYSTEM_SERVICES: ServiceSearchResult[] = [
  {
    id: 'ride',
    title: 'UmfaGo Ride (Motor)',
    category: 'Transportasi',
    description: 'Ojek motor kilat, lincah hemat anti macet',
    icon: 'two-wheeler',
    iconColor: '#166534',
    iconBg: '#DCFCE7',
    route: '/booking/service',
  },
  {
    id: 'car',
    title: 'UmfaGo Car (Mobil)',
    category: 'Transportasi',
    description: 'Perjalanan nyaman ber-AC muat 4–6 penumpang',
    icon: 'directions-car',
    iconColor: '#0369A1',
    iconBg: '#E0F2FE',
    route: '/booking/service',
  },
  {
    id: 'food',
    title: 'UmfaGo Food (Resto & Kuliner)',
    category: 'Pesan Makanan',
    description: 'Pesan makanan lezat dari resto favorit diantar cepat',
    icon: 'restaurant',
    iconColor: '#B45309',
    iconBg: '#FEF3C7',
    route: '/food',
  },
  {
    id: 'send',
    title: 'UmfaGo Send (Kurir Kilat)',
    category: 'Pengiriman',
    description: 'Kirim dokumen dan barang sampai hari ini dengan aman',
    icon: 'local-shipping',
    iconColor: '#4338CA',
    iconBg: '#EEF2FF',
    route: '/booking/service',
  },
  {
    id: 'mart',
    title: 'UmfaGo Mart (Minimarket)',
    category: 'Belanja',
    description: 'Belanja kebutuhan dapur, camilan, dan sembako',
    icon: 'storefront',
    iconColor: '#047857',
    iconBg: '#D1FAE5',
    route: '/booking/service',
  },
  {
    id: 'med',
    title: 'UmfaGo Med (Apotek 24 Jam)',
    category: 'Kesehatan',
    description: 'Beli obat, vitamin, dan perlengkapan medis cepat',
    icon: 'medication',
    iconColor: '#BE123C',
    iconBg: '#FFE4E6',
    route: '/booking/service',
  },
  {
    id: 'promo',
    title: 'Voucher & Kupon Promo',
    category: 'Diskon',
    description: 'Klaim diskon ongkir dan potongan belanja hingga Rp 50rb',
    icon: 'local-offer',
    iconColor: '#7C2D12',
    iconBg: '#FFEDD5',
    route: '/promo',
  },
  {
    id: 'safety',
    title: 'Pusat Keselamatan & SOS',
    category: 'Bantuan Darurat',
    description: 'Fitur perlindungan perjalanan, PIN, dan kontak darurat',
    icon: 'health-and-safety',
    iconColor: '#15803D',
    iconBg: '#F0FDF4',
    route: '/profile/safety',
  },
];

const POPULAR_DESTINATIONS = [
  { name: 'Stasiun Kereta Api Sijunjung', address: 'Jl. Stasiun No. 1, Sijunjung', lat: -0.665, lon: 100.938 },
  { name: 'Kantor Bupati Sijunjung', address: 'Jl. Prof. M. Yamin No. 1', lat: -0.662, lon: 100.942 },
  { name: 'Pasar Sentral Sijunjung', address: 'Pusat Kota Sijunjung', lat: -0.664, lon: 100.940 },
  { name: 'RSUD Ahmad Darwis', address: 'Jl. Kesehatan No. 12', lat: -0.668, lon: 100.945 },
];

export type UniversalSearchModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function UniversalSearchModal({ visible, onClose }: UniversalSearchModalProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setService, setDestination } = useBooking();
  const [query, setQuery] = useState('');

  const trimmed = query.trim().toLowerCase();

  // 1. Filtered Services
  const matchedServices = useMemo(() => {
    if (!trimmed) return ALL_SYSTEM_SERVICES;
    return ALL_SYSTEM_SERVICES.filter(
      (s) =>
        s.title.toLowerCase().includes(trimmed) ||
        s.category.toLowerCase().includes(trimmed) ||
        s.description.toLowerCase().includes(trimmed) ||
        (s.id === 'ride' && (trimmed.includes('ojek') || trimmed.includes('motor'))) ||
        (s.id === 'car' && (trimmed.includes('mobil') || trimmed.includes('taksi'))) ||
        (s.id === 'food' && (trimmed.includes('makan') || trimmed.includes('kuliner') || trimmed.includes('resto'))) ||
        (s.id === 'send' && (trimmed.includes('kirim') || trimmed.includes('paket') || trimmed.includes('kurir'))) ||
        (s.id === 'mart' && (trimmed.includes('belanja') || trimmed.includes('pasar') || trimmed.includes('sembako'))) ||
        (s.id === 'med' && (trimmed.includes('obat') || trimmed.includes('apotek') || trimmed.includes('sehat')))
    );
  }, [trimmed]);

  // 2. Filtered Resto / Food Merchants
  const matchedMerchants = useMemo(() => {
    if (!trimmed) return FoodMerchants.slice(0, 3);
    return FoodMerchants.filter(
      (m) =>
        m.name.toLowerCase().includes(trimmed) ||
        m.tags.toLowerCase().includes(trimmed)
    );
  }, [trimmed]);

  // 3. Filtered Food Menu Items
  const matchedMenuItems = useMemo(() => {
    if (!trimmed) return [];
    return FoodMenuItems.filter(
      (item) =>
        item.name.toLowerCase().includes(trimmed) ||
        item.description.toLowerCase().includes(trimmed)
    );
  }, [trimmed]);

  // 4. Filtered Promos
  const matchedPromos = useMemo(() => {
    if (!trimmed) return AvailablePromos.slice(0, 2);
    return AvailablePromos.filter(
      (p) =>
        p.code.toLowerCase().includes(trimmed) ||
        p.label.toLowerCase().includes(trimmed)
    );
  }, [trimmed]);

  // 5. Filtered Destinations
  const matchedDestinations = useMemo(() => {
    if (!trimmed) return POPULAR_DESTINATIONS;
    return POPULAR_DESTINATIONS.filter(
      (d) =>
        d.name.toLowerCase().includes(trimmed) ||
        d.address.toLowerCase().includes(trimmed)
    );
  }, [trimmed]);

  const handleSelectService = (srv: ServiceSearchResult) => {
    onClose();
    if (srv.id === 'food') {
      router.push('/food');
    } else if (srv.id === 'promo') {
      router.push('/promo');
    } else if (srv.id === 'safety') {
      router.push('/profile/safety');
    } else {
      setService(srv.id as ServiceId);
      router.push('/booking/service');
    }
  };

  const handleSelectMerchant = (merchantId: string) => {
    onClose();
    router.push({ pathname: '/food/[id]', params: { id: merchantId } });
  };

  const handleSelectDestination = (dest: { name: string; address: string; lat: number; lon: number }) => {
    onClose();
    setService('ride');
    setDestination({
      id: 'search-dest',
      label: dest.name,
      address: dest.address,
      lat: dest.lat,
      lon: dest.lon,
    });
    router.push('/booking/service');
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {/* Top Search App Bar */}
        <View style={styles.searchBar}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Tutup pencarian"
            onPress={onClose}
            style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={Palette.onSurface} />
          </TouchableOpacity>

          <View style={styles.inputWrapper}>
            <Icon name="search" size={20} color={Palette.secondary} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Mau cari apa ?"
              placeholderTextColor={Palette.secondary}
              style={styles.searchInput}
              returnKeyType="search"
              underlineColorAndroid="transparent"
            />
            {query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
                <Icon name="close" size={18} color={Palette.secondary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Quick Filter Pill Chips */}
        <View style={styles.chipScrollWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {ALL_SYSTEM_SERVICES.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => handleSelectService(s)}
                style={styles.serviceChip}>
                <Icon name={s.icon} size={16} color={s.iconColor} />
                <DSText variant="labelSm" color={Palette.onSurface}>
                  {s.title.split(' ')[1] || s.title}
                </DSText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Search Results / Explore Content */}
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Spacing.xl + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => Keyboard.dismiss()}>
          
          {/* Section 1: Layanan Sistem UmfaGo */}
          {matchedServices.length > 0 ? (
            <View style={styles.section}>
              <DSText variant="headlineSm" color={Palette.onSurface} style={styles.sectionTitle}>
                {trimmed ? 'Layanan Terkait' : 'Semua Layanan UmfaGo'}
              </DSText>

              <View style={styles.servicesGrid}>
                {matchedServices.map((srv) => (
                  <TouchableOpacity
                    key={srv.id}
                    activeOpacity={0.7}
                    onPress={() => handleSelectService(srv)}
                    style={styles.serviceCard}>
                    <View style={[styles.serviceIconBox, { backgroundColor: srv.iconBg }]}>
                      <Icon name={srv.icon} size={22} color={srv.iconColor} />
                    </View>
                    <View style={styles.serviceMeta}>
                      <DSText variant="headlineBaseSemi" color={Palette.onSurface}>
                        {srv.title}
                      </DSText>
                      <DSText variant="bodySm" color={Palette.secondary} numberOfLines={1}>
                        {srv.description}
                      </DSText>
                    </View>
                    <Icon name="chevron-right" size={20} color={Palette.outlineVariant} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          {/* Section 2: Resto & Menu Kuliner Makanan */}
          {(matchedMerchants.length > 0 || matchedMenuItems.length > 0) ? (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <DSText variant="headlineSm" color={Palette.onSurface}>
                  {trimmed ? 'Restoran & Menu Terkait' : 'Restoran Populer'}
                </DSText>
                <TouchableOpacity onPress={() => { onClose(); router.push('/food'); }}>
                  <DSText variant="labelSm" color={Palette.primary}>
                    Lihat Semua
                  </DSText>
                </TouchableOpacity>
              </View>

              <View style={styles.merchantsList}>
                {matchedMerchants.map((merchant) => (
                  <TouchableOpacity
                    key={merchant.id}
                    activeOpacity={0.7}
                    onPress={() => handleSelectMerchant(merchant.id)}
                    style={styles.merchantItem}>
                    <Image source={{ uri: merchant.image }} style={styles.merchantThumb} contentFit="cover" />
                    <View style={styles.merchantDetails}>
                      <DSText variant="headlineSm" color={Palette.onSurface} numberOfLines={1}>
                        {merchant.name}
                      </DSText>
                      <DSText variant="bodySm" color={Palette.secondary} numberOfLines={1}>
                        {merchant.tags}
                      </DSText>
                      <View style={styles.merchantMetaRow}>
                        <Icon name="star" size={14} color="#F59E0B" />
                        <DSText variant="labelSm" color={Palette.onSurface}>
                          {merchant.rating.toFixed(1)}
                        </DSText>
                        <DSText variant="labelSm" color={Palette.secondary}>
                          • {merchant.distanceKm} km • {merchant.etaLabel}
                        </DSText>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Matched Dishes in Menu */}
                {matchedMenuItems.slice(0, 3).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    onPress={() => handleSelectMerchant('burger-broz')}
                    style={styles.menuDishItem}>
                    <Image source={{ uri: item.image }} style={styles.dishThumb} contentFit="cover" />
                    <View style={styles.dishDetails}>
                      <DSText variant="headlineSm" color={Palette.onSurface} numberOfLines={1}>
                        {item.name}
                      </DSText>
                      <DSText variant="bodySm" color={Palette.secondary} numberOfLines={1}>
                        {item.description}
                      </DSText>
                      <DSText variant="labelMd" color={Palette.primary} style={styles.dishPrice}>
                        Rp {item.price.toLocaleString('id-ID')}
                      </DSText>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          {/* Section 3: Destinasi & Lokasi Populer */}
          {matchedDestinations.length > 0 ? (
            <View style={styles.section}>
              <DSText variant="headlineSm" color={Palette.onSurface} style={styles.sectionTitle}>
                {trimmed ? 'Lokasi & Destinasi' : 'Tujuan Cepat'}
              </DSText>

              <View style={styles.destList}>
                {matchedDestinations.map((dest, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.7}
                    onPress={() => handleSelectDestination(dest)}
                    style={styles.destRow}>
                    <View style={styles.destIconBox}>
                      <Icon name="location-on" size={18} color={Palette.primary} />
                    </View>
                    <View style={styles.destText}>
                      <DSText variant="headlineSm" color={Palette.onSurface} numberOfLines={1}>
                        {dest.name}
                      </DSText>
                      <DSText variant="bodySm" color={Palette.secondary} numberOfLines={1}>
                        {dest.address}
                      </DSText>
                    </View>
                    <DSText variant="labelSm" color={Palette.primary} style={styles.orderRideBtn}>
                      Pesan
                    </DSText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          {/* Section 4: Promo & Diskon */}
          {matchedPromos.length > 0 ? (
            <View style={styles.section}>
              <DSText variant="headlineSm" color={Palette.onSurface} style={styles.sectionTitle}>
                Promo & Diskon Aktif
              </DSText>

              <View style={styles.promoList}>
                {matchedPromos.map((promo) => (
                  <TouchableOpacity
                    key={promo.code}
                    activeOpacity={0.7}
                    onPress={() => { onClose(); router.push('/promo'); }}
                    style={styles.promoCard}>
                    <Icon name="local-offer" size={20} color={Palette.primary} />
                    <View style={styles.promoTextWrap}>
                      <DSText variant="headlineSm" color={Palette.onSurface}>
                        {promo.code}
                      </DSText>
                      <DSText variant="bodySm" color={Palette.secondary}>
                        {promo.label}
                      </DSText>
                    </View>
                    <Icon name="arrow-forward" size={16} color={Palette.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          {/* No Results Fallback */}
          {matchedServices.length === 0 &&
           matchedMerchants.length === 0 &&
           matchedMenuItems.length === 0 &&
           matchedDestinations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="search-off" size={48} color={Palette.surfaceVariant} />
              <DSText variant="headlineSm" color={Palette.onSurface} style={styles.emptyTitle}>
                Tidak ada hasil untuk “{query}”
              </DSText>
              <DSText variant="bodySm" color={Palette.secondary} style={styles.emptySub}>
                Coba gunakan kata kunci lain seperti “motor”, “burger”, “paket”, atau nama resto.
              </DSText>
            </View>
          ) : null}

        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.surfaceVariant,
    backgroundColor: Palette.surfaceContainerLowest,
  },
  backButton: {
    padding: Spacing.xs,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    height: 44,
    gap: Spacing.xs,
    borderWidth: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Palette.onSurface,
    fontFamily: FontFamily.body,
    paddingVertical: 0,
    borderWidth: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as any) : {}),
  },
  clearBtn: {
    padding: 4,
  },
  chipScrollWrap: {
    backgroundColor: Palette.surfaceContainerLowest,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.surfaceVariant,
  },
  chipRow: {
    paddingHorizontal: Spacing.edgeMargin,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceContainerLow,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.surfaceVariant,
  },
  content: {
    paddingHorizontal: Spacing.edgeMargin,
    paddingTop: Spacing.md,
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  servicesGrid: {
    gap: Spacing.xs,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surfaceContainerLowest,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.surfaceVariant,
    ...ShadowSoft,
  },
  serviceIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceMeta: {
    flex: 1,
  },
  merchantsList: {
    gap: Spacing.xs,
  },
  merchantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surfaceContainerLowest,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.surfaceVariant,
    ...ShadowSoft,
  },
  merchantThumb: {
    width: 60,
    height: 60,
    borderRadius: Radius.base,
  },
  merchantDetails: {
    flex: 1,
    gap: 2,
  },
  merchantMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  menuDishItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.base,
    backgroundColor: Palette.surfaceContainerLowest,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.surfaceVariant,
    marginLeft: Spacing.md,
  },
  dishThumb: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
  },
  dishDetails: {
    flex: 1,
  },
  dishPrice: {
    fontWeight: '700',
    marginTop: 2,
  },
  destList: {
    gap: Spacing.xs,
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surfaceContainerLowest,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.surfaceVariant,
  },
  destIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destText: {
    flex: 1,
  },
  orderRideBtn: {
    fontWeight: '700',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: Palette.surfaceContainerLow,
  },
  promoList: {
    gap: Spacing.xs,
  },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surfaceContainerLowest,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.surfaceVariant,
  },
  promoTextWrap: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    gap: Spacing.xs,
  },
  emptyTitle: {
    marginTop: Spacing.sm,
    fontWeight: '600',
  },
  emptySub: {
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
});

