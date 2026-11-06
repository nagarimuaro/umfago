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
  {
    id: 'smash-combo-feast',
    categoryId: 'combos',
    name: 'Smash Combo Feast',
    description: 'Double Smash Burger + Truffle Fries + Coca Cola. Hemat 15%!',
    price: 75000,
    tag: 'Best Value',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuADs-xtEP8BTrPoyXwFEZKwlf8dt3TfPdaYPm43KR_OUohncemD87g3cZw5m7NKig20Jt9IuOmp1hjTRq3zNzZj-U5JzzMfswoCIlEXBYFfG1DfTPw3zH2fSSBp17G49_WUl61S05ojVC4YdpqrUtgs7ylee0w8q5ZgAV_ClsYDa4-aiz1vuBHyCMquQrW2rhiQ0B106kbR-IfRiwxrXdJ5uWZPTXY7z1BVnPRlZGeGI_EsghK_Syci',
  },
  {
    id: 'cheeseburger-meal',
    categoryId: 'combos',
    name: 'Cheeseburger Meal',
    description: 'Classic Cheeseburger + Crispy French Fries + Iced Lemon Tea.',
    price: 55000,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAwW3oYfiCBbbCs3iH_4oWBqzG0F4S7j6osA3GIt7axoeOAlLolr6kZjILXAAnUY65-czGWhQwEXQYDH_DLKMMuy33QwQGUgYHR9yYO2HXWpmT3NlvzMxfWPeWZ-XTYysYLXpilHungC7XBK1BzKdV4GNbQW8SNrZavZfZreT4kp6Xnbc7zhAudGeI_ghu4f3e30gxR2si78dzUNc_KpUiIPOF3lFYmFxILEjEcKfbPzRQ0BRn5PziO',
  },
  {
    id: 'crispy-chicken-tenders',
    categoryId: 'a-la-carte',
    name: 'Crispy Chicken Tenders',
    description: '4 potong dada ayam goreng krispi dengan saus spicy mayo gurih.',
    price: 32000,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB-YGPuCDenVDAHNdVk3lFVoTQmREiGaSqXYFJ4TZ7Vg-eeU42JpAjQN0JhMoHhsCKzrCKXv-em21_SgM7B7sCk-Bqi5WbkARYSKQxfEuKpQwkdViM5o5ds8jp-Aa0-KU7naCjlssYSekD6pQgxEhAhYsXXk3yUn1Z7o3ZPP_KGpG4XiLD38e0Cf3xjKQPivHstq0rjKkkACs7T3X2UEk7ZlFdlsMOqy-vRjdMR7ypy-JhCAxeVpplH',
  },
  {
    id: 'cheesy-bacon-fries',
    categoryId: 'a-la-carte',
    name: 'Cheesy Bacon Loaded Fries',
    description: 'Kentang goreng crinkle-cut dengan saus keju leleh cheddar dan taburan daging asap renyah.',
    price: 30000,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCfU7InErQZOuQHr2dlTMybF9G9sxXFC0hvPSjDOPxSkVdkoK4XINUXEGzFyJi7dChe1mZRJVhcS7X96b2_-ZLAy5Cr0J_2npPkXzB-3sUdy7RNzqEXq7T-l95br7TaJwJSersjy736KRJieQjpcIlCG4Sn31NqiLbPV7_pYUo6dZFHFRPHhMAiF79khk8fVl6i2X7vju3tO7t3DM2brsRrrczbdaUCHKLeFqLjJIXKfsyLYtzcZ4r-',
  },
  {
    id: 'iced-lemon-tea',
    categoryId: 'drinks',
    name: 'Iced Lemon Tea',
    description: 'Seduhan teh premium dingin dengan perasan lemon segar pilihan.',
    price: 15000,
    image:
      'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'chocolate-milkshake',
    categoryId: 'drinks',
    name: 'Creamy Chocolate Milkshake',
    description: 'Milkshake cokelat kental dengan topping whipped cream dan taburan choco chips.',
    price: 24000,
    tag: 'Favorite',
    image:
      'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'coca-cola-can',
    categoryId: 'drinks',
    name: 'Coca-Cola 330ml Can',
    description: 'Minuman soda dingin segar penyegar dahaga.',
    price: 12000,
    image:
      'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
  },
] as const;
