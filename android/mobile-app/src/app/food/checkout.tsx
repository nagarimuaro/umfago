import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ds/button';
import { DSText } from '@/components/ds/ds-text';
import { CheckoutAddressCard } from '@/components/food/checkout-address-card';
import { CheckoutAppBar } from '@/components/food/checkout-app-bar';
import { CheckoutBar } from '@/components/food/checkout-bar';
import { CheckoutCharges } from '@/components/food/checkout-charges';
import { CheckoutOrderSummary } from '@/components/food/checkout-order-summary';
import { CheckoutPaymentCard } from '@/components/food/checkout-payment-card';
import { CheckoutPromoRow } from '@/components/food/checkout-promo-row';
import { Palette, Sizes, Spacing } from '@/constants/design-system';
import { FoodCheckoutCopy } from '@/constants/food-checkout';
import { FoodMenuItems } from '@/constants/food-store';
import { Wallet } from '@/constants/home-content';
import { AvailablePromos } from '@/constants/pricing';
import { useFoodOrder } from '@/hooks/use-food-order';
import { cartEntries } from '@/lib/cart';

export default function FoodCheckoutScreen() {
  const router = useRouter();
  const { merchant, lines, address, charges } = useFoodOrder();

  const entries = useMemo(() => cartEntries(lines, FoodMenuItems), [lines]);

  /** Pushed from the store screen, but a deep link can open checkout with nothing behind it. */
  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/food');
  }

  /**
   * An empty cart has nothing to check out — a deep link or a cleared cart can land here.
   * The store list is the way out, since the store the cart belonged to is unknown.
   */
  if (!merchant || entries.length === 0) {
    return (
      <SafeAreaView style={styles.empty}>
        <DSText variant="bodyMd" color={Palette.onSurfaceVariant} style={styles.emptyText}>
          {FoodCheckoutCopy.emptyCart}
        </DSText>
        <Button label={FoodCheckoutCopy.backToStores} onPress={goBack} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <CheckoutAppBar title={FoodCheckoutCopy.title} onBack={goBack} />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <CheckoutAddressCard address={address} onEdit={() => router.push('/food/address')} />

          <CheckoutOrderSummary
            merchantName={merchant.name}
            entries={entries}
            onAddMore={goBack}
          />

          <CheckoutPromoRow promoCount={AvailablePromos.length} />

          <CheckoutPaymentCard balance={Wallet.balance} />

          <CheckoutCharges charges={charges} />
        </ScrollView>
      </SafeAreaView>

      <CheckoutBar total={charges.total} />
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
  /* `p-edge-margin space-y-gutter`, plus the design's `pb-[120px]` for the fixed bar. */
  content: {
    padding: Spacing.edgeMargin,
    paddingBottom: Sizes.checkoutScrollPad,
    gap: Spacing.gutter,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.edgeMargin,
    backgroundColor: Palette.background,
  },
  emptyText: {
    textAlign: 'center',
  },
});
