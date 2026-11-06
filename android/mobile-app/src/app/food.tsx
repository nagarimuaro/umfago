import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DSText } from '@/components/ds/ds-text';
import { FilterChipRow } from '@/components/food/filter-chip-row';
import { FoodAppBar } from '@/components/food/food-app-bar';
import { MerchantCard } from '@/components/food/merchant-card';
import { Palette, Spacing } from '@/constants/design-system';
import {
  FoodCategoryCopy,
  FoodFilters,
  FoodMerchants,
  FoodQuickEtaMinutes,
  FoodRatingFloor,
} from '@/constants/food';
import { useAuth } from '@/hooks/use-auth';
import { useFoodOrder } from '@/hooks/use-food-order';
import type { FoodFilterId, FoodMerchant } from '@/types/food';
import { ENV } from '@/constants/env';

const BACKEND_URL = ENV.API_URL;

function matchesQuery(merchant: FoodMerchant, needle: string) {
  if (!needle) return true;

  return (
    merchant.name.toLowerCase().includes(needle) || merchant.tags.toLowerCase().includes(needle)
  );
}

export default function FoodScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { itemCount } = useFoodOrder();
  /* The constant is `as const`, so the state has to be widened back to a plain string. */
  const [query, setQuery] = useState<string>('');
  const [activeIds, setActiveIds] = useState<readonly FoodFilterId[]>([]);
  const [serverMerchants, setServerMerchants] = useState<FoodMerchant[]>([]);

  useEffect(() => {
    const fetchMerchants = async () => {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${BACKEND_URL}/api/merchants`, { headers });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.merchants) && data.merchants.length > 0) {
          const mapped: FoodMerchant[] = data.merchants.map((m: any) => ({
            id: String(m.id),
            name: m.business_name,
            tags: m.category ? `${m.category} • Pilihan UmfaGo` : 'Kuliner • Pilihan UmfaGo',
            rating: Number(m.rating || 4.8),
            distanceKm: Number(m.distance_km || 1.2),
            etaLabel: '20-30 min',
            etaMaxMinutes: 30,
            isFreeDelivery: true,
            isFavorite: false,
            badges: [{ label: 'Mitra Umfa', tone: 'primary', icon: 'verified' as const }],
            image:
              m.logo_url ||
              'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500',
          }));
          setServerMerchants(mapped);
        }
      } catch {
        // Fallback to static
      }
    };

    fetchMerchants();
  }, [token]);

  const allMerchants = useMemo(() => {
    if (serverMerchants.length === 0) return FoodMerchants;
    // Gabungkan server merchants dengan FoodMerchants jika ada yang belum tercakup
    const existingIds = new Set(serverMerchants.map((m) => m.name.toLowerCase()));
    const additional = FoodMerchants.filter((m) => !existingIds.has(m.name.toLowerCase()));
    return [...serverMerchants, ...additional];
  }, [serverMerchants]);

  const merchants = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = allMerchants.filter((merchant) => {
      if (!matchesQuery(merchant, needle)) return false;
      if (activeIds.includes('rating') && merchant.rating < FoodRatingFloor) return false;
      if (activeIds.includes('promo') && merchant.badges.length === 0) return false;
      if (activeIds.includes('quick') && merchant.etaMaxMinutes > FoodQuickEtaMinutes) return false;

      return true;
    });

    if (!activeIds.includes('nearest')) return filtered;

    return [...filtered].sort((a, b) => a.distanceKm - b.distanceKm);
  }, [query, activeIds, allMerchants]);

  function toggleFilter(id: FoodFilterId) {
    setActiveIds((current) =>
      current.includes(id) ? current.filter((active) => active !== id) : [...current, id],
    );
  }

  /** Normally pushed from Home, but a deep link can open it with nothing behind it. */
  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  }

  const needle = query.trim();

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <FoodAppBar
          query={query}
          onChangeQuery={setQuery}
          placeholder={FoodCategoryCopy.searchPlaceholder}
          onBack={goBack}
          onBasket={itemCount > 0 ? () => router.push('/food/checkout') : undefined}
          basketCount={itemCount}
        />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          /* With the keyboard up, a tap on a card must land on the card, not just dismiss. */
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <FilterChipRow filters={FoodFilters} activeIds={activeIds} onToggle={toggleFilter} />

          <View style={styles.titleBlock}>
            <DSText variant="headlineMd">{FoodCategoryCopy.title}</DSText>
            <DSText variant="labelSm" color={Palette.onSurfaceVariant} style={styles.count}>
              {merchants.length === 1 ? '1 place found' : `${merchants.length} places found`}
            </DSText>
          </View>

          {merchants.map((merchant) => (
            <View key={merchant.id} style={styles.cardWrap}>
              <MerchantCard
                merchant={merchant}
                onPress={() => router.push({ pathname: '/food/[id]', params: { id: merchant.id } })}
              />
            </View>
          ))}

          {merchants.length === 0 ? (
            <DSText variant="bodySm" color={Palette.onSurfaceVariant} style={styles.empty}>
              {needle ? `No places match “${needle}”.` : 'No places match the filters you picked.'}
            </DSText>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  safeArea: {
    flex: 1,
  },
  /* The design's `py-lg`, with its `gap-lg` between every block of the list. */
  content: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  titleBlock: {
    paddingHorizontal: Spacing.edgeMargin,
  },
  count: {
    marginTop: Spacing.base,
  },
  cardWrap: {
    paddingHorizontal: Spacing.edgeMargin,
  },
  empty: {
    paddingHorizontal: Spacing.edgeMargin,
    textAlign: 'center',
  },
});
