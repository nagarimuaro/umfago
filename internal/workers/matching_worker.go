package workers

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"openjek-backend/internal/broker"
	"openjek-backend/internal/models"
	"openjek-backend/internal/pricing"
	"openjek-backend/internal/repository"
	ws "openjek-backend/internal/websocket"

	"gorm.io/gorm"
)

// OrderCreatedPayload — data yang dikirim saat order dibuat
type OrderCreatedPayload struct {
	OrderUUID      string  `json:"order_uuid"`
	RiderID        uint    `json:"rider_id"`
	PickupLat      float64 `json:"pickup_lat"`
	PickupLon      float64 `json:"pickup_lon"`
	DropoffAddress string  `json:"dropoff_address"`
	FareAmount     float64 `json:"fare_amount"`
	VehicleType    string  `json:"vehicle_type"`
}

// MatchingWorker — mendengarkan event "order.created" dan mencari driver terdekat
type MatchingWorker struct {
	db      *gorm.DB
	rmq     *broker.RabbitMQ
	locRepo *repository.LocationRepository
	pricing *pricing.Calculator
	hub     *ws.Hub
	notif   *repository.NotificationRepository
}

func NewMatchingWorker(
	db *gorm.DB,
	rmq *broker.RabbitMQ,
	locRepo *repository.LocationRepository,
	calc *pricing.Calculator,
	hub *ws.Hub,
	notif *repository.NotificationRepository,
) *MatchingWorker {
	return &MatchingWorker{
		db:      db,
		rmq:     rmq,
		locRepo: locRepo,
		pricing: calc,
		hub:     hub,
		notif:   notif,
	}
}

// Start — mulai mendengarkan event dari RabbitMQ
func (w *MatchingWorker) Start() error {
	if w.rmq == nil {
		log.Println("[MatchingWorker] RabbitMQ unavailable, matching worker not started")
		return nil
	}
	return w.rmq.Subscribe("matching_queue", string(broker.EventOrderCreated), w.handleOrderCreated)
}

func (w *MatchingWorker) handleOrderCreated(event broker.Event) {
	var payload OrderCreatedPayload
	if err := json.Unmarshal(event.Payload, &payload); err != nil {
		log.Printf("[MatchingWorker] Invalid payload: %v", err)
		return
	}
	w.Dispatch(context.Background(), payload)
}

// Dispatch — cari kandidat driver untuk sebuah order lalu kirimi mereka tawaran.
//
// Dipisahkan dari handler event agar bisa dipanggil ulang saat sebuah tawaran
// ditolak atau kedaluwarsa. Driver yang sudah pernah ditawari order ini disaring
// di sini, sehingga pemanggilan berulang selalu menyasar kandidat yang baru dan
// order tidak kembali ke driver yang sudah menolaknya.
func (w *MatchingWorker) Dispatch(ctx context.Context, payload OrderCreatedPayload) {
	log.Printf("[MatchingWorker] Processing order %s for rider %d", payload.OrderUUID, payload.RiderID)

	// Radius dan jumlah kandidat dibaca dari setting dinamis, sehingga tim
	// operasional bisa memperlebar pencarian saat driver sedang sepi.
	radius := w.pricing.SearchRadiusKm(ctx)
	maxCandidates := w.pricing.MaxDriverCandidates(ctx)

	// 1. Cari driver terdekat dari titik pickup menggunakan Redis GEOSEARCH.
	// Diambil lebih banyak dari yang dibutuhkan karena sebagian akan tersaring
	// oleh pengecekan jenis kendaraan dan status akun di bawah.
	nearby, err := w.locRepo.FindNearestDrivers(ctx, payload.PickupLat, payload.PickupLon, radius, maxCandidates*3)
	if err != nil {
		log.Printf("[MatchingWorker] GeoSearch failed: %v", err)
		return
	}

	candidates := w.filterEligible(w.excludeOffered(payload.OrderUUID, nearby), payload.VehicleType, maxCandidates)

	if len(candidates) == 0 {
		log.Printf("[MatchingWorker] No eligible drivers near order %s", payload.OrderUUID)
		w.hub.SendToUser(payload.RiderID, ws.Message{
			Type:    "no_drivers_available",
			Payload: json.RawMessage(`{"order_uuid":"` + payload.OrderUUID + `"}`),
		})
		if w.notif != nil {
			w.notif.Push(payload.RiderID, models.NotifNoDriverAvailable,
				"Belum ada driver",
				"Belum ada driver di sekitar Anda. Coba lagi beberapa saat.",
				map[string]any{"order_uuid": payload.OrderUUID})
		}
		return
	}

	// 2. Catat tawaran sebelum dikirim. Driver hanya boleh menolak sesuatu yang
	// tercatat pernah ditawarkan kepadanya, dan tawaran yang tidak tercatat
	// tidak akan pernah kedaluwarsa.
	expiresAt := time.Now().Add(w.pricing.OfferTimeout(ctx))
	candidates = w.recordOffers(payload.OrderUUID, candidates, expiresAt)
	if len(candidates) == 0 {
		log.Printf("[MatchingWorker] No offers recorded for order %s", payload.OrderUUID)
		return
	}

	log.Printf("[MatchingWorker] Offered order %s to %d driver(s): %v",
		payload.OrderUUID, len(candidates), candidates)

	// 3. Kirim notifikasi "incoming_order" ke semua kandidat driver via WebSocket
	offerPayload, err := json.Marshal(map[string]interface{}{
		"order_uuid":      payload.OrderUUID,
		"pickup_lat":      payload.PickupLat,
		"pickup_lon":      payload.PickupLon,
		"dropoff_address": payload.DropoffAddress,
		"fare_amount":     payload.FareAmount,
		"vehicle_type":    payload.VehicleType,
		"expires_at":      expiresAt,
	})
	if err != nil {
		log.Printf("[MatchingWorker] Failed to build offer payload: %v", err)
		return
	}

	for _, driverID := range candidates {
		w.hub.SendToUser(driverID, ws.Message{
			Type:    "incoming_order",
			Payload: json.RawMessage(offerPayload),
		})
	}
}

// excludeOffered — buang driver yang sudah pernah ditawari order ini, apa pun
// jawabannya. Driver yang menolak tidak ditawari ulang, dan driver yang
// mendiamkan tawaran sampai kedaluwarsa dianggap sedang tidak memperhatikan.
func (w *MatchingWorker) excludeOffered(orderUUID string, driverIDs []uint) []uint {
	if len(driverIDs) == 0 || w.db == nil {
		return driverIDs
	}

	var offered []uint
	if err := w.db.Model(&models.OrderOffer{}).
		Where("order_uuid = ? AND driver_id IN ?", orderUUID, driverIDs).
		Pluck("driver_id", &offered).Error; err != nil {
		// Gagal membaca riwayat tawaran lebih baik daripada tidak menawarkan
		// order sama sekali; unique index pada (order_uuid, driver_id) tetap
		// mencegah tawaran ganda tersimpan.
		log.Printf("[MatchingWorker] Failed to read existing offers: %v", err)
		return driverIDs
	}
	if len(offered) == 0 {
		return driverIDs
	}

	seen := make(map[uint]struct{}, len(offered))
	for _, id := range offered {
		seen[id] = struct{}{}
	}

	result := make([]uint, 0, len(driverIDs))
	for _, id := range driverIDs {
		if _, ok := seen[id]; ok {
			continue
		}
		result = append(result, id)
	}
	return result
}

// recordOffers — simpan satu baris tawaran per kandidat dan kembalikan driver
// yang tawarannya benar-benar tercatat.
//
// Baris ditulis satu per satu, bukan sekaligus, agar satu kandidat yang gagal
// (misalnya sudah ditawari oleh putaran yang berjalan bersamaan dan ditolak oleh
// unique index) tidak membatalkan tawaran untuk kandidat lain.
func (w *MatchingWorker) recordOffers(orderUUID string, driverIDs []uint, expiresAt time.Time) []uint {
	if w.db == nil {
		return driverIDs
	}

	recorded := make([]uint, 0, len(driverIDs))
	for _, id := range driverIDs {
		offer := models.OrderOffer{
			OrderUUID: orderUUID,
			DriverID:  id,
			Status:    models.OfferOffered,
			ExpiresAt: expiresAt,
		}
		if err := w.db.Create(&offer).Error; err != nil {
			log.Printf("[MatchingWorker] Failed to record offer for driver %d: %v", id, err)
			continue
		}
		recorded = append(recorded, id)
	}
	return recorded
}

// filterEligible — saring kandidat driver berdasarkan keadaan di database.
//
// Redis hanya tahu posisi terakhir; ia tidak tahu apakah driver masih aktif,
// sudah terverifikasi, memakai role yang cocok, atau sedang mengantar penumpang
// lain. Tanpa penyaringan ini, tawaran order akan sampai ke driver yang tidak
// mungkin menerimanya.
func (w *MatchingWorker) filterEligible(driverIDs []uint, vehicleType string, limit int) []uint {
	if len(driverIDs) == 0 {
		return nil
	}
	if w.db == nil {
		return driverIDs
	}

	wantedRole := models.RoleDriverMotorcycle
	if vehicleType == models.VehicleCar {
		wantedRole = models.RoleDriverCar
	}

	// is_online ikut disaring: indeks geospasial hanya menyimpan posisi terakhir
	// dan tidak tahu apakah driver masih membuka aplikasinya. Tanpa predikat ini
	// kolom is_online tidak berpengaruh apa pun terhadap pencarian.
	var eligible []uint
	if err := w.db.Model(&models.User{}).
		Where("id IN ? AND role_code = ? AND is_active = ? AND is_verified = ? AND is_online = ?",
			driverIDs, wantedRole, true, true, true).
		Pluck("id", &eligible).Error; err != nil {
		log.Printf("[MatchingWorker] Failed to filter drivers: %v", err)
		return nil
	}

	if len(eligible) == 0 {
		return nil
	}

	// Buang driver yang masih memegang order berjalan
	var busy []uint
	w.db.Model(&models.Order{}).
		Where("driver_id IN ? AND status IN ?", eligible,
			[]models.OrderStatus{models.StatusAccepted, models.StatusArrived, models.StatusInProgress}).
		Distinct().Pluck("driver_id", &busy)

	busySet := make(map[uint]struct{}, len(busy))
	for _, id := range busy {
		busySet[id] = struct{}{}
	}

	// Urutan hasil GEOSEARCH (terdekat lebih dulu) dipertahankan, karena
	// query database di atas mengembalikan baris tanpa urutan yang dijamin.
	result := make([]uint, 0, limit)
	eligibleSet := make(map[uint]struct{}, len(eligible))
	for _, id := range eligible {
		eligibleSet[id] = struct{}{}
	}
	for _, id := range driverIDs {
		if _, ok := eligibleSet[id]; !ok {
			continue
		}
		if _, isBusy := busySet[id]; isBusy {
			continue
		}
		result = append(result, id)
		if len(result) >= limit {
			break
		}
	}
	return result
}
