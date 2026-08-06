package handlers_test

import (
	"net/http"
	"testing"

	"openjek-backend/internal/models"
	"openjek-backend/internal/testutil"
)

func TestOrderHandler_CreateOrder(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	// Buat user dengan saldo cukup
	router, token := createUserWithRoleAndLogin(t, "customer1@wallet.com", models.RoleCustomer)

	var user models.User
	db.Where("email = ?", "customer1@wallet.com").First(&user)
	db.Model(&user).Update("balance", 50000)

	// Buat order dengan saldo
	payload := map[string]interface{}{
		"service_type":   "ride",
		"pickup_lat":     -6.200000,
		"pickup_lon":     106.816666,
		"dropoff_lat":    -6.210000,
		"dropoff_lon":    106.820000,
		"payment_method": "wallet",
	}

	w := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/orders", payload, token))
	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created, got %d: %s", w.Code, w.Body.String())
	}

	body := testutil.ParseJSON(w)
	orderMap, ok := body["order"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected order in response")
	}

	uuid := orderMap["uuid"].(string)

	// Jarak kedua titik di bawah fare.min_distance_km, jadi order ditagih sejauh
	// jarak minimum: 3 km x 3000 = 9000, dipotong dari saldo 50000.
	var updatedUser models.User
	db.First(&updatedUser, user.ID)
	if updatedUser.Balance != 41000 {
		t.Errorf("expected balance to be 41000, got %f", updatedUser.Balance)
	}

	// ── Test Accept Order oleh Driver ──
	driverToken := createUserWithRoleAndLoginInDB(t, db, router, "driver@go.com", models.RoleDriverMotorcycle)

	// Driver baru belum terverifikasi. Di produksi verifikasi dilakukan admin
	// lewat PUT /api/admin/drivers/:id/verify; di sini cukup disetel langsung
	// karena yang diuji adalah alur order, bukan alur verifikasinya.
	if err := db.Model(&models.User{}).
		Where("email = ?", "driver@go.com").
		Update("is_verified", true).Error; err != nil {
		t.Fatal("failed to verify driver:", err)
	}

	wAccept := testutil.Do(router, testutil.JSONRequest(http.MethodPut, "/api/orders/"+uuid+"/accept", nil, driverToken))
	if wAccept.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for accept, got %d: %s", wAccept.Code, wAccept.Body.String())
	}

	var order models.Order
	db.Where("uuid = ?", uuid).First(&order)
	if order.Status != models.StatusAccepted {
		t.Errorf("expected status accepted, got %s", order.Status)
	}

	// ── Test Status Transitions ──

	// Driver arrive
	wArrive := testutil.Do(router, testutil.JSONRequest(http.MethodPut, "/api/orders/"+uuid+"/status", map[string]string{"action": "arrive"}, driverToken))
	if wArrive.Code != http.StatusOK {
		t.Errorf("expected 200 OK for arrive, got %d", wArrive.Code)
	}

	// Driver start
	wStart := testutil.Do(router, testutil.JSONRequest(http.MethodPut, "/api/orders/"+uuid+"/status", map[string]string{"action": "start"}, driverToken))
	if wStart.Code != http.StatusOK {
		t.Errorf("expected 200 OK for start, got %d", wStart.Code)
	}

	// Driver complete
	wComplete := testutil.Do(router, testutil.JSONRequest(http.MethodPut, "/api/orders/"+uuid+"/status", map[string]string{"action": "complete"}, driverToken))
	if wComplete.Code != http.StatusOK {
		t.Errorf("expected 200 OK for complete, got %d", wComplete.Code)
	}

	db.Where("uuid = ?", uuid).First(&order)
	if order.Status != models.StatusCompleted {
		t.Errorf("expected status completed, got %s", order.Status)
	}

	// Order dibayar wallet, jadi driver menerima bagian bersihnya: tarif terendah
	// 9000 (3 km x 3000) dikurangi potongan platform 20%
	// (fare.platform_fee_percent) = 7200.
	var driver models.User
	db.First(&driver, order.DriverID)
	if driver.Balance != 7200 {
		t.Errorf("expected driver balance to be 7200, got %f", driver.Balance)
	}
	if order.PlatformFee != 1800 {
		t.Errorf("expected platform_fee 1800, got %f", order.PlatformFee)
	}
	if order.DriverEarning != 7200 {
		t.Errorf("expected driver_earning 7200, got %f", order.DriverEarning)
	}
}

// TestOrderHandler_CoordinateRange — koordinat di luar bumi ditolak sebelum
// menjadi tarif, dan lintang/bujur nol tetap diterima.
//
// Rentangnya diperiksa di CreateOrder, bukan hanya di /api/fare/estimate: klien
// bisa melewati estimasi dan langsung memesan.
func TestOrderHandler_CoordinateRange(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	router, token := createUserWithRoleAndLogin(t, "coordrange@order.test", models.RoleCustomer)

	var user models.User
	db.Where("email = ?", "coordrange@order.test").First(&user)
	db.Model(&user).Update("balance", 100000)

	basePayload := func() map[string]interface{} {
		return map[string]interface{}{
			"service_type":   "ride",
			"pickup_lat":     -6.200000,
			"pickup_lon":     106.816666,
			"dropoff_lat":    -6.210000,
			"dropoff_lon":    106.820000,
			"payment_method": "cash",
		}
	}

	outOfRange := []struct {
		name  string
		field string
		value float64
	}{
		{"latitude above 90", "pickup_lat", 91},
		{"latitude below -90", "pickup_lat", -90.5},
		{"longitude above 180", "pickup_lon", 180.1},
		{"longitude below -180", "pickup_lon", -181},
		{"dropoff latitude out of range", "dropoff_lat", 1000},
		{"dropoff longitude out of range", "dropoff_lon", -999},
	}

	for _, tc := range outOfRange {
		payload := basePayload()
		payload[tc.field] = tc.value

		w := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/orders", payload, token))
		if w.Code != http.StatusUnprocessableEntity {
			t.Errorf("%s must be 422, got %d: %s", tc.name, w.Code, w.Body.String())
		}
	}

	var count int64
	db.Model(&models.Order{}).Where("customer_id = ?", user.ID).Count(&count)
	if count != 0 {
		t.Fatalf("rejected coordinates must not create an order, found %d", count)
	}

	// Khatulistiwa melintasi Sumatra dan Kalimantan dan meridian nol melewati
	// Greenwich, jadi nol adalah koordinat yang sah — bukan "tidak dikirim".
	zeroPayload := basePayload()
	zeroPayload["pickup_lat"] = 0.0
	zeroPayload["pickup_lon"] = 0.0

	w := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/orders", zeroPayload, token))
	if w.Code != http.StatusCreated {
		t.Fatalf("zero latitude and longitude must be accepted, got %d: %s", w.Code, w.Body.String())
	}

	// Koordinat yang hilang sama sekali tetap ditolak: penunjuk membedakan
	// "tidak dikirim" dari "bernilai nol".
	missing := basePayload()
	delete(missing, "pickup_lat")

	wMissing := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/orders", missing, token))
	if wMissing.Code != http.StatusUnprocessableEntity {
		t.Fatalf("a missing pickup_lat must still be 422, got %d: %s", wMissing.Code, wMissing.Body.String())
	}
}
