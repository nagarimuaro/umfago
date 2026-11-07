/**
 * Driver Domain Types
 */

export type DriverStatus = 'online' | 'offline' | 'busy';

export type VehicleType = 'motorcycle' | 'car';

export interface DriverVehicle {
  id: string;
  type: VehicleType;
  model: string; // e.g. "Honda Vario 125 CBS ISS"
  plateNumber: string; // e.g. "B 1234 XYZ"
  year: number; // e.g. 2022
  color: string; // e.g. "Hitam Metalik"
  stnkExpiry: string; // e.g. "12 Des 2026"
  isVerified: boolean;
}

export interface KycDocument {
  id: string;
  type: 'ktp' | 'sim' | 'skck' | 'selfie';
  title: string;
  status: 'verified' | 'pending' | 'rejected' | 'missing';
  expiryDate?: string;
  documentNumber?: string;
  lastUpdated: string;
}

export interface ShiftStats {
  todayEarnings: number;
  todayTips: number;
  completedTrips: number;
  cancelledTrips: number;
  acceptanceRate: number; // percentage, e.g. 98%
  onlineDurationMinutes: number; // e.g. 390 (6h 30m)
  rating: number; // e.g. 4.9
  reviewCount: number;
  shiftStartedAt: string;
}

export interface DriverProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  rating: number;
  totalTrips: number;
  balance: number;
  status: DriverStatus;
  isVerified: boolean;
  vehicle: DriverVehicle;
  documents: KycDocument[];
  stats: ShiftStats;
}

export interface SurgeArea {
  id: string;
  name: string;
  landmark: string;
  multiplier: number;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  level: 'medium' | 'high' | 'critical';
}

