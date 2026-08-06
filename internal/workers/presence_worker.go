package workers

import (
	"context"
	"log"
	"sync"
	"time"

	"openjek-backend/internal/broker"
	"openjek-backend/internal/models"
	ws "openjek-backend/internal/websocket"

	"gorm.io/gorm"
)

const (
	// presenceInterval — jarak antar sapuan. Cukup sering agar driver yang hilang
	// tidak lama menyandera order, cukup jarang agar tidak membebani database.
	presenceInterval = time.Minute

	// staleGrace — tenggang sebelum sebuah status online tanpa koneksi WebSocket
	// dianggap menggantung. Tanpa tenggang ini, driver yang baru menekan tombol
	// online tetapi belum sempat membuka koneksi akan langsung dipadamkan.
	staleGrace = 2 * time.Minute
)

// PresenceWorker — sapuan berkala untuk dua keadaan yang bisa menggantung:
// status online driver dan tawaran order yang didiamkan.
//
// Keduanya dikerjakan satu goroutine karena berjalan pada irama yang sama dan
// saling melengkapi: tawaran yang kedaluwarsa biasanya berasal dari driver yang
// koneksinya sudah hilang.
//
// Sapuan status diperlukan di samping hook putus koneksi pada ws.Hub, karena
// setelah server restart seluruh koneksi lenyap tanpa pernah melewati jalur
// unregister — hook tidak pernah terpanggil, sementara baris is_online = true
// tetap tertinggal di database.
type PresenceWorker struct {
	db  *gorm.DB
	hub *ws.Hub
	rmq *broker.RabbitMQ

	interval time.Duration
	stop     chan struct{}
	stopOnce sync.Once
}

func NewPresenceWorker(db *gorm.DB, hub *ws.Hub, rmq *broker.RabbitMQ) *PresenceWorker {
	return &PresenceWorker{
		db:       db,
		hub:      hub,
		rmq:      rmq,
		interval: presenceInterval,
		stop:     make(chan struct{}),
	}
}

// Start — jalankan sapuan berkala di goroutine terpisah
func (w *PresenceWorker) Start() {
	if w.db == nil {
		log.Println("[PresenceWorker] No database, presence worker not started")
		return
	}
	go w.loop()
}

// Stop — hentikan sapuan. Aman dipanggil lebih dari satu kali.
func (w *PresenceWorker) Stop() {
	w.stopOnce.Do(func() { close(w.stop) })
}

func (w *PresenceWorker) loop() {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	log.Printf("[PresenceWorker] Started, sweeping every %s", w.interval)

	for {
		select {
		case <-w.stop:
			log.Println("[PresenceWorker] Stopped")
			return
		case <-ticker.C:
			w.sweep()
		}
	}
}

func (w *PresenceWorker) sweep() {
	now := time.Now()

	var online []uint
	if w.hub != nil {
		online = w.hub.OnlineDriverIDs()
	}

	if n, err := sweepStaleDrivers(w.db, online, now); err != nil {
		log.Printf("[PresenceWorker] Failed to sweep stale drivers: %v", err)
	} else if n > 0 {
		log.Printf("[PresenceWorker] Marked %d driver(s) offline", n)
	}

	stalled, err := sweepExpiredOffers(w.db, now)
	if err != nil {
		log.Printf("[PresenceWorker] Failed to sweep expired offers: %v", err)
		return
	}
	for _, uuid := range stalled {
		w.republish(uuid)
	}
}

// republish — kirim ulang event order.created agar MatchingWorker mencari
// kandidat berikutnya. Driver yang sudah pernah ditawari disaring di sana,
// sehingga pengulangan tidak mengganggu orang yang sama dua kali.
func (w *PresenceWorker) republish(orderUUID string) {
	if w.rmq == nil {
		// Tanpa broker, order tetap berstatus searching dan akan dicarikan
		// driver lagi pada percobaan berikutnya; tidak ada data yang hilang.
		log.Printf("[PresenceWorker] Order %s needs a new driver but broker is unavailable", orderUUID)
		return
	}

	var order models.Order
	if err := w.db.Where("uuid = ? AND status = ?", orderUUID, models.StatusSearching).
		First(&order).Error; err != nil {
		return
	}

	payload := OrderCreatedPayload{
		OrderUUID:      order.UUID,
		RiderID:        order.RiderID,
		PickupLat:      order.PickupLat,
		PickupLon:      order.PickupLon,
		DropoffAddress: order.DropoffAddress,
		FareAmount:     order.FareAmount,
		VehicleType:    order.VehicleType,
	}
	if err := w.rmq.Publish(context.Background(), broker.EventOrderCreated, payload); err != nil {
		log.Printf("[PresenceWorker] Failed to republish order %s: %v", orderUUID, err)
	}
}

// sweepStaleDrivers — padamkan driver yang berstatus online tetapi tidak punya
// koneksi WebSocket yang hidup.
//
// Ditulis sebagai fungsi lepas, bukan method, supaya bisa diuji langsung dengan
// waktu dan daftar koneksi buatan tanpa menunggu ticker.
//
// online adalah daftar user_id yang sedang terhubung. Driver di dalam daftar itu
// tidak pernah disentuh. Sisanya hanya dipadamkan bila sudah melewati masa
// tenggang, dihitung dari online_since; baris lama yang online_since-nya kosong
// dianggap sudah lewat tenggang karena tidak ada bukti kapan ia dinyalakan.
func sweepStaleDrivers(db *gorm.DB, online []uint, now time.Time) (int64, error) {
	cutoff := now.Add(-staleGrace)

	query := db.Model(&models.User{}).
		Where("is_online = ?", true).
		Where("online_since IS NULL OR online_since < ?", cutoff)

	if len(online) > 0 {
		query = query.Where("id NOT IN ?", online)
	}

	result := query.Updates(map[string]interface{}{
		"is_online":    false,
		"online_since": nil,
	})
	return result.RowsAffected, result.Error
}

// sweepExpiredOffers — tandai tawaran yang didiamkan sampai lewat tenggat, lalu
// laporkan order yang karenanya kehabisan kandidat.
//
// Order yang dikembalikan adalah yang masih berstatus searching dan tidak lagi
// punya satu pun tawaran yang menunggu jawaban — order itulah yang perlu
// dicarikan driver baru. Order yang masih punya tawaran hidup dibiarkan, agar
// driver yang sedang menimbang tidak didahului putaran pencarian berikutnya.
func sweepExpiredOffers(db *gorm.DB, now time.Time) ([]string, error) {
	// Kumpulkan lebih dulu, karena setelah statusnya berubah tidak ada lagi cara
	// mengenali baris mana yang barusan kedaluwarsa.
	var affected []string
	if err := db.Model(&models.OrderOffer{}).
		Where("status = ? AND expires_at < ?", models.OfferOffered, now).
		Distinct().Pluck("order_uuid", &affected).Error; err != nil {
		return nil, err
	}
	if len(affected) == 0 {
		return nil, nil
	}

	if err := db.Model(&models.OrderOffer{}).
		Where("status = ? AND expires_at < ?", models.OfferOffered, now).
		Update("status", models.OfferExpired).Error; err != nil {
		return nil, err
	}

	var stalled []string
	if err := db.Model(&models.Order{}).
		Where("uuid IN ? AND status = ?", affected, models.StatusSearching).
		Where("uuid NOT IN (?)",
			db.Model(&models.OrderOffer{}).
				Select("order_uuid").
				Where("status = ?", models.OfferOffered)).
		Pluck("uuid", &stalled).Error; err != nil {
		return nil, err
	}

	return stalled, nil
}
