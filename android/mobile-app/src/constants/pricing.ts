/**
 * Tariff table for the passenger app.
 *
 * Calibrated against the confirm screen in the Stitch design, which quotes a 3,4 km
 * ride as a Rp10.200 trip fare with a Rp0 service fee — exactly Rp3.000 per kilometre.
 * Only the ride rate is given by the design; the other services carry the same rate
 * until their own screens exist. Real tariffs are regulated per zone and change, so a
 * deployment must fetch the active table from the backend rather than ship it.
 */

import type { FareRule, Promo, ServiceId } from '@/types/order';

export const FareRules: Record<ServiceId, FareRule> = {
  ride: { service: 'ride', perKm: 3000, serviceFee: 0 },
  car: { service: 'car', perKm: 5000, serviceFee: 0 },
  food: { service: 'food', perKm: 3000, serviceFee: 3000 },
  send: { service: 'send', perKm: 3500, serviceFee: 0 },
  mart: { service: 'mart', perKm: 3000, serviceFee: 2000 },
  med: { service: 'med', perKm: 3000, serviceFee: 2000 },
};

/**
 * Promos accepted by the confirm screen's code field. The design shows a Rp1.500
 * reduction on a Rp10.200 fare, which is not a round percentage, so promos are
 * modelled as flat rupiah amounts.
 */
export const AvailablePromos: readonly Promo[] = [
  { code: 'HEMAT10', label: 'Potongan promo Rp 3.000', amount: 3000 },
  { code: 'DISKON20', label: 'Diskon 20% Liburan', amount: 3000 },
  { code: 'MAKANHEMAT', label: 'Gratis Ongkir Food', amount: 15000 },
  { code: 'KIRIMHEMAT', label: 'Potongan Ongkir Kirim', amount: 5000 },
  { code: 'PPOBCASHBACK', label: 'Cashback PPOB 10%', amount: 5000 },
] as const;

/** Rupiah figures are quoted in whole hundreds. */
export const FareRounding = 100;

/**
 * Flat handling charge on a food order, drawn as "Service Fee" on the food checkout
 * screen, which quotes it as Rp3.000.
 *
 * It is deliberately not folded into `FareRules.food.serviceFee`: that field feeds the
 * ride confirm screen's fare breakdown, where the design quotes a Rp0 service fee. Food
 * is the only flow whose design asks for this line.
 */
export const FoodServiceFee = 3000;
