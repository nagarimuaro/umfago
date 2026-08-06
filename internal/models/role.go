package models

import (
	"time"

	"gorm.io/gorm"
)

// Grup role — memisahkan pengguna aplikasi dari staf back-office
const (
	RoleGroupUser  = "user"
	RoleGroupAdmin = "admin"
)

// RoleCode — kode role yang valid di sistem
type RoleCode string

const (
	// ── Pengguna Umum ─────────────────────────────────
	RoleCustomer         RoleCode = "customer"
	RoleDriverMotorcycle RoleCode = "driver_motorcycle"
	RoleDriverCar        RoleCode = "driver_car"
	RoleMerchant         RoleCode = "merchant"

	// ── Admin Back-Office ─────────────────────────────
	RoleSuperAdmin    RoleCode = "admin.superadmin"
	RoleFinanceHead   RoleCode = "admin.finance_head"
	RoleFinanceStaff  RoleCode = "admin.finance_staff"
	RoleSalesHead     RoleCode = "admin.sales_head"
	RoleCS            RoleCode = "admin.cs"
	RoleOpsManager    RoleCode = "admin.ops_manager"
	RoleDriverManager RoleCode = "admin.driver_manager"
)

// PermissionCode — kode aksi spesifik yang bisa dimiliki sebuah role
type PermissionCode string

const (
	// Orders
	PermOrdersView          PermissionCode = "orders.view"
	PermOrdersCancelAny     PermissionCode = "orders.cancel_any"
	PermOrdersForceComplete PermissionCode = "orders.force_complete"

	// Finance
	PermFinanceViewReport   PermissionCode = "finance.view_report"
	PermFinanceDisbursement PermissionCode = "finance.disbursement"
	PermFinanceRefund       PermissionCode = "finance.refund"

	// Drivers
	PermDriversView    PermissionCode = "drivers.view"
	PermDriversVerify  PermissionCode = "drivers.verify"
	PermDriversSuspend PermissionCode = "drivers.suspend"
	PermDriversBonus   PermissionCode = "drivers.bonus"

	// Merchants
	PermMerchantsView    PermissionCode = "merchants.view"
	PermMerchantsApprove PermissionCode = "merchants.approve"
	PermMerchantsSuspend PermissionCode = "merchants.suspend"

	// Users
	PermUsersView   PermissionCode = "users.view"
	PermUsersManage PermissionCode = "users.manage"

	// Settings & Promo
	PermSettingsManage PermissionCode = "settings.manage"
	PermPromoManage    PermissionCode = "promo.manage"

	// Reports
	PermReportsView  PermissionCode = "reports.view"
	PermReportsSales PermissionCode = "reports.sales"
)

// Role — definisi role dalam sistem
type Role struct {
	gorm.Model
	Code        RoleCode     `json:"code" gorm:"uniqueIndex;not null"`
	Name        string       `json:"name" gorm:"not null"`
	Group       string       `json:"group" gorm:"index"` // "user" atau "admin"
	Description string       `json:"description"`
	Permissions []Permission `json:"permissions,omitempty" gorm:"many2many:role_permissions;"`
}

// Permission — aksi spesifik yang bisa dilakukan
type Permission struct {
	gorm.Model
	Code        PermissionCode `json:"code" gorm:"uniqueIndex;not null"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Group       string         `json:"group"` // "orders", "finance", "drivers", dll
}

// UserRole — tabel pivot antara user dan role yang boleh dipakainya.
// Dideklarasikan eksplisit agar bisa di-AutoMigrate dan diberi unique index.
type UserRole struct {
	UserID    uint      `gorm:"primaryKey;autoIncrement:false" json:"user_id"`
	RoleID    uint      `gorm:"primaryKey;autoIncrement:false" json:"role_id"`
	CreatedAt time.Time `json:"created_at"`
}

func (UserRole) TableName() string { return "user_roles" }

// AllRoleCodes — seluruh kode role yang dikenal sistem
func AllRoleCodes() []RoleCode {
	codes := make([]RoleCode, 0, len(SeedRoles))
	for _, entry := range SeedRoles {
		codes = append(codes, entry.Role.Code)
	}
	return codes
}

// IsValidRoleCode — apakah kode role dikenal sistem
func IsValidRoleCode(code RoleCode) bool {
	for _, c := range AllRoleCodes() {
		if c == code {
			return true
		}
	}
	return false
}

// RoleGroupOf — grup ("user" atau "admin") dari sebuah kode role.
// Dibaca dari SeedRoles sehingga menambah role baru cukup di satu tempat.
func RoleGroupOf(code RoleCode) string {
	for _, entry := range SeedRoles {
		if entry.Role.Code == code {
			return entry.Role.Group
		}
	}
	return ""
}

// IsAdminRole — apakah kode role termasuk grup admin
func IsAdminRole(code RoleCode) bool {
	return RoleGroupOf(code) == RoleGroupAdmin
}

// SeedRoles — data role dan permission default
var SeedRoles = []struct {
	Role        Role
	Permissions []PermissionCode
}{
	{
		Role: Role{Code: RoleSuperAdmin, Name: "Super Admin", Group: RoleGroupAdmin},
		// Super admin punya semua permission (dihandle di middleware)
		Permissions: []PermissionCode{
			PermOrdersView, PermOrdersCancelAny, PermOrdersForceComplete,
			PermFinanceViewReport, PermFinanceDisbursement, PermFinanceRefund,
			PermDriversView, PermDriversVerify, PermDriversSuspend, PermDriversBonus,
			PermMerchantsView, PermMerchantsApprove, PermMerchantsSuspend,
			PermUsersView, PermUsersManage, PermSettingsManage,
			PermPromoManage, PermReportsView, PermReportsSales,
		},
	},
	{
		Role:        Role{Code: RoleFinanceHead, Name: "Kepala Keuangan", Group: RoleGroupAdmin},
		Permissions: []PermissionCode{PermFinanceViewReport, PermFinanceDisbursement, PermFinanceRefund, PermReportsView, PermOrdersView},
	},
	{
		Role:        Role{Code: RoleFinanceStaff, Name: "Staf Keuangan", Group: RoleGroupAdmin},
		Permissions: []PermissionCode{PermFinanceViewReport, PermFinanceRefund, PermOrdersView},
	},
	{
		Role:        Role{Code: RoleSalesHead, Name: "Kepala Sales", Group: RoleGroupAdmin},
		Permissions: []PermissionCode{PermPromoManage, PermReportsSales, PermReportsView, PermOrdersView, PermMerchantsView},
	},
	{
		Role:        Role{Code: RoleCS, Name: "Customer Service", Group: RoleGroupAdmin},
		Permissions: []PermissionCode{PermOrdersView, PermOrdersCancelAny, PermFinanceRefund, PermUsersView, PermDriversView},
	},
	{
		Role:        Role{Code: RoleOpsManager, Name: "Manajer Operasional", Group: RoleGroupAdmin},
		Permissions: []PermissionCode{PermOrdersView, PermOrdersForceComplete, PermDriversView, PermReportsView, PermMerchantsView},
	},
	{
		Role:        Role{Code: RoleDriverManager, Name: "Manajer Driver", Group: RoleGroupAdmin},
		Permissions: []PermissionCode{PermDriversView, PermDriversVerify, PermDriversSuspend, PermDriversBonus},
	},
	{
		Role: Role{Code: RoleCustomer, Name: "Customer", Group: RoleGroupUser},
	},
	{
		Role: Role{Code: RoleDriverMotorcycle, Name: "Driver Motor", Group: RoleGroupUser},
	},
	{
		Role: Role{Code: RoleDriverCar, Name: "Driver Mobil", Group: RoleGroupUser},
	},
	{
		Role: Role{Code: RoleMerchant, Name: "Merchant", Group: RoleGroupUser},
	},
}

// AllPermissions — daftar semua permission untuk di-seed ke DB
var AllPermissions = []Permission{
	{Code: PermOrdersView, Name: "Lihat Order", Group: "orders"},
	{Code: PermOrdersCancelAny, Name: "Batalkan Order Manapun", Group: "orders"},
	{Code: PermOrdersForceComplete, Name: "Paksa Selesaikan Order", Group: "orders"},
	{Code: PermFinanceViewReport, Name: "Lihat Laporan Keuangan", Group: "finance"},
	{Code: PermFinanceDisbursement, Name: "Disbursement Driver", Group: "finance"},
	{Code: PermFinanceRefund, Name: "Proses Refund", Group: "finance"},
	{Code: PermDriversView, Name: "Lihat Data Driver", Group: "drivers"},
	{Code: PermDriversVerify, Name: "Verifikasi Driver", Group: "drivers"},
	{Code: PermDriversSuspend, Name: "Suspend Driver", Group: "drivers"},
	{Code: PermDriversBonus, Name: "Beri Bonus Driver", Group: "drivers"},
	{Code: PermMerchantsView, Name: "Lihat Data Merchant", Group: "merchants"},
	{Code: PermMerchantsApprove, Name: "Setujui Merchant", Group: "merchants"},
	{Code: PermMerchantsSuspend, Name: "Suspend Merchant", Group: "merchants"},
	{Code: PermUsersView, Name: "Lihat Pengguna", Group: "users"},
	{Code: PermUsersManage, Name: "Kelola Pengguna", Group: "users"},
	{Code: PermSettingsManage, Name: "Ubah Pengaturan Sistem", Group: "settings"},
	{Code: PermPromoManage, Name: "Kelola Promo", Group: "promo"},
	{Code: PermReportsView, Name: "Akses Dashboard Laporan", Group: "reports"},
	{Code: PermReportsSales, Name: "Laporan Sales", Group: "reports"},
}
