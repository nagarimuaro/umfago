package repository

import (
	"encoding/json"
	"log"

	"openjek-backend/internal/models"
	ws "openjek-backend/internal/websocket"

	"gorm.io/gorm"
)

// NotificationRepository — satu-satunya pintu untuk menerbitkan notifikasi.
//
// Urutannya selalu simpan dulu, kirim kemudian. Pengiriman WebSocket boleh gagal
// tanpa akibat: barisnya sudah tersimpan dan akan terlihat begitu aplikasi
// memanggil GET /api/notifications. Kebalikannya tidak berlaku — pesan yang
// hanya dikirim lewat WebSocket lenyap tanpa jejak bila aplikasi sedang tertutup.
type NotificationRepository struct {
	db  *gorm.DB
	hub *ws.Hub
}

func NewNotificationRepository(db *gorm.DB, hub *ws.Hub) *NotificationRepository {
	return &NotificationRepository{db: db, hub: hub}
}

// Push — simpan satu notifikasi lalu kirimkan lewat WebSocket bila pengguna
// sedang terhubung.
//
// Kegagalan sengaja hanya dicatat, tidak dikembalikan: notifikasi adalah efek
// samping dari peristiwa yang sudah terjadi. Order yang sudah selesai tidak
// boleh gagal karena pemberitahuannya gagal disimpan.
func (r *NotificationRepository) Push(userID uint, kind, title, body string, data map[string]any) {
	if r == nil || r.db == nil {
		return
	}

	encoded := ""
	if len(data) > 0 {
		if raw, err := json.Marshal(data); err == nil {
			encoded = string(raw)
		}
	}

	notif := models.Notification{
		UserID: userID,
		Type:   kind,
		Title:  title,
		Body:   body,
		Data:   encoded,
	}

	if err := r.db.Create(&notif).Error; err != nil {
		log.Printf("[Notification] Failed to store %s for user %d: %v", kind, userID, err)
		return
	}

	if r.hub == nil {
		return
	}

	payload, err := json.Marshal(notif)
	if err != nil {
		return
	}
	r.hub.SendToUser(userID, ws.Message{Type: "notification", Payload: payload})
}
