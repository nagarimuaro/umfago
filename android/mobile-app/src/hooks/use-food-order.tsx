/**
 * Shared state for one food order: what is in the cart, and where it is going.
 *
 * The cart used to live in the store screen's own `useState`, which was enough while the
 * cart bar led nowhere. Checkout and the select-address sheet both read and write it, and
 * the chosen address has to travel back up from the sheet, so the state lifts into a
 * provider the way `use-booking.tsx` holds a ride.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { FoodMerchants } from '@/constants/food';
import { FoodCheckoutAddress } from '@/constants/food-checkout';
import { FoodMenuItems } from '@/constants/food-store';
import { cartCount, cartTotal, setLineQuantity, type CartLines } from '@/lib/cart';
import { orderCharges } from '@/lib/food';
import type { FoodAddress, FoodMerchant, FoodOrderCharges } from '@/types/food';

type FoodOrderState = {
  /** The store the cart belongs to. Null until a store screen opens. */
  merchantId: string | null;
  lines: CartLines;
  address: FoodAddress;
};

const InitialState: FoodOrderState = {
  merchantId: null,
  lines: {},
  address: FoodCheckoutAddress,
};

type FoodOrderContextValue = FoodOrderState & {
  merchant: FoodMerchant | null;
  /** Pieces in the cart, not distinct items. */
  itemCount: number;
  subtotal: number;
  charges: FoodOrderCharges;
  openMerchant: (merchantId: string) => void;
  setQuantity: (itemId: string, quantity: number) => void;
  setAddress: (address: FoodAddress) => void;
  clearCart: () => void;
};

const FoodOrderContext = createContext<FoodOrderContextValue | null>(null);

export function FoodOrderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FoodOrderState>(InitialState);

  /**
   * Opening a store keeps the cart only when it is the same store: two merchants cannot
   * be checked out together, so switching stores starts a fresh cart. Returning the
   * current object unchanged when the id matches stops the store screen's mount effect
   * from re-rendering on every pass.
   */
  const openMerchant = useCallback((merchantId: string) => {
    setState((current) =>
      current.merchantId === merchantId ? current : { ...current, merchantId, lines: {} },
    );
  }, []);

  const setQuantity = useCallback((itemId: string, quantity: number) => {
    setState((current) => ({
      ...current,
      lines: setLineQuantity(current.lines, itemId, quantity),
    }));
  }, []);

  const setAddress = useCallback((address: FoodAddress) => {
    setState((current) => ({ ...current, address }));
  }, []);

  const clearCart = useCallback(() => {
    setState((current) => ({ ...current, lines: {} }));
  }, []);

  const merchant = useMemo(
    () => FoodMerchants.find((entry) => entry.id === state.merchantId) ?? FoodMerchants[0],
    [state.merchantId],
  );

  const itemCount = useMemo(() => cartCount(state.lines), [state.lines]);
  const subtotal = useMemo(() => cartTotal(state.lines, FoodMenuItems), [state.lines]);

  const charges = useMemo(
    () => orderCharges(subtotal, itemCount, merchant),
    [subtotal, itemCount, merchant],
  );

  const value = useMemo(
    () => ({
      ...state,
      merchant,
      itemCount,
      subtotal,
      charges,
      openMerchant,
      setQuantity,
      setAddress,
      clearCart,
    }),
    [
      state,
      merchant,
      itemCount,
      subtotal,
      charges,
      openMerchant,
      setQuantity,
      setAddress,
      clearCart,
    ],
  );

  return <FoodOrderContext.Provider value={value}>{children}</FoodOrderContext.Provider>;
}

export function useFoodOrder() {
  const context = useContext(FoodOrderContext);

  if (!context) {
    throw new Error('useFoodOrder must be used inside a FoodOrderProvider');
  }

  return context;
}
