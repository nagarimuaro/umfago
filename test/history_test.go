package test

import (
	"net/http"
	"testing"
	"time"

	"openjek-backend/internal/models"
	"openjek-backend/internal/testutil"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// historyFixture — satu penumpang, satu driver, satu merchant, dan sekumpulan
// order serta transaksi yang menghubungkan ketiganya.
type historyFixture struct {
	db     *gorm.DB
	router *gin.Engine

	customerToken string
	driverToken   string
	merchantToken string

	customerID uint
	driverID   uint
	merchantID uint
}

func seedOrder(t *testing.T, db *gorm.DB, order models.Order) models.Order {
	t.Helper()
	order.UUID = uuid.New().String()
	if err := db.Create(&order).Error; err != nil {
		t.Fatal("failed to seed order:", err)
	}
	return order
}

func seedTransaction(t *testing.T, db *gorm.DB, tx models.WalletTransaction) {
	t.Helper()
	if tx.Status == "" {
		tx.Status = models.TxStatusSuccess
	}
	if err := db.Create(&tx).Error; err != nil {
		t.Fatal("failed to seed wallet transaction:", err)
	}
}

func newHistoryFixture(t *testing.T) historyFixture {
	t.Helper()
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	f := historyFixture{db: db, router: router}
	f.customerToken = createUserWithRoleAndLoginInDB(t, db, router, "hist-customer@test.com", models.RoleCustomer)
	f.driverToken = createUserWithRoleAndLoginInDB(t, db, router, "hist-driver@test.com", models.RoleDriverMotorcycle)
	f.merchantToken = createUserWithRoleAndLoginInDB(t, db, router, "hist-merchant@test.com", models.RoleMerchant)

	f.customerID = userIDByEmail(t, db, "hist-customer@test.com")
	f.driverID = userIDByEmail(t, db, "hist-driver@test.com")
	f.merchantID = userIDByEmail(t, db, "hist-merchant@test.com")

	now := time.Now()

	// Dua order selesai milik penumpang, dikerjakan driver, berasal dari merchant.
	for i := 0; i < 2; i++ {
		completed := now.Add(-time.Duration(i+1) * time.Hour)
		seedOrder(t, db, models.Order{
			RiderID:       f.customerID,
			DriverID:      &f.driverID,
			MerchantID:    &f.merchantID,
			Status:        models.StatusCompleted,
			FareAmount:    20000,
			PlatformFee:   4000,
			DriverEarning: 16000,
			CompletedAt:   &completed,
		})
	}

	// Satu order batal, yang tidak boleh ikut terhitung sebagai pendapatan.
	cancelled := now.Add(-30 * time.Minute)
	seedOrder(t, db, models.Order{
		RiderID:     f.customerID,
		DriverID:    &f.driverID,
		Status:      models.StatusCancelled,
		FareAmount:  15000,
		CancelledAt: &cancelled,
	})

	// Order milik akun lain, dipakai untuk memastikan scope tidak bocor. Akun
	// merchant dipinjam sebagai pemesan di sini karena perannya tidak
	// berpengaruh pada scope order — yang menentukan hanya kolom rider_id.
	seedOrder(t, db, models.Order{
		RiderID:    f.merchantID,
		Status:     models.StatusCompleted,
		FareAmount: 99000,
	})

	// Transaksi dompet untuk masing-masing peran.
	seedTransaction(t, db, models.WalletTransaction{
		UserID: f.customerID, Amount: 100000, Type: models.TxTypeDeposit})
	seedTransaction(t, db, models.WalletTransaction{
		UserID: f.customerID, Amount: 20000, Type: models.TxTypePayment})
	seedTransaction(t, db, models.WalletTransaction{
		UserID: f.driverID, Amount: 16000, Type: models.TxTypeEarning})
	seedTransaction(t, db, models.WalletTransaction{
		UserID: f.driverID, Amount: 4000, Type: models.TxTypeFee})
	// EARNING milik driver tidak boleh muncul di riwayat penumpang, dan DEPOSIT
	// milik driver tidak boleh muncul di riwayat driver.
	seedTransaction(t, db, models.WalletTransaction{
		UserID: f.driverID, Amount: 50000, Type: models.TxTypeDeposit})
	seedTransaction(t, db, models.WalletTransaction{
		UserID: f.merchantID, Amount: 40000, Type: models.TxTypeEarning})

	return f
}

func getJSON(t *testing.T, router *gin.Engine, path, token string) map[string]interface{} {
	t.Helper()
	w := testutil.Do(router, testutil.JSONRequest(http.MethodGet, path, nil, token))
	if w.Code != http.StatusOK {
		t.Fatalf("GET %s expected 200, got %d: %s", path, w.Code, w.Body.String())
	}
	return testutil.ParseJSON(w)
}

func numberField(t *testing.T, obj map[string]interface{}, key string) float64 {
	t.Helper()
	v, ok := obj[key].(float64)
	if !ok {
		t.Fatalf("field %q is missing or not a number: %v", key, obj[key])
	}
	return v
}

func summaryOf(t *testing.T, body map[string]interface{}) map[string]interface{} {
	t.Helper()
	s, ok := body["summary"].(map[string]interface{})
	if !ok {
		t.Fatalf("response has no summary object: %v", body["summary"])
	}
	return s
}

// TestHistory_CustomerOrders — penumpang hanya melihat order yang dipesannya,
// beserta rekap yang memisahkan selesai dari batal.
func TestHistory_CustomerOrders(t *testing.T) {
	f := newHistoryFixture(t)

	body := getJSON(t, f.router, "/api/customer/orders", f.customerToken)

	orders, ok := body["orders"].([]interface{})
	if !ok {
		t.Fatalf("response has no orders array: %v", body["orders"])
	}
	if len(orders) != 3 {
		t.Fatalf("expected the 3 orders belonging to this customer, got %d", len(orders))
	}
	for _, raw := range orders {
		order := raw.(map[string]interface{})
		if uint(numberField(t, order, "rider_id")) != f.customerID {
			t.Errorf("an order from another rider leaked into the response: %v", order["rider_id"])
		}
	}

	summary := summaryOf(t, body)
	if got := numberField(t, summary, "total_orders"); got != 3 {
		t.Errorf("expected 3 total orders, got %.0f", got)
	}
	if got := numberField(t, summary, "completed"); got != 2 {
		t.Errorf("expected 2 completed, got %.0f", got)
	}
	if got := numberField(t, summary, "cancelled"); got != 1 {
		t.Errorf("expected 1 cancelled, got %.0f", got)
	}
	// Order batal tidak menambah pengeluaran.
	if got := numberField(t, summary, "total_fare"); got != 40000 {
		t.Errorf("expected 40000 spent on completed orders, got %.0f", got)
	}
}

// TestHistory_DriverOrdersAndEarnings — driver melihat sisi pendapatannya,
// bukan tarif kotor yang dibayar penumpang.
func TestHistory_DriverOrdersAndEarnings(t *testing.T) {
	f := newHistoryFixture(t)

	orderBody := getJSON(t, f.router, "/api/driver/orders", f.driverToken)
	summary := summaryOf(t, orderBody)
	if got := numberField(t, summary, "completed"); got != 2 {
		t.Errorf("expected 2 completed trips, got %.0f", got)
	}
	if got := numberField(t, summary, "total_net"); got != 32000 {
		t.Errorf("driver net must sum driver_earning (32000), got %.0f", got)
	}

	earnings := getJSON(t, f.router, "/api/driver/earnings", f.driverToken)
	es := summaryOf(t, earnings)
	if got := numberField(t, es, "trips"); got != 2 {
		t.Errorf("expected 2 trips, got %.0f", got)
	}
	if got := numberField(t, es, "gross_fare"); got != 40000 {
		t.Errorf("expected gross 40000, got %.0f", got)
	}
	if got := numberField(t, es, "platform_fee"); got != 8000 {
		t.Errorf("expected platform fee 8000, got %.0f", got)
	}
	if got := numberField(t, es, "driver_earning"); got != 32000 {
		t.Errorf("expected net 32000, got %.0f", got)
	}
	if _, ok := earnings["current_balance"]; !ok {
		t.Error("earnings must report the running balance")
	}
}

// TestHistory_MerchantOrdersAndSales — merchant melihat order yang berasal
// darinya. Kolom merchant_id inilah yang sebelumnya tidak ada sama sekali.
func TestHistory_MerchantOrdersAndSales(t *testing.T) {
	f := newHistoryFixture(t)

	body := getJSON(t, f.router, "/api/merchant/orders", f.merchantToken)
	orders, ok := body["orders"].([]interface{})
	if !ok {
		t.Fatalf("response has no orders array: %v", body["orders"])
	}
	if len(orders) != 2 {
		t.Fatalf("expected the 2 orders sourced from this merchant, got %d", len(orders))
	}

	sales := getJSON(t, f.router, "/api/merchant/sales", f.merchantToken)
	ss := summaryOf(t, sales)
	if got := numberField(t, ss, "orders"); got != 2 {
		t.Errorf("expected 2 sales, got %.0f", got)
	}
	if got := numberField(t, ss, "revenue"); got != 40000 {
		t.Errorf("expected revenue 40000, got %.0f", got)
	}
}

// TestHistory_WalletTypesAreScopedPerRole — layar riwayat tiap peran hanya
// memuat jenis transaksi yang memang terjadi pada peran itu.
func TestHistory_WalletTypesAreScopedPerRole(t *testing.T) {
	f := newHistoryFixture(t)

	customerTypes := transactionTypesIn(t, getJSON(t,
		f.router, "/api/customer/wallet/history", f.customerToken))
	if !customerTypes[string(models.TxTypeDeposit)] || !customerTypes[string(models.TxTypePayment)] {
		t.Errorf("customer history must contain DEPOSIT and PAYMENT, got %v", customerTypes)
	}
	if customerTypes[string(models.TxTypeEarning)] || customerTypes[string(models.TxTypeFee)] {
		t.Errorf("customer history must not contain driver transaction types, got %v", customerTypes)
	}

	driverTypes := transactionTypesIn(t, getJSON(t,
		f.router, "/api/driver/wallet/history", f.driverToken))
	if !driverTypes[string(models.TxTypeEarning)] || !driverTypes[string(models.TxTypeFee)] {
		t.Errorf("driver history must contain EARNING and FEE, got %v", driverTypes)
	}
	if driverTypes[string(models.TxTypeDeposit)] {
		t.Errorf("DEPOSIT is not part of the driver history, got %v", driverTypes)
	}

	// Menyaring dengan jenis di luar daftar perannya ditolak, bukan diam-diam
	// dikosongkan, agar klien tahu penyebabnya.
	w := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodGet, "/api/driver/wallet/history?type=DEPOSIT", nil, f.driverToken))
	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("filtering by an out-of-role type must be 422, got %d", w.Code)
	}
	if _, ok := testutil.ParseJSON(w)["allowed_values"]; !ok {
		t.Error("the rejection must list the values this role may use")
	}
}

func transactionTypesIn(t *testing.T, body map[string]interface{}) map[string]bool {
	t.Helper()
	list, ok := body["transactions"].([]interface{})
	if !ok {
		t.Fatalf("response has no transactions array: %v", body["transactions"])
	}
	found := map[string]bool{}
	for _, raw := range list {
		tx := raw.(map[string]interface{})
		found[tx["type"].(string)] = true
	}
	return found
}

// TestHistory_RoleEndpointsRejectOtherRoles — token satu peran tidak boleh
// membuka riwayat peran lain. Penjaganya memakai role AKTIF, sama seperti
// seluruh otorisasi lain di sistem ini.
func TestHistory_RoleEndpointsRejectOtherRoles(t *testing.T) {
	f := newHistoryFixture(t)

	cases := []struct {
		path  string
		token string
		name  string
	}{
		{"/api/driver/orders", f.customerToken, "customer reaching driver history"},
		{"/api/driver/earnings", f.customerToken, "customer reaching driver earnings"},
		{"/api/merchant/sales", f.customerToken, "customer reaching merchant sales"},
		{"/api/customer/orders", f.driverToken, "driver reaching customer history"},
		{"/api/merchant/orders", f.driverToken, "driver reaching merchant history"},
		{"/api/customer/wallet/history", f.merchantToken, "merchant reaching customer history"},
		{"/api/driver/kyc", f.merchantToken, "merchant reaching driver KYC"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w := testutil.Do(f.router, testutil.JSONRequest(http.MethodGet, tc.path, nil, tc.token))
			if w.Code != http.StatusForbidden {
				t.Errorf("GET %s expected 403, got %d", tc.path, w.Code)
			}
		})
	}
}

// TestHistory_PaginationCapIsEnforced — satu permintaan tidak boleh menarik
// seluruh tabel.
func TestHistory_PaginationCapIsEnforced(t *testing.T) {
	f := newHistoryFixture(t)

	body := getJSON(t, f.router, "/api/customer/orders?per_page=5000", f.customerToken)
	meta, ok := body["meta"].(map[string]interface{})
	if !ok {
		t.Fatalf("response has no meta object: %v", body["meta"])
	}
	if got := numberField(t, meta, "per_page"); got != 100 {
		t.Errorf("per_page must be capped at 100, got %.0f", got)
	}
}

// TestHistory_LegacyEndpointsStillWork — endpoint lama dipertahankan agar klien
// yang sudah beredar tidak rusak oleh pemisahan ini.
func TestHistory_LegacyEndpointsStillWork(t *testing.T) {
	f := newHistoryFixture(t)

	if _, ok := getJSON(t, f.router, "/api/orders", f.customerToken)["orders"]; !ok {
		t.Error("GET /api/orders must keep returning an orders array")
	}
	if _, ok := getJSON(t, f.router, "/api/wallet/history", f.customerToken)["transactions"]; !ok {
		t.Error("GET /api/wallet/history must keep returning a transactions array")
	}
}
