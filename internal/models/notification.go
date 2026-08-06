package models

import "time"

// Jenis notifikasi. Nilainya ikut terkirim ke klien pada field `type`, sehingga
// aplikasi bisa memilih ikon dan layar tujuan tanpa menebak dari judulnya.
const (
	NotifOrderAccepted       = "order_accepted"
	NotifDriverArrived       = "driver_arrived"
	NotifTripStarted         = "trip_started"
	NotifTripCompleted       = "trip_completed"
	NotifOrderCancelled      = "order_cancelled"
	NotifNoDriverAvailable   = "no_driver_available"
	NotifWalletTopUp         = "wallet_topup"
	NotifWithdrawalDisbursed = "withdrawal_disbursed"
	NotifWithdrawalRejected  = "withdrawal_rejected"
	NotifKYCApproved         = "kyc_approved"
	NotifKYCRejected         = "kyc_rejected"
	NotifDriverBonus         = "driver_bonus"
)

// Notification — satu pemberitahuan milik satu pengguna.
//
// Notifikasi disimpan lebih dulu, baru dikirim lewat WebSocket. Pengiriman WS
// bersifat fire-and-forget: bila aplikasi sedang tertutup, pesannya hilang tanpa
// jejak. Barisnya di sini yang membuat pengguna tetap bisa menemukan apa yang
// terlewat saat aplikasi dibuka kembali.
type Notification struct {
	ID     uint   `gorm:"primaryKey" json:"id"`
	UserID uint   `gorm:"not null;index:idx_notif_user_read" json:"user_id"`
	Type   string `gorm:"type:varchar(50);not null" json:"type"`
	Title  string `gorm:"type:varchar(200);not null" json:"title"`
	Body   string `gorm:"type:text" json:"body"`

	// Data berisi JSON pendek untuk menentukan layar tujuan saat notifikasi
	// ditekan, misalnya {"order_uuid":"..."}. Disimpan sebagai teks, bukan jsonb,
	// karena backend tidak pernah melakukan query ke dalamnya — isinya hanya
	// diteruskan apa adanya ke klien.
	Data string `gorm:"type:text" json:"data"`

	// ReadAt kosong selama notifikasi belum dibaca. Index gabungannya dengan
	// UserID melayani dua query yang benar-benar dipakai: daftar milik pengguna
	// dan penghitung yang belum dibaca.
	ReadAt *time.Time `gorm:"index:idx_notif_user_read" json:"read_at"`

	CreatedAt time.Time `json:"created_at"`
}
