/**
 * Static content for the OpenJek home screen, transcribed from the Stitch design.
 * Replace with API data once the backend exists.
 */

import type { IconName } from '@/components/ds/icon';

export type HomeService = {
  id: string;
  label: string;
  icon: IconName;
  /** Draws the small error-colored corner accent, as on the Food tile. */
  accent?: boolean;
  /** Renders the outlined "More" treatment instead of a filled tile. */
  muted?: boolean;
};

export const HomeServices: readonly HomeService[] = [
  { id: 'ride', label: 'Ride', icon: 'two-wheeler' },
  { id: 'car', label: 'Car', icon: 'directions-car' },
  { id: 'food', label: 'Food', icon: 'restaurant', accent: true },
  { id: 'send', label: 'Send', icon: 'local-shipping' },
  { id: 'mart', label: 'Mart', icon: 'storefront' },
  { id: 'med', label: 'Med', icon: 'medication' },
  { id: 'protect', label: 'Protect', icon: 'health-and-safety' },
  { id: 'more', label: 'More', icon: 'grid-view', muted: true },
] as const;

export const Wallet = {
  label: 'OpenPay Balance',
  /** Both the home and confirm Stitch screens are drawn with this balance. */
  balance: 85000,
} as const;

export type Restaurant = {
  id: string;
  name: string;
  tags: string;
  rating: number;
  distanceKm: number;
  priceLevel: string;
  image: string;
};

export const NearbyFavorites: readonly Restaurant[] = [
  {
    id: 'nasgor-88',
    name: 'Nasi Goreng Gila 88',
    tags: 'Indonesian, Rice, Spicy',
    rating: 4.8,
    distanceKm: 1.2,
    priceLevel: '$$',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCHHDSsSYyAB2kSgnFQNKEpV6AEbq5b7khaphDRef8_UivDbXS_qSuiDS2s9xPsu-YTgMpaHzwoNYoH3_rWQoj7thiqY64IKtjnJpU12QaGfE04cCwQbRouRK50m7YEBvM-BS15BMB-GfEbMGPlvELzEbstEFUs4FZcNdqVfNgquUgBwchGgbXTJkTx5czH4fnDh8jpBORqp-4dEaSC6GAVgE2KFU5L0Qe9b6CSTaJM2raJdOGhhA_l',
  },
  {
    id: 'burger-broz',
    name: 'Burger Broz',
    tags: 'Western, Fast Food, Burgers',
    rating: 4.5,
    distanceKm: 2.5,
    priceLevel: '$$$',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDr1DlTnthSw-7vySd5Ara7Sfi3E2FR5d2kJWy6dKcffDhdN4Z4yP27NmPswIO1e3Jn0nZNCQkeJuKbOLYMkBquLbkZWhoF2zbk4oAEaBn1BzJrdqvizkaoX1a7iZSI6yoGn2YzuMSQHVnc0U28AWVHoA_oW46MZKh9gVUbltXObwcVLUeTfjOxEYmXCQynRBK7KgNMCMvGBL6vF4kr4gtdP_WnOkEQt9Fa8MvMCyKoPE_cassZGkaw',
  },
  {
    id: 'matcha-co',
    name: 'Matcha & Co',
    tags: 'Beverages, Desserts, Cafe',
    rating: 4.9,
    distanceKm: 0.8,
    priceLevel: '$',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBU1BR-jqJ-IncPmWF18LLckeiK5hwzEvLfnvRRaRy82loi60zeG9m2GUvBTy0Jzw8Tp7FOZMUDlqkifS6eJtXUZ7E5a18Qk_tM4pel1-mNqq1KHZh-zOaxtAP6-SO4N3zirfu7AAQepHltq-24XI6fG0whoPFQOFa09uoBXAFgjXD5eA6S0zEcHrbzULpkohA8NTR6_IK8lmvuoBlFbXADMqNM28xDrvzXpPHfPzJ01TDK7LHvPPDG',
  },
] as const;
