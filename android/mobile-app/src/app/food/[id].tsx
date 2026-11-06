import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ds/button';
import { DSText } from '@/components/ds/ds-text';
import { CartBar } from '@/components/food/cart-bar';
import { MenuItemCard } from '@/components/food/menu-item-card';
import { MenuTabs } from '@/components/food/menu-tabs';
import { StoreHeader } from '@/components/food/store-header';
import { StoreHero } from '@/components/food/store-hero';
import { Palette, Sizes, Spacing } from '@/constants/design-system';
import { FoodMerchants } from '@/constants/food';
import {
  FoodMenuCategories,
  FoodMenuItems,
  FoodStoreCopy,
  FoodStoreHero,
} from '@/constants/food-store';
import { useAuth } from '@/hooks/use-auth';
import { useFoodOrder } from '@/hooks/use-food-order';
import { cartCount, cartTotal, lineQuantity } from '@/lib/cart';
import type { FoodMenuCategoryId, FoodMenuItem, FoodMerchant } from '@/types/food';
import { ENV } from '@/constants/env';

const BACKEND_URL = ENV.API_URL;

/** The menu is static, so the categories worth enabling are known before the first render. */
const AvailableCategoryIds = FoodMenuCategories.filter((category) =>
  FoodMenuItems.some((item) => item.categoryId === category.id),
).map((category) => category.id);

const FirstCategoryId: FoodMenuCategoryId = AvailableCategoryIds[0] ?? FoodMenuCategories[0].id;

export default function FoodStoreScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [activeId, setActiveId] = useState<FoodMenuCategoryId>(FirstCategoryId);
  const { lines, setQuantity, openMerchant } = useFoodOrder();

  const [remoteMerchant, setRemoteMerchant] = useState<FoodMerchant | null>(null);
  const [remoteProducts, setRemoteProducts] = useState<FoodMenuItem[]>([]);

  useEffect(() => {
    if (!id) return;

    // Fetch from backend if numeric ID or exists
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`${BACKEND_URL}/api/merchants/${id}`, { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.merchant) {
          const m = data.merchant;
          setRemoteMerchant({
            id: String(m.id),
            name: m.business_name,
            tags: m.category ? `${m.category} • Pilihan UmfaGo` : 'Kuliner Pilihan',
            rating: Number(m.rating || 4.9),
            distanceKm: Number(m.distance_km || 1.2),
            etaLabel: '20-30 min',
            etaMaxMinutes: 30,
            isFreeDelivery: true,
            isFavorite: false,
            badges: [{ label: 'Mitra Juara', tone: 'primary', icon: 'verified' as const }],
            image: m.logo_url || FoodStoreHero,
          });

          if (Array.isArray(data.products) && data.products.length > 0) {
            const mapped: FoodMenuItem[] = data.products.map((p: any) => ({
              id: String(p.id),
              categoryId: (p.category as FoodMenuCategoryId) || 'must-try',
              name: p.name,
              description: p.description || '',
              price: Number(p.price || 0),
              image: p.image_url || FoodStoreHero,
            }));
            setRemoteProducts(mapped);
          }
        }
      })
      .catch(() => { });
  }, [id, token]);

  const fallbackMerchant = FoodMerchants.find((entry) => entry.id === id) ?? FoodMerchants[0];
  const merchant = remoteMerchant || fallbackMerchant;

  useEffect(() => {
    if (merchant?.id) {
      openMerchant(merchant.id);
    }
  }, [merchant?.id, openMerchant]);

  const allItems = remoteProducts.length > 0 ? remoteProducts : FoodMenuItems;

  const currentAvailableCategories = useMemo(() => {
    return FoodMenuCategories.filter((category) =>
      allItems.some((item) => item.categoryId === category.id),
    ).map((category) => category.id);
  }, [allItems]);

  const effectiveAvailableIds =
    currentAvailableCategories.length > 0 ? currentAvailableCategories : AvailableCategoryIds;

  const items = useMemo(() => {
    const filtered = allItems.filter((item) => item.categoryId === activeId);
    return filtered.length > 0 ? filtered : allItems;
  }, [activeId, allItems]);

  /** Pushed from the list, but a deep link can open the store with nothing behind it. */
  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/food');
  }

  if (!merchant) {
    return (
      <SafeAreaView style={styles.missing}>
        <DSText variant="bodyMd" color={Palette.onSurfaceVariant} style={styles.missingText}>
          {FoodStoreCopy.notFound}
        </DSText>
        <Button label={FoodStoreCopy.backToList} onPress={goBack} />
      </SafeAreaView>
    );
  }

  const activeLabel = FoodMenuCategories.find((category) => category.id === activeId)?.label ?? '';
  const count = cartCount(lines);
  const total = cartTotal(lines, allItems);

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          /* The category tabs are the third child, and the design sticks them to the top. */
          stickyHeaderIndices={[2]}>
          <StoreHero
            image={merchant.image || FoodStoreHero}
            onBack={goBack}
            searchLabel={FoodStoreCopy.searchLabel}
          />

          <StoreHeader merchant={merchant} ratingCount={FoodStoreCopy.ratingCount} />

          <MenuTabs
            categories={FoodMenuCategories}
            activeId={activeId}
            availableIds={effectiveAvailableIds}
            onSelect={setActiveId}
          />

          <View style={styles.menu}>
            <DSText variant="headlineLg" style={styles.menuTitle}>
              {activeLabel}
            </DSText>

            <View style={styles.list}>
              {items.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  quantity={lineQuantity(lines, item.id)}
                  onChangeQuantity={(quantity) => setQuantity(item.id, quantity)}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {count > 0 ? (
        <CartBar
          count={count}
          total={total}
          label={FoodStoreCopy.viewCart}
          onPress={() => router.push('/food/checkout')}
        />
      ) : null}
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
  /* `pb-32` keeps the last menu item clear of the cart bar floating over the list. */
  content: {
    paddingBottom: Sizes.cartScrollPad,
  },
  menu: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  menuTitle: {
    marginBottom: Spacing.md,
  },
  list: {
    gap: Spacing.md,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.edgeMargin,
    backgroundColor: Palette.background,
  },
  missingText: {
    textAlign: 'center',
  },
});
