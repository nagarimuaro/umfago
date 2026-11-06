/**
 * Cart arithmetic for the food store screen.
 *
 * Pure by design, like `food.ts`: no React, no I/O, no clock. Every update returns a new
 * record instead of mutating the one it was given.
 */

import type { FoodMenuItem } from '@/types/food';

/** Menu item id to ordered quantity. An unordered item is absent rather than zero. */
export type CartLines = Readonly<Record<string, number>>;

/** Ceiling for a single line, so a stuck finger cannot order two hundred burgers. */
export const CartLineMax = 20;

export function lineQuantity(lines: CartLines, id: string): number {
  return lines[id] ?? 0;
}

/** Zero or less drops the line entirely, which is what the stepper's minus does at 1. */
export function setLineQuantity(lines: CartLines, id: string, quantity: number): CartLines {
  const clamped = Math.min(Math.max(quantity, 0), CartLineMax);

  if (clamped === 0) {
    /* A copy is mutated here, never the argument, so callers keep their own object. */
    const next = { ...lines };
    delete next[id];

    return next;
  }

  return { ...lines, [id]: clamped };
}

/** Total pieces ordered — the "3 items" the cart bar announces. */
export function cartCount(lines: CartLines): number {
  return Object.values(lines).reduce((total, quantity) => total + quantity, 0);
}

/** Order value in rupiah. Lines whose item is not in `items` are ignored. */
export function cartTotal(lines: CartLines, items: readonly FoodMenuItem[]): number {
  return items.reduce((total, item) => total + item.price * lineQuantity(lines, item.id), 0);
}

/** An ordered line paired with the menu item it refers to. */
export type CartEntry = {
  item: FoodMenuItem;
  quantity: number;
};

/**
 * The cart as a list the checkout can render, in the menu's own order.
 *
 * Walking `items` rather than the record's keys keeps the order stable: object key order
 * would follow whatever the customer tapped first, and the design lists the order the way
 * the menu does.
 */
export function cartEntries(
  lines: CartLines,
  items: readonly FoodMenuItem[],
): readonly CartEntry[] {
  return items
    .map((item) => ({ item, quantity: lineQuantity(lines, item.id) }))
    .filter((entry) => entry.quantity > 0);
}
