/**
 * Copy and seed data for the select-address screen, transcribed from the Stitch export
 * `food-detailAddress.md`. Replace with API data once the backend exists.
 */

import type { FoodAddress } from '@/types/food';

export const FoodAddressCopy = {
  title: 'Select Address',
  /** Bubble above the map pin. */
  pinTooltip: 'Set Location Here',
  searchPlaceholder: 'Search for your address',
  currentLocation: 'Use Current Location',
  savedSection: 'Saved Addresses',
  recentSection: 'Recent Places',
  add: 'Add',
  confirm: 'Confirm Location',
} as const;

/**
 * The map behind the sheet. A still image, the same stand-in the booking screens use:
 * this app carries no map SDK yet, and the design ships a screenshot too.
 */
export const FoodAddressMap = {
  uri: 'https://images.bisnis.com/posts/2025/12/29/1940040/tampilan_peta_di_google_maps_1766972896.jpg',
  alt: 'Peta area pengantaran dengan penanda di tengah',
} as const;

/** Prompt on a saved slot with nothing in it yet, e.g. "Add home address". */
export function addAddressPrompt(label: string): string {
  return `Add ${label.toLowerCase()} address`;
}

/**
 * The two saved slots. "Home" carries no address, which is how the design draws it: an
 * "Add" button instead of a selectable row.
 */
export const FoodSavedAddresses: readonly FoodAddress[] = [
  { id: 'saved-home', label: 'Home', icon: 'home' },
  {
    id: 'saved-work',
    label: 'Work',
    address: 'Sudirman Central Business District, Senayan',
    icon: 'work',
  },
] as const;

export const FoodRecentPlaces: readonly FoodAddress[] = [
  {
    id: 'recent-grand-indonesia',
    label: 'Grand Indonesia Mall',
    address: 'Jl. M.H. Thamrin No.1, Menteng',
    icon: 'history',
  },
  {
    id: 'recent-soekarno-hatta',
    label: 'Soekarno-Hatta International Airport',
    address: 'Terminal 3 Departure, Tangerang',
    icon: 'history',
  },
  {
    id: 'recent-pacific-place',
    label: 'Pacific Place',
    address: 'Jl. Jend. Sudirman kav 52-53, Senayan',
    icon: 'history',
  },
] as const;
