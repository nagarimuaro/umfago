/**
 * Driver Order Types & Lifecycle
 */

export type OrderServiceType = 'ride' | 'car' | 'food' | 'send';

export type DriverOrderStep = 
  | 'idle'
  | 'offered'
  | 'heading_to_pickup'
  | 'arrived_at_pickup'
  | 'in_trip'
  | 'completed';

export interface LocationPoint {
  latitude: number;
  longitude: number;
  address: string;
  landmark?: string;
  notes?: string;
}

export interface CustomerInfo {
  id: number;
  name: string;
  phone: string;
  avatarUrl?: string;
  rating: number;
}

export interface DriverOrderItem {
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface DriverOrder {
  id: string; // uuid
  code: string; // e.g. "ORD-8291"
  serviceType: OrderServiceType;
  step: DriverOrderStep;
  customer: CustomerInfo;
  pickup: LocationPoint;
  destination: LocationPoint;
  distanceKm: number;
  estimatedDurationMinutes: number;
  fareAmount: number;
  driverEarnings: number; // nett after commission
  platformFee: number;
  tipAmount: number;
  paymentMethod: 'cash' | 'wallet' | 'qris';
  status: 'searching' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
  items?: DriverOrderItem[];
  restaurantName?: string;
  createdAt: string;
  expiresInSeconds?: number;
}
