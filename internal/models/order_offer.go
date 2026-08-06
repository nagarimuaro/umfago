package models

import "time"

// OfferStatus — keadaan sebuah tawaran order kepada satu driver
type OfferStatus string

const (
	// OfferOffered — tawaran sudah dikirim dan masih menunggu jawaban
	OfferOffered OfferStatus = "offered"
	// OfferAccepted — driver mengambil order ini
	OfferAccepted OfferStatus = "accepted"
	// OfferRejected — driver menolak secara sadar
	OfferRejected OfferStatus = "rejected"
	// OfferExpired — driver mendiamkan tawaran sampai masa berlakunya habis
	OfferExpired OfferStatus = "expired"
)

// OrderOffer — catatan bahwa sebuah order pernah ditawarkan kepada seorang driver.
//
// Tanpa catatan ini, tawaran yang dikirim lewat WebSocket langsung terlupakan:
// driver tidak punya cara menolak, tawaran yang didiamkan tidak pernah
// kedaluwarsa, dan sistem tidak tahu kepada siapa order harus ditawarkan
// berikutnya.
//
// Disimpan di database, bukan di Redis, karena keadaan tawaran menentukan siapa
// yang boleh menerima order — dan karena riwayat penolakan tetap berguna sebagai
// jejak audit jauh setelah tawarannya sendiri kedaluwarsa.
type OrderOffer struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// Pasangan (OrderUUID, DriverID) unik: satu driver hanya ditawari satu kali
	// per order. Index gabungan inilah yang mencegah driver yang sudah menolak
	// ditawari ulang oleh putaran pencarian berikutnya.
	OrderUUID string      `json:"order_uuid" gorm:"type:varchar(100);not null;index;uniqueIndex:idx_offer_order_driver"`
	DriverID  uint        `json:"driver_id" gorm:"not null;index;uniqueIndex:idx_offer_order_driver"`
	Status    OfferStatus `json:"status" gorm:"type:varchar(20);not null;default:'offered';index"`
	// Reason hanya terisi pada penolakan sadar, misalnya "terlalu_jauh".
	Reason string `json:"reason" gorm:"type:varchar(100)"`
	// ExpiresAt dihitung dari setting matching.offer_timeout_seconds saat tawaran
	// dibuat, sehingga perubahan setting tidak mengubah tenggat tawaran yang
	// sudah beredar.
	ExpiresAt time.Time `json:"expires_at" gorm:"not null;index"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// IsPending — tawaran masih menunggu jawaban dan belum lewat tenggat
func (o *OrderOffer) IsPending(now time.Time) bool {
	return o.Status == OfferOffered && now.Before(o.ExpiresAt)
}
