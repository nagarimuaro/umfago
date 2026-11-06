/**
 * Placeholder catalog and sample data for the passenger flow.
 * Replace with real API data once the backend exists.
 */

import Ionicons from '@expo/vector-icons/Ionicons';

import type { IconName } from '@/components/ds/icon';
import type {
  Driver,
  Order,
  Place,
  PaymentMethodId,
  RouteEstimate,
  ServiceOption,
  ServiceId,
} from '@/types/order';

/** Ionicons glyph per service. Kept out of the domain types so those stay UI-agnostic. */
export const ServiceIcons: Record<ServiceId, keyof typeof Ionicons.glyphMap> = {
  ride: 'bicycle',
  car: 'car-sport',
  food: 'fast-food',
  send: 'cube',
  mart: 'basket',
  med: 'medkit',
};

export const ServiceOptions: readonly ServiceOption[] = [
  {
    id: 'ride',
    label: 'Ojek Motor',
    description: 'Motor cepat, 1 penumpang',
    fare: 12000,
    etaMinutes: 3,
  },
  {
    id: 'car',
    label: 'Taksi Mobil',
    description: 'Nyaman sampai 4 penumpang',
    fare: 32000,
    etaMinutes: 6,
  },
  {
    id: 'food',
    label: 'OpenJek Food',
    description: 'Pesan antar kuliner & resto',
    fare: 9000,
    etaMinutes: 25,
  },
  {
    id: 'send',
    label: 'Kurir Send',
    description: 'Kirim paket & dokumen instan',
    fare: 15000,
    etaMinutes: 4,
  },
  {
    id: 'mart',
    label: 'OpenJek Mart',
    description: 'Belanja harian & minimarket',
    fare: 10000,
    etaMinutes: 20,
  },
  {
    id: 'med',
    label: 'OpenJek Med',
    description: 'Beli obat & kebutuhan apotek',
    fare: 12000,
    etaMinutes: 15,
  },
] as const;

export type PaymentMethodOption = {
  id: PaymentMethodId;
  label: string;
  icon: IconName;
};

/**
 * Wallet first, matching the Stitch confirm screen, which is drawn with the OpenJek
 * wallet selected. Only the wallet carries a balance to show underneath.
 */
export const PaymentMethods: readonly PaymentMethodOption[] = [
  { id: 'wallet', label: 'Dompet OpenJek', icon: 'account-balance-wallet' },
  { id: 'cash', label: 'Tunai', icon: 'payments' },
] as const;

export const SavedPlaces: readonly Place[] = [
  {
    id: 'bim',
    label: 'Bandara Internasional Minangkabau',
    address: 'Jl. Bandara Internasional Minangkabau, Padang Pariaman',
    lat: -0.7869,
    lon: 100.2809,
  },
  {
    id: 'andalas',
    label: 'Plaza Andalas',
    address: 'Jl. Pemuda No. 1, Olo, Kec. Padang Barat, Kota Padang',
    lat: -0.925,
    lon: 100.36,
  },
  {
    id: 'unand',
    label: 'Universitas Andalas (UNAND)',
    address: 'Limau Manis, Kec. Pauh, Kota Padang, Sumatera Barat',
    lat: -0.9144,
    lon: 100.4632,
  },
  {
    id: 'pantai',
    label: 'Pantai Padang (Taplau)',
    address: 'Jl. Samudera, Purus, Padang Barat, Kota Padang',
    lat: -0.9415,
    lon: 100.352,
  },
] as const;

/**
 * Routed distance from `DefaultPickup` to each saved place. Stands in for a routing
 * API call; the app must never compute these from coordinates itself. `fallback`
 * carries the 3,4 km the Stitch confirm screen is drawn with.
 */
export const SampleRoutes: Record<string, RouteEstimate> = {
  home: { distanceKm: 8.4, durationMinutes: 24 },
  work: { distanceKm: 21.7, durationMinutes: 52 },
  gym: { distanceKm: 12.3, durationMinutes: 32 },
};

/** Used when a destination has no pre-computed estimate. Matches the design's badge. */
export const FallbackRoute: RouteEstimate = { distanceKm: 3.4, durationMinutes: 18 };

export function routeFor(place: Place | null): RouteEstimate | null {
  if (!place) return null;
  return SampleRoutes[place.id] ?? FallbackRoute;
}

export const SampleDriver: Driver = {
  id: 'drv-1',
  name: 'Budi',
  rating: 4.9,
  vehicle: 'Black Honda Vario',
  plate: 'B 1234 XYZ',
  photo:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAUaey5CWybPxVKGZbhXQ5EEumyYJ_OB-cDx4GRtmKvcDw52EXfynO6S6l2SJjtisdB2CpCuLgh4Xt3pyd2SPq-VYkShnBW2YZ2lbaBYSUkBBfmJy5mTbNO-CgpClghnX4aV0EL6aTjRBqWO1qd-OSmr--dNLQt2bHmxVlS7L2U3EnxQICdGcVPmpNYUnyq_IvJ5EMZwfNIGRxlhyjXpMUigptmz8rnAOsg2kc-GlVe1KxxYZOYqUrP',
  etaMinutes: 3,
};

export const SampleHistory: readonly Order[] = [
  {
    id: 'ord-1024',
    service: 'ride',
    pickup: { id: 'home', label: 'Rumah', address: 'Jl. Kenanga No. 12, Depok' },
    destination: { id: 'work', label: 'Kantor', address: 'Gedung Cyber 2, Kuningan' },
    fare: 24000,
    payment: 'wallet',
    status: 'completed',
    createdAt: '2026-08-05T08:14:00+07:00',
    driver: SampleDriver,
  },
  {
    id: 'ord-1023',
    service: 'food',
    pickup: { id: 'resto', label: 'Warung Sari', address: 'Jl. Margonda No. 8, Depok' },
    destination: { id: 'home', label: 'Rumah', address: 'Jl. Kenanga No. 12, Depok' },
    fare: 41000,
    payment: 'cash',
    status: 'completed',
    createdAt: '2026-08-03T19:02:00+07:00',
  },
  {
    id: 'ord-1022',
    service: 'send',
    pickup: { id: 'home', label: 'Rumah', address: 'Jl. Kenanga No. 12, Depok' },
    destination: { id: 'gym', label: 'Gym', address: 'Plaza Semanggi, Jakarta Selatan' },
    fare: 18000,
    payment: 'wallet',
    status: 'cancelled',
    createdAt: '2026-08-01T11:40:00+07:00',
  },
];

/** Both Stitch screens render currency as `Rp 85.000` — space after the symbol. */
export function formatRupiah(amount: number) {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

/** `3,4 km` — Indonesian decimal comma, one fraction digit, as drawn on the badge. */
export function formatDistance(km: number) {
  return `${km.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}
