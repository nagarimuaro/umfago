import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
import { cartCount, cartTotal, lineQuantity, setLineQuantity, type CartLines } from '@/lib/cart';
import type { FoodMenuCategoryId } from '@/types/food';

/** The menu is static, so the categories worth enabling are known before the first render. */
const AvailableCategoryIds = FoodMenuCategories.filter((category) =>
  FoodMenuItems.some((item) => item.categoryId === category.id),
).map((category) => category.id);

const FirstCategoryId: FoodMenuCategoryId = AvailableCategoryIds[0] ?? FoodMenuCategories[0].id;

export default function FoodStoreScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeId, setActiveId] = useState<FoodMenuCategoryId>(FirstCategoryId);
  const [lines, setLines] = useState<CartLines>({});

  const merchant = FoodMerchants.find((entry) => entry.id === id);

  const items = useMemo(
    () => FoodMenuItems.filter((item) => item.categoryId === activeId),
    [activeId],
  );

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
  const total = cartTotal(lines, FoodMenuItems);

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          /* The category tabs are the third child, and the design sticks them to the top. */
          stickyHeaderIndices={[2]}>
          <StoreHero
            image={FoodStoreHero}
            onBack={goBack}
            searchLabel={FoodStoreCopy.searchLabel}
          />

          <StoreHeader merchant={merchant} ratingCount={FoodStoreCopy.ratingCount} />

          <MenuTabs
            categories={FoodMenuCategories}
            activeId={activeId}
            availableIds={AvailableCategoryIds}
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
                  onChangeQuantity={(quantity) =>
                    setLines((current) => setLineQuantity(current, item.id, quantity))
                  }
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {count > 0 ? <CartBar count={count} total={total} label={FoodStoreCopy.viewCart} /> : null}
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
