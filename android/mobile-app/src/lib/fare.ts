/**
 * Fare calculation for the passenger booking flow.
 *
 * Pure by design: no React, no I/O, no clock. The confirm screen renders whatever
 * this returns, which keeps the arithmetic testable on its own.
 */

import { FareRounding } from '@/constants/pricing';
import type { FareBreakdown, FareRule, Promo, RouteEstimate } from '@/types/order';

/** Rounds to the nearest `FareRounding` step so quotes land on whole hundreds. */
function roundFare(amount: number) {
  return Math.round(amount / FareRounding) * FareRounding;
}

/**
 * Prices a trip. The promo comes off the trip fare only — the service fee is never
 * discounted — and the total is floored at zero so an oversized promo cannot produce
 * a negative charge.
 */
export function calculateFare(
  rule: FareRule,
  route: RouteEstimate,
  promo?: Promo | null
): FareBreakdown {
  const tripFare = roundFare(route.distanceKm * rule.perKm);
  const discount = Math.min(promo?.amount ?? 0, tripFare);
  const total = Math.max(0, tripFare + rule.serviceFee - discount);

  return { tripFare, serviceFee: rule.serviceFee, discount, total };
}

/** Empty breakdown, used before a destination is chosen. */
export const EmptyFare: FareBreakdown = {
  tripFare: 0,
  serviceFee: 0,
  discount: 0,
  total: 0,
};
