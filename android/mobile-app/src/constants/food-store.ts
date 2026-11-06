/**
 * Static content for the merchant store screen, transcribed from the Stitch design
 * (`food-store.md`, "Burger Broz - Menu").
 *
 * The design ships one merchant's menu. This app lists three merchants, so until the
 * backend exists every store renders this same menu; the header still comes from the
 * merchant record in `food.ts`, so the name, rating, distance and ETA stay per-merchant.
 *
 * The design also draws four category tabs but only transcribes items for "Must Try".
 * Tabs with no items are drawn and inert, the same way the category screen's Sort chip is.
 */

import type { FoodMenuCategory, FoodMenuItem } from '@/types/food';

export const FoodStoreCopy = {
  /** Sits beside the rating, written exactly as the design has it. */
  ratingCount: '(1k+ ratings)',
  searchLabel: 'Search this menu',
  viewCart: 'View Cart',
  notFound: 'That place is no longer on the list.',
  backToList: 'Back to places',
} as const;

/** The hero photo above the store's details, `h-64` in the design. */
export const FoodStoreHero =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAwW3oYfiCBbbCs3iH_4oWBqzG0F4S7j6osA3GIt7axoeOAlLolr6kZjILXAAnUY65-czGWhQwEXQYDH_DLKMMuy33QwQGUgYHR9yYO2HXWpmT3NlvzMxfWPeWZ-XTYysYLXpilHungC7XBK1BzKdV4GNbQW8SNrZavZfZreT4kp6Xnbc7zhAudGeI_ghu4f3e30gxR2si78dzUNc_KpUiIPOF3lFYmFxILEjEcKfbPzRQ0BRn5PziO';

export const FoodMenuCategories: readonly FoodMenuCategory[] = [
  { id: 'must-try', label: 'Must Try' },
  { id: 'combos', label: 'Combos' },
  { id: 'a-la-carte', label: 'A La Carte' },
  { id: 'drinks', label: 'Drinks' },
] as const;

export const FoodMenuItems: readonly FoodMenuItem[] = [
  {
    id: 'double-smash-burger',
    categoryId: 'must-try',
    name: 'Double Smash Burger',
    description:
      'Two perfectly smashed beef patties, double cheddar cheese, house pickles, and our signature secret sauce on a toasted brioche bun.',
    price: 45000,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD0tl5zbRuzs-6NsruDvRBYlVRShPMaTx_A4Sl9Iab5INPAWJjXapuKc4OQgTFYZvXclxRzeCKSDCmYDW4BjK6ALMwotV5tXAbVuoZeY6jDCKUvJ4ZAQrG2fj_j0LLk99Z4i0XOgsxu1Qg6Vy93UqFIh_s3ZPQy374ptL-B49G14uDd24fNSEmYFGRyAXA8jV11bn5XVMJvE8qsRgHl97m9SpmNwZUuaEwBos-IC8Xz04GuQDbypN30',
  },
  {
    id: 'classic-cheeseburger',
    categoryId: 'must-try',
    name: 'Classic Cheeseburger',
    description: 'Single juicy patty, American cheese, crisp lettuce, tomato, and mayo.',
    price: 35000,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBVLbgZoJiva0GEFninqOPPmkuHh49qTIRKXKUxT1zQKKjSTR7pp_XJoQ6LXZoCuZDCVcEHA6Jr8MGa2ozP37PgALcpurbl5bWhvuj7Nt3UkYv19XnTsRoIH6zsW7yzDStphBD6one_1wPKsGZCo_UCERHynKUOzvD581tz2PrH6FXPGImD4Q1JxBLi0ZjeBcYBGhygevKiDX6QpFqbc9ejJ_e7uY-RPz_kmeKN_3IZn63icjl59r6N',
  },
  {
    id: 'truffle-fries',
    categoryId: 'must-try',
    name: 'Truffle Fries',
    description:
      'Shoestring fries tossed in truffle oil and parmesan cheese, served with garlic aioli.',
    price: 25000,
    tag: 'Popular',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCfU7InErQZOuQHr2dlTMybF9G9sxXFC0hvPSjDOPxSkVdkoK4XINUXEGzFyJi7dChe1mZRJVhcS7X96b2_-ZLAy5Cr0J_2npPkXzB-3sUdy7RNzqEXq7T-l95br7TaJwJSersjy736KRJieQjpcIlCG4Sn31NqiLbPV7_pYUo6dZFHFRPHhMAiF79khk8fVl6i2X7vju3tO7t3DM2brsRrrczbdaUCHKLeFqLjJIXKfsyLYtzcZ4r-',
  },
] as const;
