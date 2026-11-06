import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ds/button';
import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { IconButton } from '@/components/ds/icon-button';
import { CheckoutAddressCard } from '@/components/food/checkout-address-card';
import { CheckoutAppBar } from '@/components/food/checkout-app-bar';
import { CheckoutBar } from '@/components/food/checkout-bar';
import { CheckoutCharges } from '@/components/food/checkout-charges';
import { CheckoutOrderSummary } from '@/components/food/checkout-order-summary';
import { CheckoutPaymentCard } from '@/components/food/checkout-payment-card';
import { CheckoutPromoRow } from '@/components/food/checkout-promo-row';
import { formatRupiah } from '@/constants/booking';
import { Palette, Radius, Sizes, Spacing } from '@/constants/design-system';
import { FoodCheckoutCopy } from '@/constants/food-checkout';
import { FoodMenuItems } from '@/constants/food-store';
import { AvailablePromos } from '@/constants/pricing';
import { useAuth } from '@/hooks/use-auth';
import { useBooking } from '@/hooks/use-booking';
import { useFoodOrder } from '@/hooks/use-food-order';
import { cartEntries } from '@/lib/cart';

export default function FoodCheckoutScreen() {
  const router = useRouter();
  const { user, token, refreshProfile } = useAuth();
  const { merchant, lines, address, charges, clearCart } = useFoodOrder();
  const { startBooking } = useBooking();
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'cash'>('wallet');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const entries = useMemo(() => cartEntries(lines, FoodMenuItems), [lines]);

  /** Pushed from the store screen, but a deep link can open checkout with nothing behind it. */
  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/food');
  }

  function handlePlaceOrder() {
    if (!token) {
      Alert.alert('Perhatian', 'Silakan masuk akun terlebih dahulu untuk memesan makanan.', [
        { text: 'Masuk', onPress: () => router.push('/auth/login') },
        { text: 'Batal', style: 'cancel' },
      ]);
      return;
    }

    if (paymentMethod === 'wallet' && (user?.balance ?? 0) < charges.total) {
      Alert.alert(
        'Saldo Tidak Cukup',
        'Saldo OpenPay Anda tidak mencukupi untuk melakukan pembayaran pesanan ini. Anda dapat beralih ke Tunai (Cash) atau isi saldo terlebih dahulu.',
        [
          { text: 'Pilih Tunai', onPress: () => setPaymentMethod('cash') },
          {
            text: 'Isi Saldo',
            onPress: () =>
              router.push({ pathname: '/profile/payment', params: { action: 'topup' } }),
          },
          { text: 'Batal', style: 'cancel' },
        ],
      );
      return;
    }

    const restoName = merchant?.name || 'Burger Broz';
    const restoTags = merchant?.tags ? ` (${merchant.tags})` : '';
    const dropoffAddr = [address.label, address.address, address.area]
      .filter(Boolean)
      .join(', ') || address.label;

    // Alamat restoran sudah otomatis terisi sebagai titik penjemputan (pickup),
    // dan alamat yang dipilih user sebagai titik pengantaran (destination).
    startBooking({
      pickup: {
        id: merchant?.id || 'resto-pickup',
        label: restoName,
        address: `${restoName}${restoTags}`,
        detail: 'Restoran Penjemputan Makanan',
        lat: -0.664159,
        lon: 100.939844,
      },
      destination: {
        id: address.id || 'food-destination',
        label: address.label || 'Alamat Pengantaran',
        address: dropoffAddr,
        detail: address.note,
        lat: -0.666,
        lon: 100.941,
      },
      service: 'food',
      payment: paymentMethod,
    });

    clearCart();
    router.push('/booking/searching');
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

          <CheckoutPromoRow
            promoCount={AvailablePromos.length}
            onPress={() => router.push('/promo')}
          />

          <CheckoutPaymentCard
            paymentMethod={paymentMethod}
            balance={user?.balance ?? 0}
            onChange={() => setPaymentModalOpen(true)}
          />

          <CheckoutCharges charges={charges} />
        </ScrollView>
      </SafeAreaView>

      <CheckoutBar
        total={charges.total}
        paymentMethod={paymentMethod}
        onPlaceOrder={handlePlaceOrder}
      />

      {/* Modal Pilih / Ubah Metode Pembayaran */}
      <Modal
        visible={paymentModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPaymentModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPaymentModalOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <DSText variant="headlineBaseSemi">Pilih Metode Pembayaran</DSText>
              <IconButton
                icon="close"
                accessibilityLabel="Tutup"
                onPress={() => setPaymentModalOpen(false)}
              />
            </View>

            <View style={styles.modalOptions}>
              {/* Pilihan 1: OpenPay */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  paymentMethod === 'wallet' && styles.optionCardActive,
                ]}
                onPress={() => {
                  setPaymentMethod('wallet');
                  setPaymentModalOpen(false);
                }}>
                <View style={[styles.optionIconCircle, { backgroundColor: Palette.primaryContainer }]}>
                  <Icon name="account-balance-wallet" size={20} color={Palette.onSurface} />
                </View>
                <View style={styles.optionInfo}>
                  <DSText variant="bodyMdSemi">OpenPay</DSText>
                  <DSText
                    variant="labelSm"
                    color={(user?.balance ?? 0) < charges.total ? Palette.error : Palette.primary}>
                    {`Saldo: ${formatRupiah(user?.balance ?? 0)}`}
                    {(user?.balance ?? 0) < charges.total ? ' (Saldo Kurang)' : ''}
                  </DSText>
                </View>
                <Icon
                  name={paymentMethod === 'wallet' ? 'radio-button-checked' : 'radio-button-unchecked'}
                  size={22}
                  color={paymentMethod === 'wallet' ? Palette.primary : Palette.outlineVariant}
                />
              </TouchableOpacity>

              {/* Pilihan 2: Tunai (Cash) */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  paymentMethod === 'cash' && styles.optionCardActive,
                ]}
                onPress={() => {
                  setPaymentMethod('cash');
                  setPaymentModalOpen(false);
                }}>
                <View style={[styles.optionIconCircle, { backgroundColor: '#fef3c7' }]}>
                  <Icon name="payments" size={20} color="#b45309" />
                </View>
                <View style={styles.optionInfo}>
                  <DSText variant="bodyMdSemi">Tunai (Cash)</DSText>
                  <DSText variant="labelSm" color={Palette.onSurfaceVariant}>
                    Bayar langsung ke kurir saat pesanan sampai
                  </DSText>
                </View>
                <Icon
                  name={paymentMethod === 'cash' ? 'radio-button-checked' : 'radio-button-unchecked'}
                  size={22}
                  color={paymentMethod === 'cash' ? Palette.primary : Palette.outlineVariant}
                />
              </TouchableOpacity>
            </View>

            {/* Tombol Cepat Isi Saldo OpenPay */}
            <TouchableOpacity
              style={styles.topupButton}
              onPress={() => {
                setPaymentModalOpen(false);
                router.push({ pathname: '/profile/payment', params: { action: 'topup' } });
              }}>
              <Icon name="add-circle" size={18} color={Palette.primary} />
              <DSText variant="labelSm" color={Palette.primary} style={styles.topupText}>
                Isi Saldo / Top Up OpenPay
              </DSText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Palette.surfaceContainerLowest,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.edgeMargin,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceVariant,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalOptions: {
    gap: Spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Palette.surface,
    borderWidth: 1.5,
    borderColor: Palette.outlineVariant,
    gap: Spacing.sm,
  },
  optionCardActive: {
    borderColor: Palette.primary,
    backgroundColor: Palette.surfaceContainerLow,
  },
  optionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionInfo: {
    flex: 1,
  },
  topupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: Palette.surfaceContainerLow,
  },
  topupText: {
    fontWeight: '600',
  },
});
