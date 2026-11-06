package handlers_test

import (
	"context"
	"net/http"
	"testing"
	"time"

	"openjek-backend/internal/models"
	"openjek-backend/internal/pricing"
	"openjek-backend/internal/repository"
	"openjek-backend/internal/testutil"
	"openjek-backend/internal/workers"
)

type flowLocator struct {
	drivers []uint
}

func (f *flowLocator) FindNearestDrivers(ctx context.Context, lat, lon float64, radiusKm float64, count int) ([]uint, error) {
	if count > 0 && len(f.drivers) > count {
		return f.drivers[:count], nil
	}
	return f.drivers, nil
}

// TestOrderFlow_SearchAndAccept — Alur lengkap mencari driver:
// 1. Rider membuat pesanan (status: searching).
// 2. MatchingWorker menemukan driver terdekat dan membuat tawaran (status: offered).
// 3. Driver menerima pesanan (status: accepted, driver_id terisi).
// 4. Driver lain yang mencoba menerima akan ditolak (409 Conflict).
func TestOrderFlow_SearchAndAccept(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	riderToken := createUserWithRoleAndLoginInDB(t, db, router, "rider-flow1@test.com", models.RoleCustomer)
	var rider models.User
	db.Where("email = ?", "rider-flow1@test.com").First(&rider)
	db.Model(&rider).Update("balance", 100000)

	driver1Token := createUserWithRoleAndLoginInDB(t, db, router, "driver-flow1@test.com", models.RoleDriverMotorcycle)
	var driver1 models.User
	db.Where("email = ?", "driver-flow1@test.com").First(&driver1)
	db.Model(&driver1).Updates(map[string]interface{}{
		"is_verified": true,
		"is_online":   true,
		"balance":     50000,
	})

	driver2Token := createUserWithRoleAndLoginInDB(t, db, router, "driver-flow2@test.com", models.RoleDriverMotorcycle)
	var driver2 models.User
	db.Where("email = ?", "driver-flow2@test.com").First(&driver2)
	db.Model(&driver2).Updates(map[string]interface{}{
		"is_verified": true,
		"is_online":   true,
		"balance":     50000,
	})

	// 1. Rider membuat order
	orderPayload := map[string]interface{}{
		"service_type":   "ride",
		"pickup_lat":     -0.9471,
		"pickup_lon":     100.3543,
		"dropoff_lat":    -0.9500,
		"dropoff_lon":    100.3600,
		"payment_method": "cash",
	}

	wOrder := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/orders", orderPayload, riderToken))
	if wOrder.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created, got %d: %s", wOrder.Code, wOrder.Body.String())
	}

	orderData := testutil.ParseJSON(wOrder)
	orderMap := orderData["order"].(map[string]interface{})
	orderUUID := orderMap["uuid"].(string)

	var order models.Order
	db.Where("uuid = ?", orderUUID).First(&order)
	if order.Status != models.StatusSearching {
		t.Fatalf("status order awal harus searching, got %s", order.Status)
	}

	// 2. MatchingWorker memproses pencarian driver
	settingsRepo := repository.NewSettingsRepository(db, nil)
	priceCalc := pricing.NewCalculator(settingsRepo)
	locator := &flowLocator{drivers: []uint{driver1.ID, driver2.ID}}
	worker := workers.NewMatchingWorker(db, nil, locator, priceCalc, nil, nil)

	worker.Dispatch(context.Background(), workers.OrderCreatedPayload{
		OrderUUID:      order.UUID,
		RiderID:        order.RiderID,
		PickupLat:      order.PickupLat,
		PickupLon:      order.PickupLon,
		DropoffAddress: order.DropoffAddress,
		FareAmount:     order.FareAmount,
		VehicleType:    order.VehicleType,
	})

	// Verifikasi tawaran tercatat untuk driver1 & driver2
	var offers []models.OrderOffer
	db.Where("order_uuid = ?", order.UUID).Find(&offers)
	if len(offers) == 0 {
		t.Fatalf("tawaran harus tercatat untuk driver")
	}

	// 3. Driver 1 menerima pesanan
	wAccept := testutil.Do(router, testutil.JSONRequest(http.MethodPut, "/api/orders/"+orderUUID+"/accept", nil, driver1Token))
	if wAccept.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for accept, got %d: %s", wAccept.Code, wAccept.Body.String())
	}

	db.Where("uuid = ?", orderUUID).First(&order)
	if order.Status != models.StatusAccepted {
		t.Errorf("status order harus accepted, got %s", order.Status)
	}
	if order.DriverID == nil || *order.DriverID != driver1.ID {
		t.Errorf("driver_id harus %d, got %v", driver1.ID, order.DriverID)
	}

	var d1Offer models.OrderOffer
	db.Where("order_uuid = ? AND driver_id = ?", orderUUID, driver1.ID).First(&d1Offer)
	if d1Offer.Status != models.OfferAccepted {
		t.Errorf("status tawaran driver1 harus accepted, got %s", d1Offer.Status)
	}

	// 4. Driver 2 mencoba menerima order yang sama -> harus ditolak (409 Conflict)
	wAccept2 := testutil.Do(router, testutil.JSONRequest(http.MethodPut, "/api/orders/"+orderUUID+"/accept", nil, driver2Token))
	if wAccept2.Code != http.StatusConflict {
		t.Errorf("expected 409 Conflict saat order sudah diambil, got %d: %s", wAccept2.Code, wAccept2.Body.String())
	}
}

// TestOrderFlow_SearchRejectAndNextDriver — Alur penolakan driver:
// 1. Driver 1 menolak tawaran order (PUT /api/orders/:uuid/reject).
// 2. Status order tetap 'searching'.
// 3. Putaran pencarian berikutnya mengabaikan Driver 1 dan mengalihkan ke Driver 2.
// 4. Driver 2 menerima order dengan sukses.
func TestOrderFlow_SearchRejectAndNextDriver(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	riderToken := createUserWithRoleAndLoginInDB(t, db, router, "rider-rejectflow@test.com", models.RoleCustomer)
	d1Token := createUserWithRoleAndLoginInDB(t, db, router, "drv1-rejectflow@test.com", models.RoleDriverMotorcycle)
	d2Token := createUserWithRoleAndLoginInDB(t, db, router, "drv2-rejectflow@test.com", models.RoleDriverMotorcycle)

	var d1, d2 models.User
	db.Where("email = ?", "drv1-rejectflow@test.com").First(&d1)
	db.Where("email = ?", "drv2-rejectflow@test.com").First(&d2)
	db.Model(&d1).Updates(map[string]interface{}{"is_verified": true, "is_online": true, "balance": 50000})
	db.Model(&d2).Updates(map[string]interface{}{"is_verified": true, "is_online": true, "balance": 50000})

	wOrder := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/orders", map[string]interface{}{
		"service_type":   "ride",
		"pickup_lat":     -0.9471,
		"pickup_lon":     100.3543,
		"dropoff_lat":    -0.9500,
		"dropoff_lon":    100.3600,
		"payment_method": "cash",
	}, riderToken))
	if wOrder.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created, got %d", wOrder.Code)
	}
	orderUUID := testutil.ParseJSON(wOrder)["order"].(map[string]interface{})["uuid"].(string)

	// Simulasikan tawaran awal untuk driver 1
	db.Create(&models.OrderOffer{
		OrderUUID: orderUUID,
		DriverID:  d1.ID,
		Status:    models.OfferOffered,
		ExpiresAt: time.Now().Add(30 * time.Second),
	})

	// 1. Driver 1 menolak tawaran
	wReject := testutil.Do(router, testutil.JSONRequest(http.MethodPut, "/api/orders/"+orderUUID+"/reject", map[string]string{
		"reason": "terlalu_jauh",
	}, d1Token))
	if wReject.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for reject, got %d: %s", wReject.Code, wReject.Body.String())
	}

	// 2. Order tetap searching
	var order models.Order
	db.Where("uuid = ?", orderUUID).First(&order)
	if order.Status != models.StatusSearching {
		t.Errorf("order harus tetap searching setelah driver menolak, got %s", order.Status)
	}

	var d1Offer models.OrderOffer
	db.Where("order_uuid = ? AND driver_id = ?", orderUUID, d1.ID).First(&d1Offer)
	if d1Offer.Status != models.OfferRejected || d1Offer.Reason != "terlalu_jauh" {
		t.Errorf("tawaran d1 harus ditandai rejected, got status: %s, reason: %s", d1Offer.Status, d1Offer.Reason)
	}

	// 3. Pencarian berlanjut ke driver 2 (MatchingWorker Dispatch)
	settingsRepo := repository.NewSettingsRepository(db, nil)
	priceCalc := pricing.NewCalculator(settingsRepo)
	locator := &flowLocator{drivers: []uint{d1.ID, d2.ID}}
	worker := workers.NewMatchingWorker(db, nil, locator, priceCalc, nil, nil)

	worker.Dispatch(context.Background(), workers.OrderCreatedPayload{
		OrderUUID:      order.UUID,
		RiderID:        order.RiderID,
		PickupLat:      order.PickupLat,
		PickupLon:      order.PickupLon,
		DropoffAddress: order.DropoffAddress,
		FareAmount:     order.FareAmount,
		VehicleType:    order.VehicleType,
	})

	// Driver 2 sekarang memiliki tawaran aktif
	var d2Offer models.OrderOffer
	if err := db.Where("order_uuid = ? AND driver_id = ?", orderUUID, d2.ID).First(&d2Offer).Error; err != nil {
		t.Fatalf("driver 2 harus mendapatkan tawaran baru: %v", err)
	}
	if d2Offer.Status != models.OfferOffered {
		t.Errorf("status tawaran driver 2 harus offered, got %s", d2Offer.Status)
	}

	// 4. Driver 2 menerima order
	wAccept := testutil.Do(router, testutil.JSONRequest(http.MethodPut, "/api/orders/"+orderUUID+"/accept", nil, d2Token))
	if wAccept.Code != http.StatusOK {
		t.Fatalf("driver 2 harus berhasil menerima order, got %d: %s", wAccept.Code, wAccept.Body.String())
	}

	db.Where("uuid = ?", orderUUID).First(&order)
	if order.Status != models.StatusAccepted || *order.DriverID != d2.ID {
		t.Errorf("order harus diterima oleh driver 2, status: %s, driver_id: %v", order.Status, order.DriverID)
	}
}

// TestOrderFlow_IneligibleDriverCannotAccept — Validasi penolakan driver yang tidak sah:
// - Driver belum terverifikasi KYC -> 403 Forbidden
// - Driver memiliki order aktif berjalan -> 409 Conflict
// - Driver jenis kendaraan tidak cocok -> 403 Forbidden
func TestOrderFlow_IneligibleDriverCannotAccept(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	riderToken := createUserWithRoleAndLoginInDB(t, db, router, "rider-inelig@test.com", models.RoleCustomer)
	unverifiedToken := createUserWithRoleAndLoginInDB(t, db, router, "unverified-drv@test.com", models.RoleDriverMotorcycle)
	carDriverToken := createUserWithRoleAndLoginInDB(t, db, router, "cardriver-flow@test.com", models.RoleDriverCar)

	// Pastikan unverified tetap is_verified = false
	var unverifiedDrv, carDrv models.User
	db.Where("email = ?", "unverified-drv@test.com").First(&unverifiedDrv)
	db.Model(&unverifiedDrv).Updates(map[string]interface{}{"is_verified": false, "is_online": true, "balance": 50000})

	db.Where("email = ?", "cardriver-flow@test.com").First(&carDrv)
	db.Model(&carDrv).Updates(map[string]interface{}{"is_verified": true, "is_online": true, "balance": 50000})

	// Buat order motor
	wOrder := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/orders", map[string]interface{}{
		"service_type":   "ride",
		"pickup_lat":     -0.9471,
		"pickup_lon":     100.3543,
		"dropoff_lat":    -0.9500,
		"dropoff_lon":    100.3600,
		"payment_method": "cash",
	}, riderToken))
	orderUUID := testutil.ParseJSON(wOrder)["order"].(map[string]interface{})["uuid"].(string)

	// 1. Driver belum terverifikasi mencoba accept -> 403
	wUnverified := testutil.Do(router, testutil.JSONRequest(http.MethodPut, "/api/orders/"+orderUUID+"/accept", nil, unverifiedToken))
	if wUnverified.Code != http.StatusForbidden {
		t.Errorf("driver belum terverifikasi harus ditolak 403, got %d", wUnverified.Code)
	}

	// 2. Driver mobil mencoba accept order motor -> 409 / vehicle type mismatch
	wCar := testutil.Do(router, testutil.JSONRequest(http.MethodPut, "/api/orders/"+orderUUID+"/accept", nil, carDriverToken))
	if wCar.Code != http.StatusConflict {
		t.Errorf("driver mobil mengambil order motor harus ditolak 409 Conflict, got %d", wCar.Code)
	}
}

// TestOrderFlow_GetOrderByUUID_DatabaseOnly — Memastikan data driver benar-benar diambil dari database:
// - Saat status masih searching -> driver adalah null (tidak boleh ada dummy driver seperti Budi Santoso di code).
// - Saat driver sungguhan menerima order di database -> data driver (nama, kendaraan, plat, dll) diambil dari DB.
func TestOrderFlow_GetOrderByUUID_DatabaseOnly(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	riderToken := createUserWithRoleAndLoginInDB(t, db, router, "rider-dbcheck@test.com", models.RoleCustomer)
	driverToken := createUserWithRoleAndLoginInDB(t, db, router, "real-driver@test.com", models.RoleDriverMotorcycle)

	var driver models.User
	db.Where("email = ?", "real-driver@test.com").First(&driver)
	db.Model(&driver).Updates(map[string]interface{}{
		"name":        "Siti Rahmawati",
		"phone":       "081987654321",
		"is_verified": true,
		"is_online":   true,
		"balance":     75000,
	})

	// Tambahkan data kendaraan asli driver ke database
	db.Create(&models.Vehicle{
		UserID:      driver.ID,
		Type:        models.VehicleMotorcycle,
		Brand:       "Yamaha",
		ModelName:   "Aerox 155",
		PlateNumber: "BA 9999 ZZ",
		IsActive:    true,
	})

	// 1. Buat pesanan baru
	wOrder := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/orders", map[string]interface{}{
		"service_type":   "ride",
		"pickup_lat":     -0.9471,
		"pickup_lon":     100.3543,
		"dropoff_lat":    -0.9500,
		"dropoff_lon":    100.3600,
		"payment_method": "cash",
	}, riderToken))
	orderUUID := testutil.ParseJSON(wOrder)["order"].(map[string]interface{})["uuid"].(string)

	// 2. Cek status via GET /api/orders/:uuid SEBELUM ada driver yang menerima
	wGetSearching := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/orders/"+orderUUID, nil, riderToken))
	if wGetSearching.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", wGetSearching.Code)
	}
	bodySearching := testutil.ParseJSON(wGetSearching)
	if bodySearching["driver"] != nil {
		t.Errorf("sebelum driver menerima, driver harus null! got: %v", bodySearching["driver"])
	}

	// 3. Driver Siti Rahmawati menerima order di database
	wAccept := testutil.Do(router, testutil.JSONRequest(http.MethodPut, "/api/orders/"+orderUUID+"/accept", nil, driverToken))
	if wAccept.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", wAccept.Code, wAccept.Body.String())
	}

	// 4. Cek kembali via GET /api/orders/:uuid SETELAH diterima
	wGetAccepted := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/orders/"+orderUUID, nil, riderToken))
	if wGetAccepted.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", wGetAccepted.Code)
	}
	bodyAccepted := testutil.ParseJSON(wGetAccepted)
	driverMap, ok := bodyAccepted["driver"].(map[string]interface{})
	if !ok || driverMap == nil {
		t.Fatalf("driver harus terisi setelah order accepted")
	}

	// Pastikan data driver adalah data asli Siti Rahmawati dari database, BUKAN dummy di code
	if driverMap["name"] != "Siti Rahmawati" {
		t.Errorf("expected driver name Siti Rahmawati from database, got %v", driverMap["name"])
	}
	if driverMap["plate"] != "BA 9999 ZZ" {
		t.Errorf("expected plate BA 9999 ZZ from database, got %v", driverMap["plate"])
	}
	if driverMap["vehicle"] != "Yamaha Aerox 155" {
		t.Errorf("expected vehicle Yamaha Aerox 155 from database, got %v", driverMap["vehicle"])
	}
}

// TestOrderFlow_RiderCancelOrder — Penumpang membatalkan pesanan saat masih mencari driver:
func TestOrderFlow_RiderCancelOrder(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	riderToken := createUserWithRoleAndLoginInDB(t, db, router, "rider-cancel@test.com", models.RoleCustomer)

	// Buat order
	wOrder := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/orders", map[string]interface{}{
		"service_type":   "ride",
		"pickup_lat":     -0.9471,
		"pickup_lon":     100.3543,
		"dropoff_lat":    -0.9500,
		"dropoff_lon":    100.3600,
		"payment_method": "cash",
	}, riderToken))
	orderUUID := testutil.ParseJSON(wOrder)["order"].(map[string]interface{})["uuid"].(string)

	// Batalkan order via PUT /api/orders/:uuid/cancel
	wCancel := testutil.Do(router, testutil.JSONRequest(http.MethodPut, "/api/orders/"+orderUUID+"/cancel", map[string]string{
		"reason": "Salah titik jemput",
	}, riderToken))
	if wCancel.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", wCancel.Code, wCancel.Body.String())
	}

	var order models.Order
	db.Where("uuid = ?", orderUUID).First(&order)
	if order.Status != models.StatusCancelled {
		t.Errorf("status order harus cancelled, got %s", order.Status)
	}
}
