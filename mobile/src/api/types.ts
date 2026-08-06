/**
 * Mirror of the backend contract (CLAUDE.md section 9), written from the Go
 * handlers rather than from the planning documents. Where the two disagree the
 * handler wins.
 *
 * Two shapes here look like they should be the same type and are not:
 * `LoginResponse.user.available_roles` is a string array while
 * `CurrentUser.available_roles` is an array of objects. Merging them would
 * force a cast at one of the two call sites.
 */

// ── Roles ───────────────────────────────────────────────────────────────

export type RoleCode =
  | 'customer'
  | 'driver_motorcycle'
  | 'driver_car'
  | 'merchant'
  | 'admin.superadmin'
  | 'admin.finance_head'
  | 'admin.finance_staff'
  | 'admin.sales_head'
  | 'admin.cs'
  | 'admin.ops_manager'
  | 'admin.driver_manager';

/** Roles an account may request for itself. Admin roles are grant-only. */
export const SELF_ASSIGNABLE_ROLES: RoleCode[] = [
  'customer',
  'driver_motorcycle',
  'driver_car',
  'merchant',
];

export type DriverRole = 'driver_motorcycle' | 'driver_car';

export const isDriverRole = (role: RoleCode): role is DriverRole =>
  role === 'driver_motorcycle' || role === 'driver_car';

export interface RoleSummary {
  code: RoleCode;
  name: string;
  group: 'user' | 'admin';
}

// ── Auth ────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: RoleCode;
}

/** `expires_in` is a duration in seconds (900), not an absolute timestamp. */
export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LoginResponse extends TokenPair {
  user: {
    id: number;
    name: string;
    email: string;
    active_role: RoleCode;
    available_roles: RoleCode[];
  };
}

export type RefreshResponse = TokenPair;

/** Switching the active role issues a new access token; the refresh token stays. */
export interface SwitchRoleResponse {
  message: string;
  active_role: RoleCode;
  access_token: string;
  expires_in: number;
}

/**
 * GET /api/user. Carries neither `permissions` nor `is_online` — the driver
 * app cannot restore its online toggle from this call alone.
 */
export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  is_active: boolean;
  is_verified: boolean;
  balance: number;
  active_role: RoleCode;
  available_roles: RoleSummary[];
}

// ── Orders ──────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'searching'
  | 'accepted'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type PaymentMethod = 'cash' | 'wallet';
export type VehicleType = 'motorcycle' | 'car';

/**
 * Serialized `models.Order`, field for field.
 *
 * `fare_amount` is the fare after promo and without `customer_fee`; what the
 * passenger pays is `fare_amount + customer_fee`, which exists as no single
 * column. `platform_fee`, `driver_earning`, and `merchant_fee` stay 0 until the
 * order completes — and they are sent to the passenger too, because the backend
 * serializes the model whole. Do not display them on passenger screens, but note
 * that hiding them here closes nothing: the data already reached the device.
 */
export interface Order {
  uuid: string;
  rider_id: number;
  driver_id: number | null;
  merchant_id: number | null;
  vehicle_id: number | null;
  status: OrderStatus;

  pickup_lat: number;
  pickup_lon: number;
  pickup_address: string;
  dropoff_lat: number;
  dropoff_lon: number;
  dropoff_address: string;
  distance_km: number;

  fare_amount: number;
  customer_fee: number;
  platform_fee: number;
  driver_earning: number;
  merchant_fee: number;
  currency: string;
  payment_method: PaymentMethod;

  voucher_code: string;
  promo_id: number | null;
  promo_discount: number;
  vehicle_type: VehicleType;

  /** null means not rated yet, not zero. */
  customer_rating: number | null;
  driver_rating: number | null;
  review_note: string;

  accepted_at: string | null;
  arrived_at: string | null;
  picked_up_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;

  created_at: string;
  updated_at: string;
}

/** Total the passenger owes. The backend sends no such column. */
export const passengerTotal = (order: Order): number =>
  order.fare_amount + order.customer_fee;

export interface CreateOrderRequest {
  service_type: 'ride' | 'motorcycle' | 'car' | 'taxi';
  pickup_lat: number;
  pickup_lon: number;
  pickup_address?: string;
  dropoff_lat: number;
  dropoff_lon: number;
  dropoff_address?: string;
  payment_method: PaymentMethod;
  promo_code?: string;
  merchant_id?: number;
}

export interface CreateOrderResponse {
  message: string;
  order: Order;
  fare: Quote;
  promo?: {
    code: string;
    discount_amount: number;
    /** Post-discount `order.fare_amount`, not `total_charged`. */
    final_fare: number;
  };
}

export interface RejectOrderResponse {
  uuid: string;
  status: OrderStatus;
  rejected_by_this_driver: boolean;
}

// ── Fare ────────────────────────────────────────────────────────────────

/**
 * `pricing.Quote`. There is no base fare and no stored minimum fare: `min_fare`
 * is derived as `min_distance_km × per_km_price`.
 *
 * The price to show the user is `total_charged`, not `total`. They are equal
 * only while `fare.customer_fee_percent` is 0, which is exactly why using the
 * wrong one goes unnoticed until the percentage is raised.
 */
export interface Quote {
  distance_km: number;
  charged_distance_km: number;
  min_distance_km: number;
  min_distance_applied: boolean;
  per_km_price: number;
  total: number;
  min_fare: number;
  customer_fee: number;
  customer_fee_percent: number;
  total_charged: number;
  min_total_charged: number;
}

export interface FareEstimateRequest {
  pickup: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  vehicle_type?: VehicleType;
}

export interface FareEstimateResponse extends Quote {
  vehicle_type: VehicleType;
  valid_for_seconds: number;
}

// ── Promo ───────────────────────────────────────────────────────────────

export interface ValidatePromoRequest {
  code: string;
  fare_before_discount: number;
}

export interface ValidatePromoResponse {
  valid: true;
  code: string;
  discount_amount: number;
  final_fare: number;
}

// ── Wallet ──────────────────────────────────────────────────────────────

/** Uppercase in the database; `amount` is always positive. */
export type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'PAYMENT'
  | 'REFUND'
  | 'EARNING'
  | 'FEE'
  | 'BONUS'
  | 'DISBURSED';

export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

const CREDIT_TYPES: TransactionType[] = ['DEPOSIT', 'REFUND', 'EARNING', 'BONUS'];

/** Direction comes from `type`. Amounts never carry a minus sign. */
export const isCredit = (type: TransactionType): boolean =>
  CREDIT_TYPES.includes(type);

export interface WalletTransaction {
  id: number;
  user_id: number;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  balance_after: number;
  note: string;
  created_at: string;
}

/**
 * For drivers the bank fields are ignored on purpose — the server uses the
 * account on the approved KYC file. Sending them anyway is harmless but
 * misleading, so the driver screen should not collect them.
 */
export interface WithdrawRequest {
  amount: number;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
}

// ── Driver ──────────────────────────────────────────────────────────────

export type KycStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';

/** All eleven fields are required; `license_expiry` is YYYY-MM-DD and future. */
export interface KycSubmitRequest {
  identity_card_number: string;
  identity_card_photo_url: string;
  license_number: string;
  license_expiry: string;
  license_photo_url: string;
  vehicle_registration_number: string;
  vehicle_registration_photo_url: string;
  selfie_photo_url: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
}

/**
 * Two shapes: without a driver profile only `status` and `missing_fields`
 * arrive. `bank_account_number` is always masked to its last four digits, so it
 * must never be echoed back into a resubmission.
 */
export interface KycStatusResponse {
  status: KycStatus;
  missing_fields?: string[];
  rejection_reason?: string;
  reviewed_at?: string | null;
  identity_card_number?: string;
  license_number?: string;
  license_expiry?: string;
  vehicle_registration_number?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
}

export type DriverStatus = 'online' | 'offline';

export interface DriverStatusResponse {
  status: DriverStatus;
  updated_at: string;
  /** Present when the Redis geo index could not be cleared; the DB is still correct. */
  warning?: string;
}

export interface EarningsResponse {
  summary: {
    trips: number;
    gross_fare: number;
    platform_fee: number;
    driver_earning: number;
  };
  /** Days without trips are absent — the chart fills the gaps itself. */
  daily: Array<{ day: string; trips: number; driver_earning: number }>;
  current_balance: number;
  meta: { from: string; to: string };
}

// ── Products ────────────────────────────────────────────────────────────

/**
 * Ordering is server-decided (CLAUDE.md section 17): a blend of score and a
 * daily-seeded exploration quota. Render it as received and do not cache it
 * across days.
 */
export interface RankedProduct {
  id: number;
  merchant_id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  photo_url: string;
  is_available: boolean;
  merchant_name: string;
  merchant_open: boolean;
  view_count_30d: number;
  order_count_30d: number;
  score: number;
  is_exploration: boolean;
}

// ── Notifications ───────────────────────────────────────────────────────

export interface AppNotification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  body: string;
  /** A JSON string, not an object — parse it a second time. */
  data: string;
  is_read: boolean;
  created_at: string;
}

// ── Uploads ─────────────────────────────────────────────────────────────

export interface UploadResponse {
  url: string;
  content_type: string;
  size: number;
}

// ── Pagination ──────────────────────────────────────────────────────────

/** The envelope key is `meta`, never `pagination`. `per_page` caps at 100. */
export interface PageMeta {
  page: number;
  per_page: number;
  total: number;
}

export interface Paginated<T> {
  meta: PageMeta;
  [key: string]: T[] | PageMeta;
}

export interface HistorySummary {
  total_orders: number;
  completed: number;
  cancelled: number;
  total_fare: number;
  total_net: number;
}

export interface OrderHistoryResponse {
  orders: Order[];
  summary?: HistorySummary;
  meta: PageMeta;
}
