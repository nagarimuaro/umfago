package handlers_test

import (
	"net/http"
	"strings"
	"testing"

	"openjek-backend/internal/models"
	"openjek-backend/internal/testutil"

	"gorm.io/gorm"
)

func setBalance(t *testing.T, db *gorm.DB, userID uint, amount float64) {
	t.Helper()
	if err := db.Model(&models.User{}).Where("id = ?", userID).
		Update("balance", amount).Error; err != nil {
		t.Fatal("failed to set balance:", err)
	}
}

func lastWithdrawal(t *testing.T, db *gorm.DB, userID uint) models.WalletTransaction {
	t.Helper()
	var tx models.WalletTransaction
	if err := db.Where("user_id = ? AND type = ?", userID, models.TxTypeWithdrawal).
		Order("id desc").First(&tx).Error; err != nil {
		t.Fatalf("no withdrawal recorded for user %d: %v", userID, err)
	}
	return tx
}

// TestWithdraw_DriverBlockedWithoutApprovedKYC — saldo tidak bisa keluar sebelum
// ada rekening yang pernah diverifikasi manusia.
func TestWithdraw_DriverBlockedWithoutApprovedKYC(t *testing.T) {
	f := newKYCFixture(t, "wdnokyc-")
	setBalance(t, f.db, f.driverID, 500000)

	// Belum mengajukan apa pun.
	w := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodPost, "/api/wallet/withdraw",
		map[string]interface{}{"amount": 100000}, f.driverToken))
	if w.Code != http.StatusForbidden {
		t.Fatalf("withdrawal without KYC must be 403, got %d: %s", w.Code, w.Body.String())
	}
	if body := testutil.ParseJSON(w); body["kyc_status"] != string(models.KYCNotSubmitted) {
		t.Errorf("expected kyc_status not_submitted, got %v", body["kyc_status"])
	}

	// Sudah mengajukan, tetapi masih menunggu tinjauan.
	if code := f.submitKYC(t, kycPayload()); code != http.StatusOK {
		t.Fatalf("submission must be 200, got %d", code)
	}
	wPending := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodPost, "/api/wallet/withdraw",
		map[string]interface{}{"amount": 100000}, f.driverToken))
	if wPending.Code != http.StatusForbidden {
		t.Fatalf("withdrawal while pending must be 403, got %d", wPending.Code)
	}

	var count int64
	f.db.Model(&models.WalletTransaction{}).
		Where("user_id = ? AND type = ?", f.driverID, models.TxTypeWithdrawal).Count(&count)
	if count != 0 {
		t.Error("a blocked withdrawal must not create a transaction")
	}

	var user models.User
	f.db.First(&user, f.driverID)
	if user.Balance != 500000 {
		t.Errorf("balance must be untouched, got %.2f", user.Balance)
	}
}

// TestWithdraw_DriverUsesKYCAccount — setelah KYC disetujui, penarikan berhasil
// dan tujuannya diambil dari berkas KYC.
func TestWithdraw_DriverUsesKYCAccount(t *testing.T) {
	f := newKYCFixture(t, "wdok-")
	setBalance(t, f.db, f.driverID, 500000)

	if code := f.submitKYC(t, kycPayload()); code != http.StatusOK {
		t.Fatalf("submission must be 200, got %d", code)
	}
	if code, body := f.verifyDriver(t); code != http.StatusOK {
		t.Fatalf("approval must be 200, got %d: %v", code, body)
	}

	w := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodPost, "/api/wallet/withdraw",
		map[string]interface{}{"amount": 100000}, f.driverToken))
	if w.Code != http.StatusCreated {
		t.Fatalf("withdrawal must be 201, got %d: %s", w.Code, w.Body.String())
	}

	tx := lastWithdrawal(t, f.db, f.driverID)
	if tx.Status != models.TxStatusPending {
		t.Errorf("withdrawal must sit at PENDING until disbursed, got %q", tx.Status)
	}
	if tx.BankName != "BCA" || tx.BankAccountNumber != "1234567890" || tx.BankAccountName != "Test Driver" {
		t.Errorf("withdrawal must carry the KYC account, got %q %q %q",
			tx.BankName, tx.BankAccountNumber, tx.BankAccountName)
	}

	var user models.User
	f.db.First(&user, f.driverID)
	if user.Balance != 400000 {
		t.Errorf("balance must drop by the requested amount, got %.2f", user.Balance)
	}
}

// TestWithdraw_DriverBodyAccountIsIgnored — inti dari kontrol keamanan bagian
// ini: rekening yang dikirim klien tidak pernah dipakai, bahkan ketika berkas
// KYC juga punya rekening. Sesi driver yang diambil alih karenanya tidak bisa
// mengalihkan dana ke mana pun.
func TestWithdraw_DriverBodyAccountIsIgnored(t *testing.T) {
	f := newKYCFixture(t, "wdhijack-")
	setBalance(t, f.db, f.driverID, 500000)

	if code := f.submitKYC(t, kycPayload()); code != http.StatusOK {
		t.Fatalf("submission must be 200, got %d", code)
	}
	if code, body := f.verifyDriver(t); code != http.StatusOK {
		t.Fatalf("approval must be 200, got %d: %v", code, body)
	}

	w := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodPost, "/api/wallet/withdraw", map[string]interface{}{
			"amount":         100000,
			"bank_name":      "Bank Penyerang",
			"account_number": "6666666666",
			"account_name":   "Penyerang",
		}, f.driverToken))
	if w.Code != http.StatusCreated {
		t.Fatalf("withdrawal must be 201, got %d: %s", w.Code, w.Body.String())
	}

	tx := lastWithdrawal(t, f.db, f.driverID)
	if tx.BankAccountNumber != "1234567890" {
		t.Fatalf("the KYC account must win over the request body, got %q", tx.BankAccountNumber)
	}
	if tx.BankName != "BCA" || tx.BankAccountName != "Test Driver" {
		t.Errorf("bank details must come from KYC, got %q / %q", tx.BankName, tx.BankAccountName)
	}
	if strings.Contains(tx.Note, "6666666666") || strings.Contains(tx.Note, "Penyerang") {
		t.Errorf("the note must not reference the account sent by the client, got %q", tx.Note)
	}
}

// TestWithdraw_DriverBlockedAfterResubmission — mengganti berkas menurunkan
// status kembali ke pending, dan penarikan ikut tertutup sampai ditinjau ulang.
func TestWithdraw_DriverBlockedAfterResubmission(t *testing.T) {
	f := newKYCFixture(t, "wdresubmit-")
	setBalance(t, f.db, f.driverID, 500000)

	if code := f.submitKYC(t, kycPayload()); code != http.StatusOK {
		t.Fatalf("submission must be 200, got %d", code)
	}
	if code, body := f.verifyDriver(t); code != http.StatusOK {
		t.Fatalf("approval must be 200, got %d: %v", code, body)
	}

	changed := kycPayload()
	changed["bank_account_number"] = "7777777777"
	if code := f.submitKYC(t, changed); code != http.StatusOK {
		t.Fatalf("resubmission must be 200, got %d", code)
	}

	w := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodPost, "/api/wallet/withdraw",
		map[string]interface{}{"amount": 100000}, f.driverToken))
	if w.Code != http.StatusForbidden {
		t.Fatalf("withdrawal after changing bank details must be 403, got %d", w.Code)
	}
}

// TestWithdraw_CustomerStillUsesRequestBody — peran tanpa proses KYC tidak boleh
// ikut terkunci dari saldonya sendiri.
func TestWithdraw_CustomerStillUsesRequestBody(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	token := createUserWithRoleAndLoginInDB(t, db, router, "wdcustomer@test.com", models.RoleCustomer)
	customerID := userIDByEmail(t, db, "wdcustomer@test.com")
	setBalance(t, db, customerID, 300000)

	missing := testutil.Do(router, testutil.JSONRequest(
		http.MethodPost, "/api/wallet/withdraw",
		map[string]interface{}{"amount": 50000}, token))
	if missing.Code != http.StatusUnprocessableEntity {
		t.Fatalf("a customer withdrawal without bank details must be 422, got %d", missing.Code)
	}

	w := testutil.Do(router, testutil.JSONRequest(
		http.MethodPost, "/api/wallet/withdraw", map[string]interface{}{
			"amount":         50000,
			"bank_name":      "BNI",
			"account_number": "5566778899",
			"account_name":   "Test Customer",
		}, token))
	if w.Code != http.StatusCreated {
		t.Fatalf("customer withdrawal must be 201, got %d: %s", w.Code, w.Body.String())
	}

	tx := lastWithdrawal(t, db, customerID)
	if tx.BankAccountNumber != "5566778899" || tx.BankName != "BNI" {
		t.Errorf("customer bank details must come from the body, got %q / %q",
			tx.BankName, tx.BankAccountNumber)
	}
}
