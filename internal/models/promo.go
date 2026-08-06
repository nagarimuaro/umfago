package models

import (
	"strings"
	"time"

	"gorm.io/gorm"
)

// DiscountType — cara potongan dihitung
type DiscountType string

const (
	DiscountPercent DiscountType = "percent" // potongan dalam persen dari tarif
	DiscountFixed   DiscountType = "fixed"   // potongan dalam rupiah
)

// Promo — kode voucher yang bisa dipakai customer saat memesan.
//
// Kuota dan pemakaian per user dibatasi agar satu kode tidak bisa dikuras oleh
// segelintir akun.
type Promo struct {
	gorm.Model
	Code        string `json:"code" gorm:"uniqueIndex;not null"`
	Name        string `json:"name"`
	Description string `json:"description"`

	DiscountType  DiscountType `json:"discount_type" gorm:"type:varchar(20);not null;default:'fixed'"`
	DiscountValue float64      `json:"discount_value" gorm:"not null"`
	// MaxDiscount membatasi potongan persen agar tidak menghabiskan tarif.
	// Nilai 0 berarti tanpa batas.
	MaxDiscount float64 `json:"max_discount"`
	MinFare     float64 `json:"min_fare"`

	// Quota 0 berarti tidak dibatasi jumlah pemakaian.
	Quota     int `json:"quota"`
	UsedCount int `json:"used_count" gorm:"default:0"`
	// PerUserLimit 0 berarti tidak dibatasi per user.
	PerUserLimit int `json:"per_user_limit" gorm:"default:1"`

	StartsAt time.Time `json:"starts_at"`
	EndsAt   time.Time `json:"ends_at"`
	// Tanpa default di sisi database: GORM tidak mengirim kolom bernilai zero
	// saat Create, sehingga `default:true` membuat promo yang sengaja dibuat
	// nonaktif justru tersimpan aktif. Nilai bawaan ditentukan di handler yang
	// membuat promo, satu-satunya tempat yang tahu apakah admin memang
	// menghilangkan field ini atau mengisinya dengan false.
	IsActive bool `json:"is_active" gorm:"index"`
}

// PromoUsage — catatan pemakaian promo, satu baris per order.
// Unique index gabungan mencegah satu order menghitung promo lebih dari sekali.
type PromoUsage struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	PromoID   uint      `gorm:"not null;index;uniqueIndex:idx_promo_order" json:"promo_id"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	OrderUUID string    `gorm:"type:varchar(100);not null;uniqueIndex:idx_promo_order" json:"order_uuid"`
	Discount  float64   `json:"discount"`
	CreatedAt time.Time `json:"created_at"`
}

// NormalizeCode — kode promo diperlakukan tanpa membedakan huruf besar-kecil
func NormalizeCode(code string) string {
	return strings.ToUpper(strings.TrimSpace(code))
}

// IsRedeemableAt — apakah promo berlaku pada waktu tertentu dan kuotanya masih ada
func (p *Promo) IsRedeemableAt(now time.Time) bool {
	if !p.IsActive {
		return false
	}
	if !p.StartsAt.IsZero() && now.Before(p.StartsAt) {
		return false
	}
	if !p.EndsAt.IsZero() && now.After(p.EndsAt) {
		return false
	}
	if p.Quota > 0 && p.UsedCount >= p.Quota {
		return false
	}
	return true
}

// DiscountFor — besar potongan untuk tarif tertentu.
// Hasilnya tidak pernah melebihi tarif itu sendiri.
func (p *Promo) DiscountFor(fare float64) float64 {
	if fare < p.MinFare {
		return 0
	}

	var discount float64
	switch p.DiscountType {
	case DiscountPercent:
		discount = fare * p.DiscountValue / 100
		if p.MaxDiscount > 0 && discount > p.MaxDiscount {
			discount = p.MaxDiscount
		}
	default:
		discount = p.DiscountValue
	}

	if discount > fare {
		discount = fare
	}
	if discount < 0 {
		return 0
	}
	return discount
}
