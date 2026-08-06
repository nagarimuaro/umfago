package handlers_test

import (
	"fmt"
	"net/http"
	"testing"

	"openjek-backend/internal/models"
	"openjek-backend/internal/testutil"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Berkas ini menguji seluruh endpoint yang terdaftar di router, termasuk yang
// tidak punya test khusus di berkas lain. Tujuannya bukan menguji logika bisnis
// setiap handler secara mendalam — itu tugas berkas test masing-masing — tetapi
// memastikan tidak ada route yang salah pasang: setiap endpoint harus bisa
// dicapai, memakai middleware otorisasi yang benar, dan membalas dengan status
// yang wajar.
//
// Karena itu, sebagian besar assertion di sini berupa status kode. Status 404
// pada sumber daya yang memang tidak ada dianggap benar, sedangkan 403
// dianggap salah: artinya permintaan tertahan di lapisan otorisasi dan handler
// tidak pernah dipanggil.

// apiCase — satu permintaan yang diuji beserta status yang diharapkan.
type apiCase struct {
	name   string
	method string
	path   string
	body   interface{}
	// want berisi status yang dianggap benar. Beberapa endpoint punya lebih
	// dari satu hasil sah tergantung isi database saat itu.
	want []int
}

func (tc apiCase) run(t *testing.T, router *gin.Engine, token string) {
	t.Helper()

	w := testutil.Do(router, testutil.JSONRequest(tc.method, tc.path, tc.body, token))
	for _, code := range tc.want {
		if w.Code == code {
			return
		}
	}
	t.Errorf("%s %s: expected status %v, got %d: %s",
		tc.method, tc.path, tc.want, w.Code, w.Body.String())
}

func runAPICases(t *testing.T, router *gin.Engine, token string, cases []apiCase) {
	t.Helper()
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			tc.run(t, router, token)
		})
	}
}

// adminRoutes — seluruh endpoint di bawah /api/admin beserta status yang
// diharapkan saat dipanggil super admin pada database kosong. Daftar yang sama
// dipakai ulang untuk memastikan pengguna non-admin ditolak di semuanya.
func adminRoutes() []apiCase {
	return []apiCase{
		{"settings list", http.MethodGet, "/api/admin/settings", nil, []int{http.StatusOK}},
		{"settings update", http.MethodPut, "/api/admin/settings/fare.per_km_price_idr",
			map[string]string{"value": "6000"}, []int{http.StatusOK}},

		{"drivers list", http.MethodGet, "/api/admin/drivers", nil, []int{http.StatusOK}},
		{"driver verify", http.MethodPut, "/api/admin/drivers/999999/verify", nil, []int{http.StatusNotFound}},
		{"driver reject kyc", http.MethodPut, "/api/admin/drivers/999999/reject-kyc",
			map[string]string{"reason": "uji coba"}, []int{http.StatusNotFound}},
		{"driver kyc detail", http.MethodGet, "/api/admin/drivers/999999/kyc", nil, []int{http.StatusNotFound}},
		{"driver suspend", http.MethodPut, "/api/admin/drivers/999999/suspend",
			map[string]string{"reason": "uji coba"}, []int{http.StatusNotFound}},
		{"driver reactivate", http.MethodPut, "/api/admin/drivers/999999/reactivate", nil, []int{http.StatusNotFound}},
		{"driver bonus", http.MethodPost, "/api/admin/drivers/999999/bonus",
			map[string]interface{}{"amount": 10000, "note": "bonus uji"}, []int{http.StatusNotFound}},

		{"orders list", http.MethodGet, "/api/admin/orders", nil, []int{http.StatusOK}},
		{"order cancel", http.MethodPut, "/api/admin/orders/tidak-ada/cancel",
			map[string]string{"reason": "uji coba"}, []int{http.StatusNotFound}},
		{"order force complete", http.MethodPut, "/api/admin/orders/tidak-ada/force-complete",
			nil, []int{http.StatusNotFound}},

		{"finance report", http.MethodGet, "/api/admin/finance/report", nil, []int{http.StatusOK}},
		{"finance withdrawals", http.MethodGet, "/api/admin/finance/withdrawals", nil, []int{http.StatusOK}},
		{"finance disburse", http.MethodPut, "/api/admin/finance/withdrawals/999999/disburse",
			nil, []int{http.StatusNotFound}},
		{"finance reject", http.MethodPut, "/api/admin/finance/withdrawals/999999/reject",
			map[string]string{"reason": "uji coba"}, []int{http.StatusNotFound}},
		{"finance refund", http.MethodPost, "/api/admin/finance/refunds",
			map[string]interface{}{"user_id": 999999, "amount": 5000, "reason": "uji coba"},
			[]int{http.StatusNotFound}},

		{"merchants list", http.MethodGet, "/api/admin/merchants", nil, []int{http.StatusOK}},
		{"merchant get", http.MethodGet, "/api/admin/merchants/999999", nil, []int{http.StatusNotFound}},
		{"merchant approve", http.MethodPut, "/api/admin/merchants/999999/approve", nil, []int{http.StatusNotFound}},
		{"merchant suspend", http.MethodPut, "/api/admin/merchants/999999/suspend",
			map[string]string{"reason": "uji coba"}, []int{http.StatusNotFound}},

		{"users list", http.MethodGet, "/api/admin/users", nil, []int{http.StatusOK}},
		{"user get", http.MethodGet, "/api/admin/users/999999", nil, []int{http.StatusNotFound}},
		{"user set active", http.MethodPut, "/api/admin/users/999999/active",
			map[string]bool{"is_active": false}, []int{http.StatusNotFound}},
		{"user assign role", http.MethodPost, "/api/admin/users/999999/roles",
			map[string]string{"role": string(models.RoleDriverCar)}, []int{http.StatusNotFound}},
		{"user revoke role", http.MethodDelete, "/api/admin/users/999999/roles/" + string(models.RoleDriverCar),
			nil, []int{http.StatusNotFound}},

		{"promos list", http.MethodGet, "/api/admin/promos", nil, []int{http.StatusOK}},
		{"promo create", http.MethodPost, "/api/admin/promos", map[string]interface{}{
			"code":           "UJICOBA10",
			"name":           "Uji Coba",
			"discount_type":  "percent",
			"discount_value": 10,
		}, []int{http.StatusCreated}},
		{"promo update", http.MethodPut, "/api/admin/promos/999999",
			map[string]interface{}{"name": "Baru"}, []int{http.StatusNotFound}},
		{"promo delete", http.MethodDelete, "/api/admin/promos/999999", nil, []int{http.StatusNotFound}},
		{"promo usage", http.MethodGet, "/api/admin/promos/999999/usage", nil, []int{http.StatusOK}},

		{"reports dashboard", http.MethodGet, "/api/admin/reports/dashboard", nil, []int{http.StatusOK}},
		{"reports sales", http.MethodGet, "/api/admin/reports/sales", nil, []int{http.StatusOK}},
		{"reports top drivers", http.MethodGet, "/api/admin/reports/top-drivers", nil, []int{http.StatusOK}},
	}
}

// TestAPI_PublicEndpoints — endpoint yang bisa diakses tanpa token.
func TestAPI_PublicEndpoints(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	runAPICases(t, router, "", []apiCase{
		{"health", http.MethodGet, "/health", nil, []int{http.StatusOK}},
		{"register", http.MethodPost, "/api/register", map[string]string{
			"name":     "Publik",
			"email":    "publik@test.com",
			"phone":    "081200000001",
			"password": "password123",
			"role":     string(models.RoleCustomer),
		}, []int{http.StatusCreated, http.StatusOK}},
		{"login wrong password", http.MethodPost, "/api/login", map[string]string{
			"email":    "publik@test.com",
			"password": "salah-sekali",
		}, []int{http.StatusUnauthorized}},
		{"refresh invalid", http.MethodPost, "/api/refresh", map[string]string{
			"refresh_token": "bukan-token",
		}, []int{http.StatusUnauthorized}},
		{"webhook without server key", http.MethodPost, "/webhook/midtrans", map[string]string{
			"order_id":           "TOPUP-1-abc",
			"transaction_status": "settlement",
			"status_code":        "200",
			"gross_amount":       "10000.00",
			"signature_key":      "apa-saja",
		}, []int{http.StatusServiceUnavailable}},
	})
}

// TestAPI_ProtectedEndpointsRejectAnonymous — setiap endpoint di bawah /api
// yang dilindungi JWT harus menolak permintaan tanpa token.
func TestAPI_ProtectedEndpointsRejectAnonymous(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	paths := []struct {
		method string
		path   string
	}{
		{http.MethodPost, "/api/logout"},
		{http.MethodGet, "/api/user"},
		{http.MethodPost, "/api/users/roles"},
		{http.MethodPut, "/api/users/active-role"},
		{http.MethodGet, "/api/ui/home"},
		{http.MethodGet, "/api/orders"},
		{http.MethodPost, "/api/orders"},
		{http.MethodPut, "/api/orders/abc/accept"},
		{http.MethodPut, "/api/orders/abc/status"},
		{http.MethodPost, "/api/orders/abc/rate"},
		{http.MethodPost, "/api/orders/abc/chat"},
		{http.MethodGet, "/api/orders/abc/chat"},
		{http.MethodGet, "/api/wallet"},
		{http.MethodPost, "/api/wallet/deposit"},
		{http.MethodPost, "/api/wallet/withdraw"},
		{http.MethodGet, "/api/wallet/history"},
		{http.MethodGet, "/api/profile"},
		{http.MethodPut, "/api/profile"},
		{http.MethodPut, "/api/profile/driver"},
		{http.MethodPut, "/api/profile/merchant"},
		{http.MethodGet, "/api/notifications"},
		{http.MethodGet, "/api/notifications/unread-count"},
		{http.MethodPut, "/api/notifications/1/read"},
		{http.MethodPut, "/api/notifications/read-all"},
		{http.MethodGet, "/api/products"},
		{http.MethodGet, "/api/products/1"},
		{http.MethodPost, "/api/uploads"},
		{http.MethodGet, "/api/customer/orders"},
		{http.MethodGet, "/api/customer/wallet/history"},
		{http.MethodPost, "/api/driver/kyc"},
		{http.MethodGet, "/api/driver/kyc"},
		{http.MethodGet, "/api/driver/orders"},
		{http.MethodGet, "/api/driver/wallet/history"},
		{http.MethodGet, "/api/driver/earnings"},
		{http.MethodGet, "/api/merchant/orders"},
		{http.MethodGet, "/api/merchant/wallet/history"},
		{http.MethodGet, "/api/merchant/sales"},
		{http.MethodGet, "/api/merchant/products"},
		{http.MethodPost, "/api/merchant/products"},
		{http.MethodGet, "/api/merchant/products/1"},
		{http.MethodPut, "/api/merchant/products/1"},
		{http.MethodDelete, "/api/merchant/products/1"},
	}

	for _, p := range paths {
		w := testutil.Do(router, testutil.JSONRequest(p.method, p.path, nil, ""))
		if w.Code != http.StatusUnauthorized {
			t.Errorf("%s %s without a token: expected 401, got %d", p.method, p.path, w.Code)
		}
	}
}

// TestAPI_CustomerEndpoints — endpoint yang dipakai aplikasi customer.
func TestAPI_CustomerEndpoints(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	token := createUserWithRoleAndLoginInDB(t, db, router, "customer_api@test.com", models.RoleCustomer)

	runAPICases(t, router, token, []apiCase{
		{"current user", http.MethodGet, "/api/user", nil, []int{http.StatusOK}},
		{"home screen", http.MethodGet, "/api/ui/home", nil, []int{http.StatusOK}},
		{"profile get", http.MethodGet, "/api/profile", nil, []int{http.StatusOK}},
		{"profile update", http.MethodPut, "/api/profile",
			map[string]string{"name": "Customer Baru"}, []int{http.StatusOK}},
		{"merchant profile rejected", http.MethodPut, "/api/profile/merchant",
			map[string]string{"business_name": "Warung"}, []int{http.StatusForbidden}},
		{"driver profile rejected", http.MethodPut, "/api/profile/driver",
			map[string]string{"license_number": "B1234"}, []int{http.StatusForbidden}},
		{"wallet balance", http.MethodGet, "/api/wallet", nil, []int{http.StatusOK}},
		{"wallet history", http.MethodGet, "/api/wallet/history", nil, []int{http.StatusOK}},
		{"withdraw without balance", http.MethodPost, "/api/wallet/withdraw", map[string]interface{}{
			"amount":         25000,
			"bank_name":      "BCA",
			"account_number": "1234567890",
			"account_name":   "Customer Baru",
		}, []int{http.StatusBadRequest}},
		{"order history", http.MethodGet, "/api/orders", nil, []int{http.StatusOK}},
		{"accept order rejected for customer", http.MethodPut, "/api/orders/apa-saja/accept",
			nil, []int{http.StatusForbidden}},
		{"admin route rejected", http.MethodGet, "/api/admin/users", nil, []int{http.StatusForbidden}},
	})

	// Logout diuji terakhir karena mencabut refresh token milik sesi ini.
	wLogout := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/logout", nil, token))
	if wLogout.Code != http.StatusOK {
		t.Errorf("logout: expected 200, got %d: %s", wLogout.Code, wLogout.Body.String())
	}
}

// TestAPI_WalletDepositThenWithdraw — penarikan memotong saldo di awal dan
// menyisakan transaksi PENDING untuk dicairkan bagian keuangan.
func TestAPI_WalletDepositThenWithdraw(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	token := createUserWithRoleAndLoginInDB(t, db, router, "wallet_api@test.com", models.RoleCustomer)

	wDeposit := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/wallet/deposit",
		map[string]interface{}{"amount": 100000}, token))
	if wDeposit.Code != http.StatusOK {
		t.Fatalf("deposit: expected 200, got %d: %s", wDeposit.Code, wDeposit.Body.String())
	}

	wWithdraw := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/wallet/withdraw",
		map[string]interface{}{
			"amount":         40000,
			"bank_name":      "BCA",
			"account_number": "1234567890",
			"account_name":   "Wallet Api",
		}, token))
	if wWithdraw.Code != http.StatusCreated {
		t.Fatalf("withdraw: expected 201, got %d: %s", wWithdraw.Code, wWithdraw.Body.String())
	}

	var user models.User
	db.Where("email = ?", "wallet_api@test.com").First(&user)
	if user.Balance != 60000 {
		t.Errorf("expected balance 60000 after withdrawing 40000 from 100000, got %f", user.Balance)
	}

	// Pengajuan penarikan harus terlihat oleh bagian keuangan.
	adminToken := createUserWithRoleAndLoginInDB(t, db, router, "finance_api@test.com", models.RoleFinanceHead)
	wList := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/admin/finance/withdrawals", nil, adminToken))
	if wList.Code != http.StatusOK {
		t.Fatalf("withdrawal list: expected 200, got %d: %s", wList.Code, wList.Body.String())
	}

	body := testutil.ParseJSON(wList)
	items, ok := body["withdrawals"].([]interface{})
	if !ok || len(items) != 1 {
		t.Fatalf("expected exactly 1 pending withdrawal, got %v", body["withdrawals"])
	}

	var pending models.WalletTransaction
	db.Where("user_id = ? AND type = ?", user.ID, models.TxTypeWithdrawal).First(&pending)

	wDisburse := testutil.Do(router, testutil.JSONRequest(http.MethodPut,
		fmt.Sprintf("/api/admin/finance/withdrawals/%d/disburse", pending.ID), nil, adminToken))
	if wDisburse.Code != http.StatusOK {
		t.Fatalf("disburse: expected 200, got %d: %s", wDisburse.Code, wDisburse.Body.String())
	}

	// Pencairan kedua atas pengajuan yang sama harus ditolak.
	wAgain := testutil.Do(router, testutil.JSONRequest(http.MethodPut,
		fmt.Sprintf("/api/admin/finance/withdrawals/%d/disburse", pending.ID), nil, adminToken))
	if wAgain.Code != http.StatusConflict {
		t.Errorf("disbursing twice: expected 409, got %d: %s", wAgain.Code, wAgain.Body.String())
	}
}

// TestAPI_DriverEndpoints — endpoint khusus driver.
func TestAPI_DriverEndpoints(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	token := createUserWithRoleAndLoginInDB(t, db, router, "driver_api@test.com", models.RoleDriverMotorcycle)

	runAPICases(t, router, token, []apiCase{
		{"driver home screen", http.MethodGet, "/api/ui/home", nil, []int{http.StatusOK}},
		{"driver profile update", http.MethodPut, "/api/profile/driver", map[string]string{
			"identity_card_number": "3201000000000001",
			"license_number":       "B1234XYZ",
		}, []int{http.StatusOK}},
		{"merchant profile rejected", http.MethodPut, "/api/profile/merchant",
			map[string]string{"business_name": "Warung"}, []int{http.StatusForbidden}},
		{"accept unknown order", http.MethodPut, "/api/orders/tidak-ada/accept", nil,
			[]int{http.StatusForbidden, http.StatusNotFound}},
	})

	// Layar driver memang berbeda dari layar customer.
	w := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/ui/home", nil, token))
	body := testutil.ParseJSON(w)
	if body["screen"] != "driver_home" {
		t.Errorf("expected the driver screen, got %v", body["screen"])
	}
}

// TestAPI_MerchantEndpoints — pembuatan profil merchant lalu persetujuannya
// oleh back-office.
func TestAPI_MerchantEndpoints(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	token := createUserWithRoleAndLoginInDB(t, db, router, "merchant_api@test.com", models.RoleMerchant)

	wProfile := testutil.Do(router, testutil.JSONRequest(http.MethodPut, "/api/profile/merchant",
		map[string]string{
			"business_name":    "Warung Uji",
			"business_address": "Jl. Uji Coba No. 1",
			"category":         "food",
		}, token))
	if wProfile.Code != http.StatusOK {
		t.Fatalf("merchant profile: expected 200, got %d: %s", wProfile.Code, wProfile.Body.String())
	}

	var merchant models.MerchantProfile
	if err := db.Where("business_name = ?", "Warung Uji").First(&merchant).Error; err != nil {
		t.Fatal("merchant profile was not stored:", err)
	}

	adminToken := createUserWithRoleAndLoginInDB(t, db, router, "salesadmin_api@test.com", models.RoleSuperAdmin)

	runAPICases(t, router, adminToken, []apiCase{
		{"merchant get", http.MethodGet, fmt.Sprintf("/api/admin/merchants/%d", merchant.ID), nil,
			[]int{http.StatusOK}},
		{"merchant approve", http.MethodPut, fmt.Sprintf("/api/admin/merchants/%d/approve", merchant.ID), nil,
			[]int{http.StatusOK}},
		{"merchant suspend", http.MethodPut, fmt.Sprintf("/api/admin/merchants/%d/suspend", merchant.ID),
			map[string]string{"reason": "uji coba"}, []int{http.StatusOK}},
	})

	// Persetujuan menandai akun pemiliknya terverifikasi.
	var owner models.User
	db.Where("email = ?", "merchant_api@test.com").First(&owner)
	if !owner.IsVerified {
		t.Error("approving a merchant should also mark its owner verified")
	}
}

// TestAPI_AdminEndpointsAsSuperAdmin — seluruh endpoint back-office dipanggil
// oleh pemegang semua permission. Tidak boleh ada yang membalas 403 atau 500.
func TestAPI_AdminEndpointsAsSuperAdmin(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	token := createUserWithRoleAndLoginInDB(t, db, router, "superadmin_api@test.com", models.RoleSuperAdmin)

	runAPICases(t, router, token, adminRoutes())
}

// TestAPI_AdminEndpointsRejectNonAdmin — pengguna aplikasi biasa tidak boleh
// menembus satu pun endpoint back-office, apa pun metodenya.
func TestAPI_AdminEndpointsRejectNonAdmin(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	token := createUserWithRoleAndLoginInDB(t, db, router, "bukanadmin_api@test.com", models.RoleCustomer)

	for _, tc := range adminRoutes() {
		w := testutil.Do(router, testutil.JSONRequest(tc.method, tc.path, tc.body, token))
		if w.Code != http.StatusForbidden {
			t.Errorf("%s %s as a customer: expected 403, got %d: %s",
				tc.method, tc.path, w.Code, w.Body.String())
		}
	}
}

// TestAPI_AdminDriverManagement — alur pengelolaan driver dari sisi back-office.
func TestAPI_AdminDriverManagement(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	driverToken := createUserWithRoleAndLoginInDB(t, db, router, "driver_managed@test.com", models.RoleDriverMotorcycle)
	var driver models.User
	db.Where("email = ?", "driver_managed@test.com").First(&driver)

	adminToken := createUserWithRoleAndLoginInDB(t, db, router, "drivermgr_api@test.com", models.RoleDriverManager)

	// Verifikasi kini berarti menyetujui berkas KYC, jadi driver harus
	// menyerahkannya lebih dulu. Tanpa berkas, endpoint verify menjawab 409.
	beforeKYC := testutil.Do(router, testutil.JSONRequest(
		http.MethodPut, fmt.Sprintf("/api/admin/drivers/%d/verify", driver.ID), nil, adminToken))
	if beforeKYC.Code != http.StatusConflict {
		t.Fatalf("verifying before a KYC submission must be 409, got %d: %s",
			beforeKYC.Code, beforeKYC.Body.String())
	}

	submit := testutil.Do(router, testutil.JSONRequest(
		http.MethodPost, "/api/driver/kyc", kycPayload(), driverToken))
	if submit.Code != http.StatusOK {
		t.Fatalf("KYC submission must be 200, got %d: %s", submit.Code, submit.Body.String())
	}

	runAPICases(t, router, adminToken, []apiCase{
		{"list", http.MethodGet, "/api/admin/drivers", nil, []int{http.StatusOK}},
		{"verify", http.MethodPut, fmt.Sprintf("/api/admin/drivers/%d/verify", driver.ID), nil,
			[]int{http.StatusOK}},
		{"bonus", http.MethodPost, fmt.Sprintf("/api/admin/drivers/%d/bonus", driver.ID),
			map[string]interface{}{"amount": 15000, "note": "bonus akhir pekan"}, []int{http.StatusOK}},
		{"suspend", http.MethodPut, fmt.Sprintf("/api/admin/drivers/%d/suspend", driver.ID),
			map[string]string{"reason": "melanggar aturan"}, []int{http.StatusOK}},
		{"reactivate", http.MethodPut, fmt.Sprintf("/api/admin/drivers/%d/reactivate", driver.ID), nil,
			[]int{http.StatusOK}},
	})

	var updated models.User
	db.First(&updated, driver.ID)
	if !updated.IsVerified {
		t.Error("the driver should be verified after the verify endpoint")
	}
	if updated.Balance != 15000 {
		t.Errorf("expected the bonus to land in the driver balance, got %f", updated.Balance)
	}
	if !updated.IsActive {
		t.Error("the driver should be active again after reactivation")
	}
}

// TestAPI_AdminUserManagement — pengelolaan akun oleh pemegang users.manage.
func TestAPI_AdminUserManagement(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	createUserWithRoleAndLoginInDB(t, db, router, "dikelola@test.com", models.RoleCustomer)
	var target models.User
	db.Where("email = ?", "dikelola@test.com").First(&target)

	adminToken := createUserWithRoleAndLoginInDB(t, db, router, "usermgr_api@test.com", models.RoleSuperAdmin)

	runAPICases(t, router, adminToken, []apiCase{
		{"get", http.MethodGet, fmt.Sprintf("/api/admin/users/%d", target.ID), nil, []int{http.StatusOK}},
		{"assign role", http.MethodPost, fmt.Sprintf("/api/admin/users/%d/roles", target.ID),
			map[string]string{"role": string(models.RoleDriverCar)}, []int{http.StatusOK}},
		{"revoke role", http.MethodDelete,
			fmt.Sprintf("/api/admin/users/%d/roles/%s", target.ID, models.RoleDriverCar), nil,
			[]int{http.StatusOK}},
		// Role yang sedang dipakai tidak boleh dicabut, karena akun akan
		// kehilangan otorisasi untuk token yang sudah beredar.
		{"revoke active role", http.MethodDelete,
			fmt.Sprintf("/api/admin/users/%d/roles/%s", target.ID, models.RoleCustomer), nil,
			[]int{http.StatusConflict}},
		{"deactivate", http.MethodPut, fmt.Sprintf("/api/admin/users/%d/active", target.ID),
			map[string]bool{"is_active": false}, []int{http.StatusOK}},
	})

	var updated models.User
	db.First(&updated, target.ID)
	if updated.IsActive {
		t.Error("the account should be inactive after the deactivation endpoint")
	}
}

// TestAPI_DeactivatedUserLosesAccess — akun yang dinonaktifkan harus kehilangan
// akses seketika, tanpa menunggu token kedaluwarsa.
func TestAPI_DeactivatedUserLosesAccess(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	token := createUserWithRoleAndLoginInDB(t, db, router, "dinonaktifkan@test.com", models.RoleCustomer)

	wBefore := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/user", nil, token))
	if wBefore.Code != http.StatusOK {
		t.Fatalf("the account should work before deactivation, got %d", wBefore.Code)
	}

	if err := db.Model(&models.User{}).
		Where("email = ?", "dinonaktifkan@test.com").
		Update("is_active", false).Error; err != nil {
		t.Fatal("failed to deactivate the account:", err)
	}

	wAfter := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/user", nil, token))
	if wAfter.Code == http.StatusOK {
		t.Errorf("a deactivated account should lose access with its existing token, got %d", wAfter.Code)
	}
}

// TestAPI_PromoLifecycle — pembuatan sampai penghapusan promo oleh tim sales.
func TestAPI_PromoLifecycle(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	token := createUserWithRoleAndLoginInDB(t, db, router, "sales_api@test.com", models.RoleSalesHead)

	wCreate := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/admin/promos",
		map[string]interface{}{
			"code":           "hemat20",
			"name":           "Hemat 20%",
			"discount_type":  "percent",
			"discount_value": 20,
			"max_discount":   10000,
			"quota":          100,
		}, token))
	if wCreate.Code != http.StatusCreated {
		t.Fatalf("promo create: expected 201, got %d: %s", wCreate.Code, wCreate.Body.String())
	}

	var promo models.Promo
	if err := db.Where("code = ?", "HEMAT20").First(&promo).Error; err != nil {
		t.Fatal("the promo code should be stored normalized in upper case:", err)
	}

	// Kode yang sama tidak boleh dibuat dua kali.
	wDuplicate := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/admin/promos",
		map[string]interface{}{
			"code":           "HEMAT20",
			"discount_type":  "percent",
			"discount_value": 15,
		}, token))
	if wDuplicate.Code != http.StatusConflict {
		t.Errorf("a duplicate promo code should be rejected with 409, got %d", wDuplicate.Code)
	}

	// Diskon persen di atas 100 tidak masuk akal.
	wInvalid := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/admin/promos",
		map[string]interface{}{
			"code":           "SALAH",
			"discount_type":  "percent",
			"discount_value": 150,
		}, token))
	if wInvalid.Code != http.StatusUnprocessableEntity {
		t.Errorf("a percent discount above 100 should be rejected with 422, got %d", wInvalid.Code)
	}

	runAPICases(t, router, token, []apiCase{
		{"list", http.MethodGet, "/api/admin/promos", nil, []int{http.StatusOK}},
		{"update", http.MethodPut, fmt.Sprintf("/api/admin/promos/%d", promo.ID),
			map[string]interface{}{"quota": 200}, []int{http.StatusOK}},
		{"usage", http.MethodGet, fmt.Sprintf("/api/admin/promos/%d/usage", promo.ID), nil,
			[]int{http.StatusOK}},
		{"delete", http.MethodDelete, fmt.Sprintf("/api/admin/promos/%d", promo.ID), nil,
			[]int{http.StatusOK}},
	})
}

// TestAPI_OrderRatingAndAdminActions — order yang sudah selesai bisa dinilai,
// dan back-office bisa melihat maupun membatalkan order.
func TestAPI_OrderRatingAndAdminActions(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	customerToken := createUserWithRoleAndLoginInDB(t, db, router, "rating_customer@test.com", models.RoleCustomer)
	db.Model(&models.User{}).Where("email = ?", "rating_customer@test.com").Update("balance", 100000)

	wOrder := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/orders", map[string]interface{}{
		"service_type":   "ride",
		"pickup_lat":     -6.200000,
		"pickup_lon":     106.816666,
		"dropoff_lat":    -6.210000,
		"dropoff_lon":    106.820000,
		"payment_method": "wallet",
	}, customerToken))
	if wOrder.Code != http.StatusCreated {
		t.Fatalf("create order: expected 201, got %d: %s", wOrder.Code, wOrder.Body.String())
	}
	uuid := testutil.ParseJSON(wOrder)["order"].(map[string]interface{})["uuid"].(string)

	// Order yang belum selesai belum boleh dinilai.
	wEarlyRate := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/orders/"+uuid+"/rate",
		map[string]interface{}{"rating": 5}, customerToken))
	if wEarlyRate.Code == http.StatusOK {
		t.Error("rating an unfinished order should be rejected")
	}

	adminToken := createUserWithRoleAndLoginInDB(t, db, router, "ops_api@test.com", models.RoleSuperAdmin)

	wList := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/admin/orders", nil, adminToken))
	if wList.Code != http.StatusOK {
		t.Fatalf("admin order list: expected 200, got %d: %s", wList.Code, wList.Body.String())
	}

	wCancel := testutil.Do(router, testutil.JSONRequest(http.MethodPut, "/api/admin/orders/"+uuid+"/cancel",
		map[string]string{"reason": "permintaan pelanggan"}, adminToken))
	if wCancel.Code != http.StatusOK {
		t.Fatalf("admin cancel: expected 200, got %d: %s", wCancel.Code, wCancel.Body.String())
	}

	var order models.Order
	db.Where("uuid = ?", uuid).First(&order)
	if order.Status != models.StatusCancelled {
		t.Errorf("expected the order to be cancelled, got %s", order.Status)
	}

	// Pembayaran wallet dikembalikan saat order dibatalkan.
	var customer models.User
	db.Where("email = ?", "rating_customer@test.com").First(&customer)
	if customer.Balance != 100000 {
		t.Errorf("expected a refund to full balance after cancellation, got %f", customer.Balance)
	}
}

// TestAPI_ChatEndpoints — pesan hanya boleh diakses pihak yang terlibat.
func TestAPI_ChatEndpoints(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	customerToken := createUserWithRoleAndLoginInDB(t, db, router, "chat_customer@test.com", models.RoleCustomer)
	db.Model(&models.User{}).Where("email = ?", "chat_customer@test.com").Update("balance", 100000)

	wOrder := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/orders", map[string]interface{}{
		"service_type":   "ride",
		"pickup_lat":     -6.200000,
		"pickup_lon":     106.816666,
		"dropoff_lat":    -6.210000,
		"dropoff_lon":    106.820000,
		"payment_method": "wallet",
	}, customerToken))
	if wOrder.Code != http.StatusCreated {
		t.Fatalf("create order: expected 201, got %d: %s", wOrder.Code, wOrder.Body.String())
	}
	uuid := testutil.ParseJSON(wOrder)["order"].(map[string]interface{})["uuid"].(string)

	// Percakapan baru terbuka setelah ada driver yang menerima order, karena
	// sebelum itu belum ada lawan bicara.
	wTooEarly := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/orders/"+uuid+"/chat",
		map[string]string{"message": "Halo?"}, customerToken))
	if wTooEarly.Code != http.StatusBadRequest {
		t.Errorf("chatting before a driver is assigned should be rejected with 400, got %d: %s",
			wTooEarly.Code, wTooEarly.Body.String())
	}

	driverToken := createUserWithRoleAndLoginInDB(t, db, router, "chat_driver@test.com", models.RoleDriverMotorcycle)
	if err := db.Model(&models.User{}).
		Where("email = ?", "chat_driver@test.com").
		Update("is_verified", true).Error; err != nil {
		t.Fatal("failed to verify the driver:", err)
	}

	wAccept := testutil.Do(router, testutil.JSONRequest(http.MethodPut, "/api/orders/"+uuid+"/accept", nil, driverToken))
	if wAccept.Code != http.StatusOK {
		t.Fatalf("accept order: expected 200, got %d: %s", wAccept.Code, wAccept.Body.String())
	}

	wSend := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/orders/"+uuid+"/chat",
		map[string]string{"message": "Saya menunggu di depan pagar"}, customerToken))
	if wSend.Code != http.StatusCreated && wSend.Code != http.StatusOK {
		t.Fatalf("send chat: expected 200 or 201, got %d: %s", wSend.Code, wSend.Body.String())
	}

	wDriverSend := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/orders/"+uuid+"/chat",
		map[string]string{"message": "Baik, saya menuju ke sana"}, driverToken))
	if wDriverSend.Code != http.StatusCreated && wDriverSend.Code != http.StatusOK {
		t.Fatalf("driver send chat: expected 200 or 201, got %d: %s", wDriverSend.Code, wDriverSend.Body.String())
	}

	wHistory := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/orders/"+uuid+"/chat", nil, customerToken))
	if wHistory.Code != http.StatusOK {
		t.Fatalf("chat history: expected 200, got %d: %s", wHistory.Code, wHistory.Body.String())
	}

	// Pihak ketiga tidak boleh membaca percakapan order milik orang lain.
	otherToken := createUserWithRoleAndLoginInDB(t, db, router, "chat_pihak_ketiga@test.com", models.RoleCustomer)
	wForbidden := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/orders/"+uuid+"/chat", nil, otherToken))
	if wForbidden.Code == http.StatusOK {
		t.Error("an unrelated user should not be able to read someone else's order chat")
	}
}

// TestAPI_PermissionBoundaries — setiap role back-office hanya menembus
// endpoint yang menjadi haknya. Ini menjaga pembagian permission di SeedRoles
// tetap sesuai dengan middleware yang terpasang di route.
func TestAPI_PermissionBoundaries(t *testing.T) {
	cases := []struct {
		role    models.RoleCode
		email   string
		allowed []string // path GET yang harus 200
		denied  []string // path GET yang harus 403
	}{
		{
			role:    models.RoleFinanceStaff,
			email:   "financestaff_api@test.com",
			allowed: []string{"/api/admin/finance/report", "/api/admin/orders"},
			denied:  []string{"/api/admin/settings", "/api/admin/promos", "/api/admin/reports/dashboard"},
		},
		{
			role:    models.RoleSalesHead,
			email:   "saleshead_api@test.com",
			allowed: []string{"/api/admin/promos", "/api/admin/reports/sales", "/api/admin/merchants"},
			denied:  []string{"/api/admin/finance/report", "/api/admin/users", "/api/admin/drivers"},
		},
		{
			role:    models.RoleCS,
			email:   "cs_api@test.com",
			allowed: []string{"/api/admin/orders", "/api/admin/users", "/api/admin/drivers"},
			denied:  []string{"/api/admin/settings", "/api/admin/finance/report", "/api/admin/promos"},
		},
		{
			role:    models.RoleOpsManager,
			email:   "ops_manager_api@test.com",
			allowed: []string{"/api/admin/orders", "/api/admin/drivers", "/api/admin/reports/dashboard"},
			denied:  []string{"/api/admin/finance/report", "/api/admin/users", "/api/admin/settings"},
		},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(string(tc.role), func(t *testing.T) {
			db := testutil.NewTestDB(t)
			router, _ := testutil.SetupRouter(db)
			token := createUserWithRoleAndLoginInDB(t, db, router, tc.email, tc.role)

			for _, path := range tc.allowed {
				w := testutil.Do(router, testutil.JSONRequest(http.MethodGet, path, nil, token))
				if w.Code != http.StatusOK {
					t.Errorf("%s should be able to GET %s, got %d: %s",
						tc.role, path, w.Code, w.Body.String())
				}
			}
			for _, path := range tc.denied {
				w := testutil.Do(router, testutil.JSONRequest(http.MethodGet, path, nil, token))
				if w.Code != http.StatusForbidden {
					t.Errorf("%s should NOT be able to GET %s, expected 403 got %d",
						tc.role, path, w.Code)
				}
			}
		})
	}
}

// TestAPI_PaginationIsBounded — batas jumlah baris per halaman harus dipaksakan
// server, karena parameter itu datang dari klien.
func TestAPI_PaginationIsBounded(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	token := createUserWithRoleAndLoginInDB(t, db, router, "pagination_api@test.com", models.RoleSuperAdmin)

	w := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/admin/users?per_page=100000", nil, token))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	meta, ok := testutil.ParseJSON(w)["meta"].(map[string]interface{})
	if !ok {
		t.Fatal("the list response should carry pagination metadata")
	}
	if perPage, _ := meta["per_page"].(float64); perPage > 100 {
		t.Errorf("per_page should be capped at 100, got %v", perPage)
	}
}

// mustCountRoutes — jumlah route yang benar-benar terdaftar di router.
func mustCountRoutes(router *gin.Engine) int {
	return len(router.Routes())
}

// TestAPI_AllRoutesAreRegistered — penjaga agar route tidak hilang diam-diam
// saat berkas wiring diubah. Angkanya sengaja dibandingkan sebagai batas bawah,
// bukan sama persis, supaya penambahan endpoint baru tidak langsung memerahkan
// test.
func TestAPI_AllRoutesAreRegistered(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	const minimumRoutes = 83
	if got := mustCountRoutes(router); got < minimumRoutes {
		t.Errorf("expected at least %d registered routes, got %d", minimumRoutes, got)
	}

	// Setiap endpoint yang disebut di dokumentasi harus ada di tabel route.
	required := []string{
		"GET /health",
		"POST /webhook/midtrans",
		"POST /api/register",
		"POST /api/login",
		"POST /api/refresh",
		"POST /api/logout",
		"GET /api/user",
		"POST /api/users/roles",
		"PUT /api/users/active-role",
		"GET /api/ui/home",
		"GET /api/orders",
		"POST /api/orders",
		"PUT /api/orders/:uuid/accept",
		"PUT /api/orders/:uuid/reject",
		"PUT /api/orders/:uuid/status",
		"POST /api/orders/:uuid/rate",
		"POST /api/orders/:uuid/chat",
		"GET /api/orders/:uuid/chat",
		"POST /api/fare/estimate",
		"POST /api/promos/validate",
		"GET /api/wallet",
		"POST /api/wallet/deposit",
		"POST /api/wallet/withdraw",
		"GET /api/wallet/history",
		"GET /api/profile",
		"PUT /api/profile",
		"PUT /api/profile/driver",
		"PUT /api/profile/merchant",
		"GET /api/notifications",
		"GET /api/notifications/unread-count",
		"PUT /api/notifications/:id/read",
		"PUT /api/notifications/read-all",
		"GET /api/products",
		"GET /api/products/:id",
		"POST /api/uploads",
		"GET /api/customer/orders",
		"GET /api/customer/wallet/history",
		"POST /api/driver/kyc",
		"GET /api/driver/kyc",
		"PUT /api/driver/status",
		"GET /api/driver/orders",
		"GET /api/driver/wallet/history",
		"GET /api/driver/earnings",
		"GET /api/merchant/orders",
		"GET /api/merchant/wallet/history",
		"GET /api/merchant/sales",
		"GET /api/merchant/products",
		"POST /api/merchant/products",
		"GET /api/merchant/products/:id",
		"PUT /api/merchant/products/:id",
		"DELETE /api/merchant/products/:id",
		"GET /api/admin/settings",
		"PUT /api/admin/settings/:key",
		"GET /api/admin/drivers",
		"PUT /api/admin/drivers/:id/verify",
		"PUT /api/admin/drivers/:id/reject-kyc",
		"GET /api/admin/drivers/:id/kyc",
		"PUT /api/admin/drivers/:id/suspend",
		"PUT /api/admin/drivers/:id/reactivate",
		"POST /api/admin/drivers/:id/bonus",
		"GET /api/admin/orders",
		"PUT /api/admin/orders/:uuid/cancel",
		"PUT /api/admin/orders/:uuid/force-complete",
		"GET /api/admin/finance/report",
		"GET /api/admin/finance/withdrawals",
		"PUT /api/admin/finance/withdrawals/:id/disburse",
		"PUT /api/admin/finance/withdrawals/:id/reject",
		"POST /api/admin/finance/refunds",
		"GET /api/admin/merchants",
		"GET /api/admin/merchants/:id",
		"PUT /api/admin/merchants/:id/approve",
		"PUT /api/admin/merchants/:id/suspend",
		"GET /api/admin/users",
		"GET /api/admin/users/:id",
		"PUT /api/admin/users/:id/active",
		"POST /api/admin/users/:id/roles",
		"DELETE /api/admin/users/:id/roles/:role",
		"GET /api/admin/promos",
		"POST /api/admin/promos",
		"PUT /api/admin/promos/:id",
		"DELETE /api/admin/promos/:id",
		"GET /api/admin/promos/:id/usage",
		"GET /api/admin/reports/dashboard",
		"GET /api/admin/reports/sales",
		"GET /api/admin/reports/top-drivers",
	}

	registered := map[string]bool{}
	for _, r := range router.Routes() {
		registered[r.Method+" "+r.Path] = true
	}
	for _, route := range required {
		if !registered[route] {
			t.Errorf("route %s is not registered", route)
		}
	}
}

// assertDBHasUser — memastikan helper login memang menulis ke database yang
// sama dengan yang dipakai router, agar kegagalan test lain tidak salah dibaca
// sebagai bug handler.
func assertDBHasUser(t *testing.T, db *gorm.DB, email string) {
	t.Helper()
	var count int64
	db.Model(&models.User{}).Where("email = ?", email).Count(&count)
	if count != 1 {
		t.Fatalf("expected exactly one user with email %s, found %d", email, count)
	}
}

func TestAPI_TestHelperUsesTheSameDatabase(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	createUserWithRoleAndLoginInDB(t, db, router, "sanity_api@test.com", models.RoleCustomer)
	assertDBHasUser(t, db, "sanity_api@test.com")
}
