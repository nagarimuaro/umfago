import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SearchField } from '@/components/ds/search-field';
import { NearbyFavoritesList } from '@/components/home/nearby-favorites';
import { NotificationModal } from '@/components/home/notification-modal';
import { PromoCarousel } from '@/components/home/promo-carousel';
import { SectionHeader } from '@/components/home/section-header';
import { ServiceGrid } from '@/components/home/service-grid';
import { TopAppBar } from '@/components/home/top-app-bar';
import { UniversalSearchModal } from '@/components/home/universal-search-modal';
import { WalletCard } from '@/components/home/wallet-card';
import { ServiceOptions } from '@/constants/booking';
import { Palette, Spacing } from '@/constants/design-system';
import { type HomeService } from '@/constants/home-content';
import { useAuth } from '@/hooks/use-auth';
import { useBooking } from '@/hooks/use-booking';
import type { ServiceId } from '@/types/order';

/** Mendukung seluruh layanan: ride, car, food, send, mart, med */
function toServiceId(id: string): ServiceId | null {
  return ServiceOptions.some((option) => option.id === id) ? (id as ServiceId) : null;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const { setService } = useBooking();
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2);

  // Sinkronkan saldo dompet dan profil pengguna setiap kali kembali ke halaman Home
  useFocusEffect(
    useCallback(() => {
      refreshProfile().catch(() => {});
    }, [])
  );

  function handleService(service: HomeService) {
    if (service.id === 'food') {
      router.push('/food');
      return;
    }

    const id = toServiceId(service.id);
    if (!id) return;
    setService(id);
    // Layanan transportasi & pengantaran membuka alur peta layanan
    router.push('/booking/service');
  }

  function handleTopUp() {
    router.push({ pathname: '/profile/payment', params: { action: 'topup' } });
  }

  function handleTransfer() {
    router.push({ pathname: '/profile/payment', params: { action: 'transfer' } });
  }

  function handleDetail() {
    router.push('/profile/payment');
  }

  function handlePay() {
    router.push('/booking/service');
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <TopAppBar
          onNotification={() => setNotifModalVisible(true)}
          unreadCount={unreadCount}
        />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.inset}>
            <SearchField
              placeholder="Mau cari apa ?"
              onPress={() => setSearchModalVisible(true)}
            />
          </View>

          <View style={styles.inset}>
            <WalletCard
              balance={user?.balance ?? 0}
              onDetail={handleDetail}
              onTopUp={handleTopUp}
              onPay={handlePay}
              onTransfer={handleTransfer}
            />
          </View>

          <View style={styles.inset}>
            <SectionHeader title="Our Services" />
            <ServiceGrid onSelect={handleService} />
          </View>

          {/* Horizontal rails bleed to the screen edge; they pad their own track. */}
          <View>
            <View style={styles.inset}>
              <SectionHeader
                title="Promo"
                actionLabel="See all"
                onAction={() => router.push('/promo')}
              />
            </View>
            <PromoCarousel onPromo={() => router.push('/promo')} />
          </View>

          <View>
            <View style={styles.inset}>
              <SectionHeader
                title="Nearby Favorites"
                actionLabel="See all"
                onAction={() => router.push('/food')}
              />
            </View>
            <NearbyFavoritesList
              onSelect={(item) =>
                router.push({ pathname: '/food/[id]', params: { id: item.id } })
              }
            />
          </View>
        </ScrollView>
      </SafeAreaView>

      <NotificationModal
        visible={notifModalVisible}
        onClose={() => setNotifModalVisible(false)}
        onUnreadChange={setUnreadCount}
      />

      <UniversalSearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.surface,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingTop: Spacing.xs,
    paddingBottom: 90,
    gap: Spacing.lg,
  },
  inset: {
    paddingHorizontal: Spacing.edgeMargin,
  },
});
