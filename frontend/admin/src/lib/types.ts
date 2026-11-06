// Kontrak tipe yang mencerminkan handler Go di internal/handlers/*
// Perhatian: gorm.Model men-serialize ID/CreatedAt/UpdatedAt dengan PascalCase.

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

export type PermissionCode =
	| 'orders.view'
	| 'orders.cancel_any'
	| 'orders.force_complete'
	| 'finance.view_report'
	| 'finance.disbursement'
	| 'finance.refund'
	| 'drivers.view'
	| 'drivers.verify'
	| 'drivers.suspend'
	| 'drivers.bonus'
	| 'merchants.view'
	| 'merchants.approve'
	| 'merchants.suspend'
	| 'users.view'
	| 'users.manage'
	| 'settings.manage'
	| 'promo.manage'
	| 'reports.view'
	| 'reports.sales';

export type OrderStatus =
	| 'searching'
	| 'accepted'
	| 'arrived'
	| 'in_progress'
	| 'completed'
	| 'cancelled';

export type KYCStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';

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

export interface PageMeta {
	page: number;
	per_page: number;
	total: number;
}

export interface RoleItem {
	code: RoleCode;
	name: string;
	group: 'user' | 'admin';
}

export interface CurrentUser {
	id: number;
	name: string;
	email: string;
	phone: string;
	is_active: boolean;
	is_verified: boolean;
	balance: number;
	active_role: RoleCode;
	available_roles: RoleItem[];
	// Disiapkan bila backend menambahkan field permissions di GET /api/user (§16)
	permissions?: PermissionCode[];
}

export interface LoginResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	user: {
		id: number;
		name: string;
		email: string;
		active_role: RoleCode;
		available_roles: RoleCode[];
	};
}

export interface Vehicle {
	ID: number;
	user_id?: number;
	type?: string;
	brand: string;
	model_name?: string;
	plate_number: string;
}

export interface DriverProfile {
	id: number;
	user_id: number;
	identity_card_number: string;
	identity_card_photo_url: string;
	license_number: string;
	license_expiry: string | null;
	license_photo_url: string;
	vehicle_registration_number: string;
	vehicle_registration_photo_url: string;
	selfie_photo_url: string;
	bank_name: string;
	bank_account_number: string;
	bank_account_name: string;
	kyc_status: KYCStatus;
	kyc_submitted_at: string | null;
	kyc_reviewed_at: string | null;
	kyc_reviewed_by: number | null;
	kyc_rejection_reason: string;
	total_trips: number;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface UserEntity {
	ID: number;
	CreatedAt: string;
	UpdatedAt: string;
	name: string;
	email: string;
	phone: string;
	active_role: RoleCode;
	roles?: Array<{ ID?: number; code: RoleCode; name: string; group: string }>;
	is_active: boolean;
	is_online: boolean;
	online_since?: string;
	is_verified: boolean;
	balance: number;
	vehicles?: Vehicle[];
	driver_profile?: DriverProfile;
}

export interface OrderEntity {
	ID: number;
	CreatedAt: string;
	UpdatedAt: string;
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
	payment_method: 'cash' | 'wallet';
	voucher_code: string;
	promo_id: number | null;
	promo_discount: number;
	vehicle_type: 'motorcycle' | 'car';
	customer_rating: number | null;
	driver_rating: number | null;
	review_note: string;
	accepted_at: string | null;
	arrived_at: string | null;
	picked_up_at: string | null;
	completed_at: string | null;
	cancelled_at: string | null;
	rider?: UserEntity;
	driver?: UserEntity;
}

export interface WalletTransaction {
	id: number;
	user_id: number;
	amount: number;
	type: TransactionType;
	status: TransactionStatus;
	balance_after: number;
	ref_id: string;
	order_uuid: string;
	bank_name?: string;
	bank_account_number?: string;
	bank_account_name?: string;
	note: string;
	created_at: string;
	updated_at: string;
}

export interface MerchantProfile {
	id: number;
	user_id: number;
	business_name: string;
	business_address: string;
	category: string;
	is_active: boolean;
	is_open: boolean;
	created_at: string;
	updated_at: string;
}

export interface PromoEntity {
	ID: number;
	CreatedAt: string;
	UpdatedAt: string;
	code: string;
	name: string;
	description: string;
	discount_type: 'percent' | 'fixed';
	discount_value: number;
	max_discount: number;
	min_fare: number;
	quota: number;
	used_count: number;
	per_user_limit: number;
	starts_at: string;
	ends_at: string;
	is_active: boolean;
}

export interface PromoUsage {
	id: number;
	promo_id: number;
	user_id: number;
	order_uuid: string;
	discount: number;
	created_at: string;
}

export interface DynamicSettingItem {
	key: string;
	value: string;
	type: 'string' | 'float' | 'int' | 'bool' | 'json';
	description: string;
	group: string;
}

export interface DashboardReport {
	range: { from: string; to: string };
	orders_by_status: Array<{ status: OrderStatus; count: number }>;
	completed: {
		total: number;
		gross_revenue: number;
		avg_fare: number;
		avg_distance: number;
	};
	active_drivers: number;
	total_customers: number;
}

export interface FinanceReport {
	range: { from: string; to: string };
	orders: {
		total: number;
		gross_revenue: number;
		platform_fee: number;
		driver_earning: number;
	};
	wallet_by_type: Array<{ type: TransactionType; count: number; total: number }>;
	pending_withdrawal: number;
}

export interface SalesReport {
	range: { from: string; to: string };
	daily: Array<{ day: string; orders: number; gross: number; platform_fee: number }>;
}

export interface TopDriversReport {
	range: { from: string; to: string };
	drivers: Array<{
		driver_id: number;
		name: string;
		trips: number;
		earning: number;
		rating: number;
	}>;
}

// ── Enterprise Master Specification Models (§2.1, §4–§21) ───────────────────

export interface LiveDriverLocation {
	driver_id: number;
	name: string;
	role_code: string;
	vehicle_type: string;
	plate_number: string;
	lat: number;
	lon: number;
	has_location: boolean;
	online_since?: string;
}

export interface CityEntity {
	id: number;
	code: string;
	name: string;
	province: string;
	timezone: string;
	currency: string;
	center_lat: number;
	center_lon: number;
	radius_km: number;
	is_active: boolean;
	created_at: string;
}

export interface BranchEntity {
	id: number;
	city_id: number;
	code: string;
	name: string;
	address: string;
	phone: string;
	manager_name: string;
	is_active: boolean;
	created_at: string;
}

export interface GeoZoneEntity {
	id: number;
	city_id: number;
	name: string;
	zone_type: 'service_area' | 'surge_zone' | 'restricted' | 'pickup_point';
	center_lat: number;
	center_lon: number;
	radius_km: number;
	surge_multiplier: number;
	extra_fee_idr: number;
	notes: string;
	is_active: boolean;
	created_at: string;
}

export interface ServiceCatalogEntity {
	id: number;
	code: string;
	name: string;
	category: string;
	vehicle_type: string;
	per_km_price_idr: number;
	min_distance_km: number;
	platform_fee_percent: number;
	customer_fee_percent: number;
	is_active: boolean;
	created_at: string;
}

export interface SupportTicketEntity {
	id: number;
	user_id: number;
	order_uuid: string;
	category: string;
	priority: 'low' | 'medium' | 'high' | 'critical';
	status: 'open' | 'in_progress' | 'resolved' | 'closed';
	subject: string;
	description: string;
	assigned_to?: number;
	resolution_note: string;
	resolved_at?: string;
	created_at: string;
}

export interface RiskCaseEntity {
	id: number;
	user_id: number;
	order_uuid: string;
	risk_type: string;
	severity: 'low' | 'medium' | 'high' | 'critical';
	risk_score: number;
	status: 'open' | 'investigating' | 'confirmed' | 'dismissed';
	summary: string;
	action_taken: string;
	reviewed_by?: number;
	reviewed_at?: string;
	created_at: string;
}

export interface ApprovalRequestEntity {
	id: number;
	module: string;
	action: string;
	target_id: string;
	payload_json: string;
	reason: string;
	requested_by: number;
	status: 'pending' | 'approved' | 'rejected';
	reviewed_by?: number;
	review_note: string;
	reviewed_at?: string;
	created_at: string;
}

export interface AuditLogEntity {
	id: number;
	actor_id: number;
	actor_email: string;
	actor_role: string;
	module: string;
	action: string;
	target_type: string;
	target_id: string;
	summary: string;
	ip_address: string;
	user_agent: string;
	created_at: string;
}

export interface FeatureFlagEntity {
	id: number;
	key: string;
	name: string;
	description: string;
	enabled: boolean;
	rollout_pct: number;
	updated_at: string;
}

export interface SystemHealthData {
	status: string;
	uptime: string;
	started: string;
	database: {
		status: boolean;
		open_conns: number;
		in_use: number;
		idle: number;
		wait_count: number;
		wait_duration: string;
	};
	runtime: {
		go_version: string;
		goroutines: number;
		alloc_mb: number;
		sys_mb: number;
		num_gc: number;
	};
}

