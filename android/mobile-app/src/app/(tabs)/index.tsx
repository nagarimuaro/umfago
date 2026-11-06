import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SearchField } from '@/components/ds/search-field';
import { NearbyFavoritesList } from '@/components/home/nearby-favorites';
import { PromoCarousel } from '@/components/home/promo-carousel';
import { SectionHeader } from '@/components/home/section-header';
import { ServiceGrid } from '@/components/home/service-grid';
import { TopAppBar } from '@/components/home/top-app-bar';
import { WalletCard } from '@/components/home/wallet-card';
import { ServiceOptions } from '@/constants/booking';
import { Palette, Spacing } from '@/constants/design-system';
import { type HomeService } from '@/constants/home-content';
import { useBooking } from '@/hooks/use-booking';
import type { ServiceId } from '@/types/order';

/** Mendukung seluruh layanan: ride, car, food, send, mart, med */
function toServiceId(id: string): ServiceId | null {
  return ServiceOptions.some((option) => option.id === id) ? (id as ServiceId) : null;
}

export default function HomeScreen() {
  const router = useRouter();
  const { setService } = useBooking();

  function handleService(service: HomeService) {
    const id = toServiceId(service.id);
    if (!id) return;
    setService(id);
    // Seluruh layanan (ride, car, food, send, mart, med) membuka alur peta layanan
    router.push('/booking/service');
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <TopAppBar
          onAvatar={() => router.push('/account')}
          onSearch={() => router.push('/booking/service')}
        />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.inset}>
            <SearchField placeholder="Mau ke mana?" onPress={() => router.push('/booking/service')} />
          </View>

          <View style={styles.inset}>
            <WalletCard />
          </View>

          <View style={styles.inset}>
            <SectionHeader title="Our Services" />
            <ServiceGrid onSelect={handleService} />
          </View>

          {/* Horizontal rails bleed to the screen edge; they pad their own track. */}
          <View>
            <View style={styles.inset}>
              <SectionHeader title="Promo" actionLabel="See all" />
            </View>
            <PromoCarousel />
          </View>

          <View>
            <View style={styles.inset}>
              <SectionHeader title="Nearby Favorites" actionLabel="See all" />
            </View>
            <NearbyFavoritesList />
          </View>
        </ScrollView>
      </SafeAreaView>
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
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  inset: {
    paddingHorizontal: Spacing.edgeMargin,
  },
});
