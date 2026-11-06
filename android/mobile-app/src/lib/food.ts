/**
 * Delivery pricing for the food feature.
 *
 * Pure by design, like `fare.ts`: no React, no I/O, no clock.
 */

import { FareRules, FoodServiceFee } from '@/constants/pricing';
import { calculateFare } from '@/lib/fare';
import type { FoodMerchant, FoodOrderCharges } from '@/types/food';

/**
 * Delivery charge for a merchant, in rupiah.
 *
 * The design quotes dollars, which this app does not use, so the fee comes from the
 * app's own food tariff instead — reusing `calculateFare` keeps the Rp100 rounding rule
 * in one place. That rule prices distance only, so the duration argument is inert here
 * and the service fee it would add is zero for food.
 */
export function deliveryFee(distanceKm: number, isFreeDelivery: boolean): number {
  if (isFreeDelivery) return 0;

  return calculateFare(FareRules.food, { distanceKm, durationMinutes: 0 }).tripFare;
}

/** An untouched cart owes nothing, not even delivery. */
export const EmptyCharges: FoodOrderCharges = {
  subtotal: 0,
  itemCount: 0,
  delivery: 0,
  service: 0,
  total: 0,
};

/**
 * The four lines of the checkout's Payment Summary, plus their total.
 *
 * Only the merchant's distance and free-delivery flag matter here, so the argument is
 * narrowed to those two fields: the whole record is not needed to price a delivery.
 */
export function orderCharges(
  subtotal: number,
  itemCount: number,
  merchant: Pick<FoodMerchant, 'distanceKm' | 'isFreeDelivery'> | null,
): FoodOrderCharges {
  if (subtotal <= 0 || !merchant) return EmptyCharges;

  const delivery = deliveryFee(merchant.distanceKm, merchant.isFreeDelivery);

  return {
    subtotal,
    itemCount,
    delivery,
    service: FoodServiceFee,
    total: subtotal + delivery + FoodServiceFee,
  };
}
