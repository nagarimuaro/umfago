/**
 * Food ordering domain types.
 *
 * Kept free of UI imports beyond the icon name union, the same way `order.ts` is, so
 * the merchant list can be served from an API later without touching the components.
 */

import type { IconName } from '@/components/ds/icon';

/** Cover badges come in the design's two filled treatments. */
export type FoodBadgeTone = 'primary' | 'secondary';

export type FoodBadge = {
  label: string;
  tone: FoodBadgeTone;
  icon?: IconName;
};

export type FoodMerchant = {
  id: string;
  name: string;
  /** Cuisine line, rendered verbatim: "American • Burgers • Fast Food". */
  tags: string;
  rating: number;
  distanceKm: number;
  /** Delivery window exactly as the design writes it, e.g. "15-25 min". */
  etaLabel: string;
  /** Upper bound of `etaLabel`, so the "Under 30 mins" filter has a number to test. */
  etaMaxMinutes: number;
  /** Drives the Rp0 delivery fee and the "Free Delivery" badge. */
  isFreeDelivery: boolean;
  isFavorite: boolean;
  badges: readonly FoodBadge[];
  image: string;
};

/**
 * The filter row's five controls. `sort` opens a sheet the design does not specify, so
 * it is drawn but inert; the other four narrow or reorder the list.
 */
export type FoodFilterId = 'sort' | 'rating' | 'nearest' | 'promo' | 'quick';

export type FoodFilter = {
  id: FoodFilterId;
  label: string;
  icon?: IconName;
};

/** The store screen's sticky tabs, in the order the design lists them. */
export type FoodMenuCategoryId = 'must-try' | 'combos' | 'a-la-carte' | 'drinks';

export type FoodMenuCategory = {
  id: FoodMenuCategoryId;
  label: string;
};

export type FoodMenuItem = {
  id: string;
  categoryId: FoodMenuCategoryId;
  name: string;
  description: string;
  /** Rupiah. Unlike the category screen, this design quotes prices in rupiah already. */
  price: number;
  /** Inline label beside the name, e.g. "Popular". */
  tag?: string;
  image: string;
};

/**
 * A delivery address, drawn both on the checkout card and in the select-address sheet.
 *
 * `address` is the street line and `area` the district line under it. A saved slot the
 * user has not filled in yet carries neither, which is what makes the sheet offer to add
 * one instead of selecting it.
 */
export type FoodAddress = {
  id: string;
  /** "Home", "Work", or a place name such as "Pacific Place". */
  label: string;
  address?: string;
  area?: string;
  icon: IconName;
  /** Courier instruction, drawn as a chip under the address on the checkout card. */
  note?: string;
};

/** Itemised charges, one field per line of the checkout's Payment Summary. */
export type FoodOrderCharges = {
  subtotal: number;
  /** Pieces ordered, for the "Subtotal (2 items)" label. */
  itemCount: number;
  delivery: number;
  service: number;
  total: number;
};
