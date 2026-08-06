package models

import "time"

// Jenis peristiwa produk yang dihitung dalam peringkat.
const (
	ProductEventView  = "view"
	ProductEventOrder = "order"
)

// ProductEvent — satu penayangan atau satu pemesanan sebuah produk.
//
// Tabel ini yang membuat jendela "30 hari terakhir" benar-benar bergulir. Tanpa
// tabel peristiwa, satu-satunya cara menua-kan penghitung adalah menguranginya
// secara berkala — dan begitu satu sapuan terlewat, angkanya salah selamanya
// tanpa cara memperbaikinya. Dengan peristiwa mentah, jendelanya dihitung ulang
// setiap kali daftar produk diminta.
//
// Konsekuensinya tabel ini tumbuh satu baris per penayangan detail produk.
// PresenceWorker menyusutkannya secara berkala, membuang baris yang lebih tua
// dari jendela peringkat.
type ProductEvent struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ProductID uint      `gorm:"not null;index:idx_pevent_product_time" json:"product_id"`
	Kind      string    `gorm:"type:varchar(20);not null" json:"kind"`
	CreatedAt time.Time `gorm:"index:idx_pevent_product_time" json:"created_at"`
}
