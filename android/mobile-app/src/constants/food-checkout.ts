/**
 * Copy and seed data for the food checkout screen, transcribed from the Stitch export
 * `food-checkout.md`. Replace with API data once the backend exists.
 */

import type { FoodAddress } from '@/types/food';

export const FoodCheckoutCopy = {
  title: 'Checkout',
  addressTitle: 'Delivery Address',
  /** Prefix on the courier-note chip, drawn as "Note: Leave at lobby". */
  notePrefix: 'Note:',
  edit: 'Edit',
  addMoreItems: 'Add More Items',
  promoTitle: 'Use Promo Code',
  /** Suffix after the promo count, drawn as "1 Available". */
  promoAvailable: 'Available',
  paymentTitle: 'Payment Method',
  paymentName: 'OpenPay',
  /** Prefix on the wallet line, drawn as "Balance: Rp250.000". */
  balanceLabel: 'Balance',
  change: 'Change',
  summaryTitle: 'Payment Summary',
  subtotal: 'Subtotal',
  deliveryFee: 'Delivery Fee',
  serviceFee: 'Service Fee',
  totalPayment: 'Total Payment',
  /** The shorter label the fixed bottom bar uses for the same figure. */
  barTotal: 'Total',
  placeOrder: 'Pesan Sekarang',
  emptyCart: 'Your cart is empty. Pick a store and add something to it first.',
  backToStores: 'Browse stores',
} as const;

/**
 * The address the checkout opens with.
 *
 * The select-address sheet lists "Home" as an unsaved slot, so this seed is the address
 * already attached to the order rather than an entry of that saved list.
 */
export const FoodCheckoutAddress: FoodAddress = {
  id: 'order-home',
  label: 'Home',
  address: 'Jl. Sudirman No. 45, Tower B, Apt 1205',
  area: 'Jakarta Selatan',
  icon: 'home',
  note: 'Leave at lobby',
};
