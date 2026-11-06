package workers

import (
	"context"
	"testing"
	"time"

	"openjek-backend/internal/models"
	"openjek-backend/internal/pricing"
	"openjek-backend/internal/repository"
	"openjek-backend/internal/testutil"
	ws "openjek-backend/internal/websocket"
)

// mockLocator — implementasi DriverLocator sederhana untuk test
type mockLocator struct {
	driverIDs []uint
	err       error
}

func (m *mockLocator) FindNearestDrivers(ctx context.Context, lat, lon float64, radiusKm float64, count int) ([]uint, error) {
	if m.err != nil {
		return nil, m.err
	}
	if count > 0 && len(m.driverIDs) > count {
		return m.driverIDs[:count], nil
	}
	return m.driverIDs, nil
}

// TestMatchingWorker_Dispatch_Success — Driver yang memenuhi syarat terdekat
// menerima tawaran order (OrderOffer tercatat dengan status offered).
func TestMatchingWorker_Dispatch_Success(t *testing.T) {
	db := testutil.NewTestDB(t)
	settingsRepo := repository.NewSettingsRepository(db, nil)
	priceCalc := pricing.NewCalculator(settingsRepo)

	hub := ws.NewHub()
	notifRepo := repository.NewNotificationRepository(db, hub)

	rider := matchRider(t, db, "rider-dispatch-success@test.com")
	driver := matchDriver(t, db, "driver-dispatch-success@test.com", nil)
	order := matchOrder(t, db, "ord-dispatch-1", rider.ID, nil)

	loc := &mockLocator{driverIDs: []uint{driver.ID}}
	worker := NewMatchingWorker(db, nil, loc, priceCalc, hub, notifRepo)

	worker.Dispatch(context.Background(), OrderCreatedPayload{
		OrderUUID:      order.UUID,
		RiderID:        order.RiderID,
		PickupLat:      -0.9471,
		PickupLon:      100.3543,
		DropoffAddress: "Jl. Sudirman No. 10",
		FareAmount:     15000,
		VehicleType:    models.VehicleMotorcycle,
	})

	var offers []models.OrderOffer
	if err := db.Where("order_uuid = ?", order.UUID).Find(&offers).Error; err != nil {
		t.Fatalf("failed to query offers: %v", err)
	}

	if len(offers) != 1 {
		t.Fatalf("expected 1 offer recorded, got %d", len(offers))
	}
	if offers[0].DriverID != driver.ID {
		t.Errorf("expected offer to driver %d, got %d", driver.ID, offers[0].DriverID)
	}
	if offers[0].Status != models.OfferOffered {
		t.Errorf("expected offer status %s, got %s", models.OfferOffered, offers[0].Status)
	}
	if !offers[0].ExpiresAt.After(time.Now()) {
		t.Errorf("expected expires_at to be in the future, got %v", offers[0].ExpiresAt)
	}
}

// TestMatchingWorker_Dispatch_NoEligibleDrivers — Bila tidak ada driver di sekitar,
// notifikasi "Belum ada driver" dikirimkan ke penumpang.
func TestMatchingWorker_Dispatch_NoEligibleDrivers(t *testing.T) {
	db := testutil.NewTestDB(t)
	settingsRepo := repository.NewSettingsRepository(db, nil)
	priceCalc := pricing.NewCalculator(settingsRepo)
	hub := ws.NewHub()
	notifRepo := repository.NewNotificationRepository(db, hub)

	rider := matchRider(t, db, "rider-no-driver@test.com")
	order := matchOrder(t, db, "ord-no-driver-1", rider.ID, nil)

	// mockLocator tidak menemukan driver sama sekali
	loc := &mockLocator{driverIDs: []uint{}}
	worker := NewMatchingWorker(db, nil, loc, priceCalc, hub, notifRepo)

	worker.Dispatch(context.Background(), OrderCreatedPayload{
		OrderUUID:      order.UUID,
		RiderID:        order.RiderID,
		PickupLat:      -0.9471,
		PickupLon:      100.3543,
		DropoffAddress: "Jl. Sudirman No. 10",
		FareAmount:     15000,
		VehicleType:    models.VehicleMotorcycle,
	})

	// Tidak ada tawaran yang tersimpan
	var offerCount int64
	db.Model(&models.OrderOffer{}).Where("order_uuid = ?", order.UUID).Count(&offerCount)
	if offerCount != 0 {
		t.Errorf("expected 0 offers, got %d", offerCount)
	}

	// Notifikasi "Belum ada driver" tercatat untuk rider
	var notifs []models.Notification
	if err := db.Where("user_id = ? AND type = ?", rider.ID, models.NotifNoDriverAvailable).
		Find(&notifs).Error; err != nil {
		t.Fatalf("failed to query notifications: %v", err)
	}
	if len(notifs) != 1 {
		t.Fatalf("expected 1 NotifNoDriverAvailable notification, got %d", len(notifs))
	}
}

// TestMatchingWorker_Dispatch_PendingOfferDoesNotTriggerNoDrivers —
// Ketika Driver 1 menolak tawaran tetapi Driver 2 masih memiliki tawaran aktif (status offered),
// sistem TIDAK boleh mengirim sinyal "no_drivers_available" ke pemesan.
func TestMatchingWorker_Dispatch_PendingOfferDoesNotTriggerNoDrivers(t *testing.T) {
	db := testutil.NewTestDB(t)
	settingsRepo := repository.NewSettingsRepository(db, nil)
	priceCalc := pricing.NewCalculator(settingsRepo)
	hub := ws.NewHub()
	notifRepo := repository.NewNotificationRepository(db, hub)

	rider := matchRider(t, db, "rider-pending-offers@test.com")
	d1 := matchDriver(t, db, "driver1-rejected@test.com", nil)
	d2 := matchDriver(t, db, "driver2-pending@test.com", nil)
	order := matchOrder(t, db, "ord-pending-1", rider.ID, nil)

	// Driver 1 sudah reject
	db.Create(&models.OrderOffer{
		OrderUUID: order.UUID,
		DriverID:  d1.ID,
		Status:    models.OfferRejected,
		ExpiresAt: time.Now().Add(30 * time.Second),
	})

	// Driver 2 masih memegang tawaran aktif (offered)
	db.Create(&models.OrderOffer{
		OrderUUID: order.UUID,
		DriverID:  d2.ID,
		Status:    models.OfferOffered,
		ExpiresAt: time.Now().Add(25 * time.Second),
	})

	// Redis mengembalikan d1 dan d2; keduanya sudah pernah ditawari
	loc := &mockLocator{driverIDs: []uint{d1.ID, d2.ID}}
	worker := NewMatchingWorker(db, nil, loc, priceCalc, hub, notifRepo)

	// Re-dispatch terpanggil (misalnya setelah d1 menolak)
	worker.Dispatch(context.Background(), OrderCreatedPayload{
		OrderUUID:      order.UUID,
		RiderID:        order.RiderID,
		PickupLat:      -0.9471,
		PickupLon:      100.3543,
		DropoffAddress: "Jl. Sudirman No. 10",
		FareAmount:     15000,
		VehicleType:    models.VehicleMotorcycle,
	})

	// Pastikan NOTIFIKASI no_drivers_available TIDAK dikirim karena d2 masih punya waktu menjawab!
	var notifCount int64
	db.Model(&models.Notification{}).
		Where("user_id = ? AND type = ?", rider.ID, models.NotifNoDriverAvailable).
		Count(&notifCount)
	if notifCount > 0 {
		t.Errorf("no_drivers_available tidak boleh dikirim selama masih ada tawaran aktif, got %d", notifCount)
	}
}

// TestMatchingWorker_Dispatch_VehicleTypeIsolation — Order motor hanya ditawarkan
// ke driver motor, order mobil hanya ditawarkan ke driver mobil.
func TestMatchingWorker_Dispatch_VehicleTypeIsolation(t *testing.T) {
	db := testutil.NewTestDB(t)
	settingsRepo := repository.NewSettingsRepository(db, nil)
	priceCalc := pricing.NewCalculator(settingsRepo)

	rider := matchRider(t, db, "rider-veh@test.com")
	motorDriver := matchDriver(t, db, "drv-motor@test.com", nil)
	carDriver := matchDriver(t, db, "drv-car@test.com", func(u *models.User) {
		u.RoleCode = models.RoleDriverCar
	})

	loc := &mockLocator{driverIDs: []uint{motorDriver.ID, carDriver.ID}}
	worker := NewMatchingWorker(db, nil, loc, priceCalc, nil, nil)

	// 1. Order motor
	orderMotor := matchOrder(t, db, "ord-motor", rider.ID, nil)
	worker.Dispatch(context.Background(), OrderCreatedPayload{
		OrderUUID:   orderMotor.UUID,
		RiderID:     rider.ID,
		VehicleType: models.VehicleMotorcycle,
	})

	var motorOffers []models.OrderOffer
	db.Where("order_uuid = ?", orderMotor.UUID).Find(&motorOffers)
	if len(motorOffers) != 1 || motorOffers[0].DriverID != motorDriver.ID {
		t.Errorf("order motor hanya untuk driver motor, got: %v", motorOffers)
	}

	// 2. Order mobil
	orderCar := matchOrder(t, db, "ord-car", rider.ID, func(o *models.Order) {
		o.VehicleType = models.VehicleCar
	})
	worker.Dispatch(context.Background(), OrderCreatedPayload{
		OrderUUID:   orderCar.UUID,
		RiderID:     rider.ID,
		VehicleType: models.VehicleCar,
	})

	var carOffers []models.OrderOffer
	db.Where("order_uuid = ?", orderCar.UUID).Find(&carOffers)
	if len(carOffers) != 1 || carOffers[0].DriverID != carDriver.ID {
		t.Errorf("order mobil hanya untuk driver mobil, got: %v", carOffers)
	}
}

// TestMatchingWorker_Dispatch_SequentialOfferAfterReject — Jika Driver 1 menolak,
// dispatch berikutnya harus menyasar Driver 2 yang belum pernah ditawari.
func TestMatchingWorker_Dispatch_SequentialOfferAfterReject(t *testing.T) {
	db := testutil.NewTestDB(t)
	settingsRepo := repository.NewSettingsRepository(db, nil)
	priceCalc := pricing.NewCalculator(settingsRepo)

	rider := matchRider(t, db, "rider-seq@test.com")
	d1 := matchDriver(t, db, "seq-driver1@test.com", nil)
	d2 := matchDriver(t, db, "seq-driver2@test.com", nil)
	order := matchOrder(t, db, "ord-seq-1", rider.ID, nil)

	loc := &mockLocator{driverIDs: []uint{d1.ID, d2.ID}}
	worker := NewMatchingWorker(db, nil, loc, priceCalc, nil, nil)

	// Putaran 1: d1 ditawari lebih dulu (misal limit 1)
	// Kita buat tawaran awal untuk d1 lalu tandai reject
	db.Create(&models.OrderOffer{
		OrderUUID: order.UUID,
		DriverID:  d1.ID,
		Status:    models.OfferRejected,
		ExpiresAt: time.Now().Add(30 * time.Second),
	})

	// Putaran 2: Dispatch ulang (seperti dipanggil saat d1 reject)
	worker.Dispatch(context.Background(), OrderCreatedPayload{
		OrderUUID:   order.UUID,
		RiderID:     rider.ID,
		VehicleType: models.VehicleMotorcycle,
	})

	// d2 harus mendapatkan tawaran baru
	var offerD2 models.OrderOffer
	err := db.Where("order_uuid = ? AND driver_id = ?", order.UUID, d2.ID).First(&offerD2).Error
	if err != nil {
		t.Fatalf("driver 2 harus mendapatkan tawaran setelah driver 1 menolak: %v", err)
	}
	if offerD2.Status != models.OfferOffered {
		t.Errorf("status tawaran driver 2 harus offered, got %s", offerD2.Status)
	}
}

// TestMatchingWorker_Dispatch_NilSafety — Worker tidak boleh crash jika locRepo,
// pricing, hub, atau notif bernilai nil.
func TestMatchingWorker_Dispatch_NilSafety(t *testing.T) {
	db := testutil.NewTestDB(t)

	// Semua dependency nil kecuali db
	worker := NewMatchingWorker(db, nil, nil, nil, nil, nil)

	// Harus kembali secara aman tanpa panic
	worker.Dispatch(context.Background(), OrderCreatedPayload{
		OrderUUID:   "ord-safe-nil",
		RiderID:     1,
		VehicleType: models.VehicleMotorcycle,
	})
}
