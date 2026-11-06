import type { PermissionCode, RoleCode } from './types';

// Pemetaan fallback sesuai models.SeedRoles di internal/models/role.go.
// CLAUDE.md §11.1: disimpan di satu berkas terpisah supaya langsung tidak dipakai
// begitu GET /api/user mengembalikan field `permissions`.
export const ALL_PERMISSIONS: PermissionCode[] = [
	'orders.view',
	'orders.cancel_any',
	'orders.force_complete',
	'finance.view_report',
	'finance.disbursement',
	'finance.refund',
	'drivers.view',
	'drivers.verify',
	'drivers.suspend',
	'drivers.bonus',
	'merchants.view',
	'merchants.approve',
	'merchants.suspend',
	'users.view',
	'users.manage',
	'settings.manage',
	'promo.manage',
	'reports.view',
	'reports.sales'
];

export const ROLE_PERMISSIONS_FALLBACK: Record<string, PermissionCode[]> = {
	'admin.superadmin': ALL_PERMISSIONS,
	'admin.finance_head': [
		'finance.view_report',
		'finance.disbursement',
		'finance.refund',
		'reports.view',
		'orders.view'
	],
	'admin.finance_staff': ['finance.view_report', 'finance.refund', 'orders.view'],
	'admin.sales_head': [
		'promo.manage',
		'reports.sales',
		'reports.view',
		'orders.view',
		'merchants.view'
	],
	'admin.cs': [
		'orders.view',
		'orders.cancel_any',
		'finance.refund',
		'users.view',
		'drivers.view'
	],
	'admin.ops_manager': [
		'orders.view',
		'orders.force_complete',
		'drivers.view',
		'reports.view',
		'merchants.view'
	],
	'admin.driver_manager': [
		'drivers.view',
		'drivers.verify',
		'drivers.suspend',
		'drivers.bonus'
	]
};

export const ROLE_LABELS: Record<string, string> = {
	'admin.superadmin': 'Super Admin',
	'admin.finance_head': 'Kepala Keuangan',
	'admin.finance_staff': 'Staf Keuangan',
	'admin.sales_head': 'Kepala Sales',
	'admin.cs': 'Customer Service',
	'admin.ops_manager': 'Manajer Operasional',
	'admin.driver_manager': 'Manajer Driver',
	customer: 'Penumpang',
	driver_motorcycle: 'Driver Motor',
	driver_car: 'Driver Mobil',
	merchant: 'Merchant'
};

export const ALL_ROLE_CODES: RoleCode[] = [
	'customer',
	'driver_motorcycle',
	'driver_car',
	'merchant',
	'admin.superadmin',
	'admin.finance_head',
	'admin.finance_staff',
	'admin.sales_head',
	'admin.cs',
	'admin.ops_manager',
	'admin.driver_manager'
];

export function isAdminRole(role?: string | null): boolean {
	return Boolean(role && role.startsWith('admin.'));
}

export function resolvePermissions(
	activeRole?: RoleCode | null,
	serverPermissions?: PermissionCode[]
): Set<PermissionCode> {
	if (activeRole === 'admin.superadmin') {
		return new Set(ALL_PERMISSIONS);
	}
	if (serverPermissions && serverPermissions.length > 0) {
		return new Set(serverPermissions);
	}
	return new Set( (activeRole && ROLE_PERMISSIONS_FALLBACK[activeRole]) || []);
}

export interface NavItem {
	href: string;
	label: string;
	group: string;
	requiredAny: PermissionCode[];
}

// Menu mengikuti struktur navigasi 9 grup besar master spec (§2.1),
// dengan otorisasi berbasis permission (CLAUDE.md §11.1–11.2).
export const NAV_ITEMS: NavItem[] = [
	// ── 1. OVERVIEW ──────────────────────────────────────────────────────────
	{
		href: '/',
		label: 'Dashboard & Analitik',
		group: '1. Overview',
		requiredAny: ['reports.view', 'reports.sales']
	},

	// ── 2. CORE OPERATIONS ───────────────────────────────────────────────────
	{
		href: '/orders',
		label: 'Order Management',
		group: '2. Core Operations',
		requiredAny: ['orders.view']
	},
	{
		href: '/drivers',
		label: 'Driver & Verifikasi KYC',
		group: '2. Core Operations',
		requiredAny: ['drivers.view']
	},
	{
		href: '/merchants',
		label: 'Merchant Management',
		group: '2. Core Operations',
		requiredAny: ['merchants.view']
	},
	{
		href: '/users',
		label: 'Passenger & User Directory',
		group: '2. Core Operations',
		requiredAny: ['users.view']
	},
	{
		href: '/fleet',
		label: 'Fleet Management',
		group: '2. Core Operations',
		requiredAny: ['drivers.view']
	},

	// ── 3. MAP & LOCATION ────────────────────────────────────────────────────
	{
		href: '/map/live',
		label: 'Live Map & Driver Tracking',
		group: '3. Map & Location',
		requiredAny: ['drivers.view']
	},
	{
		href: '/map/zones',
		label: 'Service Areas & Geofencing',
		group: '3. Map & Location',
		requiredAny: ['settings.manage']
	},

	// ── 4. BUSINESS MANAGEMENT ───────────────────────────────────────────────
	{
		href: '/services',
		label: 'Service & Tariff Catalog',
		group: '4. Business Management',
		requiredAny: ['settings.manage']
	},
	{
		href: '/promos',
		label: 'Promotions & Marketing',
		group: '4. Business Management',
		requiredAny: ['promo.manage']
	},

	// ── 5. FINANCIAL MANAGEMENT ──────────────────────────────────────────────
	{
		href: '/finance',
		label: 'Financial Reports & Payouts',
		group: '5. Financial Management',
		requiredAny: ['finance.view_report', 'finance.disbursement', 'finance.refund']
	},

	// ── 6. CUSTOMER EXPERIENCE ───────────────────────────────────────────────
	{
		href: '/support',
		label: 'Customer Support & Dispute',
		group: '6. Customer Experience',
		requiredAny: ['orders.view']
	},

	// ── 7. RISK & COMPLIANCE ─────────────────────────────────────────────────
	{
		href: '/risk',
		label: 'Risk & Fraud Detection',
		group: '7. Risk & Compliance',
		requiredAny: ['orders.view']
	},

	// ── 8. ADMINISTRATION ────────────────────────────────────────────────────
	{
		href: '/organization',
		label: 'Multi-City & Branches',
		group: '8. Administration',
		requiredAny: ['settings.manage']
	},
	{
		href: '/approvals',
		label: 'Approval Workflows',
		group: '8. Administration',
		requiredAny: ['settings.manage']
	},
	{
		href: '/audit-logs',
		label: 'Audit Logs',
		group: '8. Administration',
		requiredAny: ['settings.manage']
	},

	// ── 9. SYSTEM & DEVELOPER ────────────────────────────────────────────────
	{
		href: '/settings',
		label: 'General & Pricing Settings',
		group: '9. System & Developer',
		requiredAny: ['settings.manage']
	},
	{
		href: '/system/monitoring',
		label: 'System & Infra Monitoring',
		group: '9. System & Developer',
		requiredAny: ['settings.manage']
	}
];

