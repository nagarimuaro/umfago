package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	Name     string `json:"name" gorm:"not null"`
	Email    string `json:"email" gorm:"uniqueIndex;not null"`
	Phone    string `json:"phone" gorm:"uniqueIndex"`
	Password string `json:"-" gorm:"not null"`

	// RoleCode adalah role yang sedang AKTIF dipakai user saat ini. Nilainya harus
	// selalu salah satu dari Roles. Semua pengecekan otorisasi memakai role aktif ini
	// (satu peran pada satu waktu), bukan gabungan seluruh role yang dimiliki.
	RoleCode RoleCode `json:"active_role" gorm:"not null;default:'customer';index"`
	Role     Role     `json:"active_role_detail,omitempty" gorm:"foreignKey:RoleCode;references:Code"`

	// Roles adalah seluruh role yang boleh dipakai user. Satu akun bisa memegang
	// beberapa role sekaligus, misalnya customer sekaligus merchant.
	Roles []Role `json:"roles,omitempty" gorm:"many2many:user_roles;joinForeignKey:UserID;joinReferences:RoleID"`

	IsActive bool `json:"is_active"`
	// IsOnline menandai driver yang siap menerima order. Dinyalakan lewat
	// PUT /api/driver/status dan dipadamkan saat driver mematikannya sendiri,
	// saat koneksi WebSocket-nya putus, atau oleh sapuan berkala.
	IsOnline bool `json:"is_online" gorm:"default:false"` // khusus driver
	// OnlineSince adalah waktu driver terakhir menyalakan status online. Dipakai
	// sapuan berkala untuk mengenali status yang menggantung setelah server
	// restart, ketika koneksi hilang tanpa sempat melewati jalur disconnect.
	OnlineSince     *time.Time       `json:"online_since,omitempty"`
	IsVerified      bool             `json:"is_verified" gorm:"default:false"` // khusus driver & merchant
	Balance         float64          `json:"balance" gorm:"default:0"`         // Saldo e-wallet pengguna
	StripeID        string           `json:"stripe_id"`
	Vehicles        []Vehicle        `json:"vehicles,omitempty" gorm:"foreignKey:UserID"`
	DriverProfile   *DriverProfile   `json:"driver_profile,omitempty" gorm:"foreignKey:UserID"`
	MerchantProfile *MerchantProfile `json:"merchant_profile,omitempty" gorm:"foreignKey:UserID"`
}

// IsDriverRole — apakah sebuah kode role termasuk driver (jenis kendaraan apapun).
// Dipakai juga untuk memeriksa klaim role dari JWT, yang hanya berupa string.
func IsDriverRole(code RoleCode) bool {
	return code == RoleDriverMotorcycle || code == RoleDriverCar
}

// IsDriver — apakah role aktif user saat ini adalah driver
func (u *User) IsDriver() bool {
	return IsDriverRole(u.RoleCode)
}

// IsAdmin — apakah role aktif user saat ini termasuk grup admin
func (u *User) IsAdmin() bool {
	return u.Role.Group == RoleGroupAdmin
}

// HasRole — apakah user memiliki role tertentu (belum tentu sedang aktif).
// Membutuhkan Roles sudah di-preload.
func (u *User) HasRole(code RoleCode) bool {
	for _, r := range u.Roles {
		if r.Code == code {
			return true
		}
	}
	return false
}

// HasPermission — apakah ROLE AKTIF user memiliki permission tertentu.
// Membutuhkan relasi Role.Permissions sudah di-preload; bila belum, hasilnya
// false (fail-closed) kecuali untuk superadmin.
func (u *User) HasPermission(permCode PermissionCode) bool {
	// Super admin memiliki semua permission
	if u.RoleCode == RoleSuperAdmin {
		return true
	}
	for _, p := range u.Role.Permissions {
		if p.Code == permCode {
			return true
		}
	}
	return false
}

type Vehicle struct {
	gorm.Model
	UserID      uint   `json:"user_id"`
	Type        string `json:"type" gorm:"not null"` // motorcycle, car
	Brand       string `json:"brand"`
	ModelName   string `json:"model_name"`
	PlateNumber string `json:"plate_number"`
	IsActive    bool   `json:"is_active" gorm:"default:false"`
}

// RefreshToken — sesi login yang bisa diperpanjang.
//
// Yang disimpan hanya hash-nya; token mentah tidak pernah menyentuh database,
// sehingga bocornya tabel ini tidak langsung berarti pengambilalihan sesi.
// Setiap kali dipakai, token lama dicabut dan diganti token baru (rotasi).
// Bila token yang sudah dicabut dipakai lagi, itu tanda token bocor: seluruh
// sesi user tersebut ikut dicabut.
type RefreshToken struct {
	ID        uint      `gorm:"primarykey"`
	UserID    uint      `gorm:"not null;index"`
	TokenHash string    `gorm:"uniqueIndex;not null"`
	ExpiresAt time.Time `gorm:"not null"`
	RevokedAt *time.Time
	CreatedAt time.Time
}

// IsUsable — token masih boleh dipakai untuk memperpanjang sesi
func (t *RefreshToken) IsUsable(now time.Time) bool {
	return t.RevokedAt == nil && now.Before(t.ExpiresAt)
}
