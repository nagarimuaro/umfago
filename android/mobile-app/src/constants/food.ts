/**
 * Static content for the food category screen, transcribed from the Stitch design
 * (`food.md`, "OpenFood - Burgers Category"). Replace with API data once the backend
 * exists: the screen treats this as the full result set, not one page of it.
 *
 * Prices are deliberately absent. The design quotes delivery in dollars; this app
 * charges rupiah from its own tariff table, so the fee is derived at render time by
 * `deliveryFee` in `src/lib/food.ts` rather than stored here.
 */

import type { FoodFilter, FoodMerchant } from '@/types/food';

export const FoodCategoryCopy = {
  title: 'Top Burgers Near You',
  /** The design ships the field pre-filled with the category the user came from. */
  searchValue: 'Burgers',
  searchPlaceholder: 'Search...',
} as const;

export const FoodFilters: readonly FoodFilter[] = [
  { id: 'sort', label: 'Sort', icon: 'tune' },
  { id: 'rating', label: 'Rating 4.5+' },
  { id: 'nearest', label: 'Nearest' },
  { id: 'promo', label: 'Promo' },
  { id: 'quick', label: 'Under 30 mins' },
] as const;

/** The rating threshold behind the "Rating 4.5+" chip, as written on the chip. */
export const FoodRatingFloor = 4.5;

/** The ETA ceiling behind the "Under 30 mins" chip, as written on the chip. */
export const FoodQuickEtaMinutes = 30;

export const FoodMerchants: readonly FoodMerchant[] = [
  {
    id: 'smash-and-co',
    name: 'Smash & Co. Burger',
    tags: 'American • Burgers • Fast Food',
    rating: 4.9,
    distanceKm: 1.2,
    etaLabel: '15-25 min',
    etaMaxMinutes: 25,
    isFreeDelivery: true,
    isFavorite: true,
    badges: [{ label: 'Free Delivery', tone: 'primary', icon: 'local-offer' }],
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDivOXCeiCvKVZv3GDipVZiBSJu9zKOsEBJ7vMiGk1yE43hyDLM1hZJ8fQKc_CM9YFw8yCV3pGtMbCndP83aEptGI20oSe_LM28rTtxl83-lVYu3zrpwr2T57ZVf5MrdYkNxD5ltfqbk9rf6rg2p1DoCfq6_TMN_ISiiPLqTt58JXwgUXAYkuh5Dg1NOgk2cG2YSxMF6HXCrFnO3hG1T-km5nCkQXInbfv5iHcNc0Kp1ZtrEbqhTQ6i',
  },
  {
    id: 'crispy-bird',
    name: 'Crispy Bird Burgers',
    tags: 'Chicken • Burgers • Halal',
    rating: 4.7,
    distanceKm: 2.4,
    etaLabel: '20-35 min',
    etaMaxMinutes: 35,
    isFreeDelivery: false,
    isFavorite: false,
    badges: [{ label: '20% OFF', tone: 'secondary' }],
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB-YGPuCDenVDAHNdVk3lFVoTQmREiGaSqXYFJ4TZ7Vg-eeU42JpAjQN0JhMoHhsCKzrCKXv-em21_SgM7B7sCk-Bqi5WbkARYSKQxfEuKpQwkdViM5o5ds8jp-Aa0-KU7naCjlssYSekD6pQgxEhAhYsXXk3yUn1Z7o3ZPP_KGpG4XiLD38e0Cf3xjKQPivHstq0rjKkkACs7T3X2UEk7ZlFdlsMOqy-vRjdMR7ypy-JhCAxeVpplH',
  },
  {
    id: 'the-burger-joint',
    name: 'The Burger Joint',
    tags: 'American • Diner • Shakes',
    rating: 4.5,
    distanceKm: 0.8,
    etaLabel: '10-20 min',
    etaMaxMinutes: 20,
    isFreeDelivery: false,
    isFavorite: false,
    badges: [],
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuADs-xtEP8BTrPoyXwFEZKwlf8dt3TfPdaYPm43KR_OUohncemD87g3cZw5m7NKig20Jt9IuOmp1hjTRq3zNzZj-U5JzzMfswoCIlEXBYFfG1DfTPw3zH2fSSBp17G49_WUl61S05ojVC4YdpqrUtgs7ylee0w8q5ZgAV_ClsYDa4-aiz1vuBHyCMquQrW2rhiQ0B106kbR-IfRiwxrXdJ5uWZPTXY7z1BVnPRlZGeGI_EsghK_Syci',
  },
] as const;
