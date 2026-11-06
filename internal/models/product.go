package models

import (
	"time"

	"gorm.io/gorm"
)

// Product — satu barang yang dijual merchant.
//
// MerchantID menunjuk ke merchant_profiles.id, bukan ke users.id. Katalog milik
// usaha, bukan milik akun: bila kepemilikan akun berpindah, produknya ikut
// profil usahanya.
type Product struct {
	ID          uint    `gorm:"primaryKey" json:"id"`
	MerchantID  uint    `gorm:"not null;index" json:"merchant_id"`
	Name        string  `gorm:"type:varchar(150);not null" json:"name"`
	Description string  `gorm:"type:text" json:"description"`
	Price       float64 `gorm:"not null" json:"price"`
	ImageURL    string  `gorm:"type:varchar(500)" json:"image_url"`
	Category    string  `gorm:"type:varchar(50);index" json:"category"`
	// Tanpa tag default: GORM melewati nilai nol (false) saat INSERT bila kolom
	// punya default, sehingga produk yang sengaja dikosongkan tersimpan true.
	// Default "tersedia" ditetapkan di handler pembuatan produk.
	IsAvailable bool    `gorm:"index" json:"is_available"`

	// Penghitung kumulatif, dipakai halaman merchant ("dilihat 340 kali").
	// Peringkat TIDAK memakai kolom ini melainkan menghitung ulang jendela 30
	// hari dari ProductEvent — angka kumulatif tidak pernah turun, jadi produk
	// yang laris setahun lalu akan memimpin selamanya bila dipakai menyortir.
	//
	// Keduanya dinaikkan dengan ekspresi SQL (`view_count = view_count + 1`),
	// bukan baca-lalu-tulis, sehingga dua permintaan bersamaan tidak saling
	// menimpa — pola yang sama dipakai WalletRepository untuk saldo.
	ViewCount  int64 `gorm:"default:0" json:"view_count"`
	OrderCount int64 `gorm:"default:0" json:"order_count"`

	// Rating disimpan sebagai jumlah dan cacah supaya rata-ratanya bisa
	// diperbarui tanpa membaca ulang seluruh penilaian.
	RatingSum   float64 `gorm:"default:0" json:"-"`
	RatingCount int64   `gorm:"default:0" json:"-"`
	AvgRating   float64 `gorm:"default:0" json:"avg_rating"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Merchant *MerchantProfile `gorm:"foreignKey:MerchantID" json:"merchant,omitempty"`
}
