/**
 * Shared domain types for the passenger booking flow.
 */

export type ServiceId = 'ride' | 'car' | 'food' | 'send' | 'mart' | 'med';

export type Place = {
  id: string;
  label: string;
  address: string;
  detail?: string; // Catatan detail patokan maksimal 100 karakter
  lat?: number;
  lon?: number;
};

export type ServiceOption = {
  id: ServiceId;
  label: string;
  description: string;
  /** Fare in whole rupiah. */
  fare: number;
  /** Estimated pickup time in minutes. */
  etaMinutes: number;
};

export type PaymentMethodId = 'cash' | 'wallet';

/**
 * Routed distance between pickup and destination, shown as the "3,4 km" badge on the
 * confirm screen. Supplied by a routing service in production; the app never derives
 * it from coordinates itself.
 */
export type RouteEstimate = {
  distanceKm: number;
  /** Trip duration in minutes, quoted as "18 mins" on the ride-summary screen. */
  durationMinutes: number;
  /** Koordinat rute mengikuti lekukan jalan raya [lon, lat] */
  coordinates?: Array<[number, number]>;
};

/**
 * Per-service tariff. The confirm screen quotes a trip fare of Rp10.200 over 3,4 km
 * with a Rp0 service fee, so the fare is a flat rate per kilometre plus a separate
 * fee line — there is no flag-down charge or time component in the design.
 */
export type FareRule = {
  service: ServiceId;
  /** Rupiah per kilometre of routed distance. */
  perKm: number;
  /** Shown as "Biaya layanan". Zero for ride in the current design. */
  serviceFee: number;
};

/** Itemised fare, in whole rupiah. Mirrors the four lines of "Rincian Pembayaran". */
export type FareBreakdown = {
  /** "Tarif perjalanan" — distance x `perKm`. */
  tripFare: number;
  /** "Biaya layanan". */
  serviceFee: number;
  /** "Potongan promo", stored positive and subtracted from the total. */
  discount: number;
  /** "Total dibayar" — what the passenger is charged. */
  total: number;
};

/** A redeemable promo code entered in the confirm screen's promo field. */
export type Promo = {
  code: string;
  label: string;
  /** Flat rupiah taken off the trip fare. */
  amount: number;
};

export type Driver = {
  id: string;
  name: string;
  rating: number;
  vehicle: string;
  plate: string;
  /** Portrait shown on the tracking sheet and the rating card. */
  photo: string;
  /** Minutes until the driver reaches the pickup point. */
  etaMinutes: number;
};

export type TripStatus = 'searching' | 'pickup' | 'onTrip' | 'completed' | 'cancelled';

export type Order = {
  id: string;
  service: ServiceId;
  pickup: Place;
  destination: Place;
  fare: number;
  payment: PaymentMethodId;
  status: TripStatus;
  /** ISO 8601 timestamp. */
  createdAt: string;
  driver?: Driver;
};
