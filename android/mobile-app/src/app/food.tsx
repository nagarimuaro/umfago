import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
import type { FoodFilterId, FoodMerchant } from '@/types/food';

function matchesQuery(merchant: FoodMerchant, needle: string) {
  if (!needle) return true;

  return (
    merchant.name.toLowerCase().includes(needle) || merchant.tags.toLowerCase().includes(needle)
  );
}

export default function FoodScreen() {
  const router = useRouter();
  /* The constant is `as const`, so the state has to be widened back to a plain string. */
  const [query, setQuery] = useState<string>(FoodCategoryCopy.searchValue);
  const [activeIds, setActiveIds] = useState<readonly FoodFilterId[]>([]);

  const merchants = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = FoodMerchants.filter((merchant) => {
      if (!matchesQuery(merchant, needle)) return false;
      if (activeIds.includes('rating') && merchant.rating < FoodRatingFloor) return false;
      if (activeIds.includes('promo') && merchant.badges.length === 0) return false;
      if (activeIds.includes('quick') && merchant.etaMaxMinutes > FoodQuickEtaMinutes) return false;

      return true;
    });

    if (!activeIds.includes('nearest')) return filtered;

    return [...filtered].sort((a, b) => a.distanceKm - b.distanceKm);
  }, [query, activeIds]);

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
