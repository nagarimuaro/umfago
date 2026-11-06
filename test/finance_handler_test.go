package test

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	"openjek-backend/internal/models"
	"openjek-backend/internal/testutil"
)

func TestFinance_Report(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	adminToken := createUserWithRoleAndLoginInDB(t, db, router, "fin_rep_admin@test.com", models.RoleSuperAdmin)

	// Buat transaksi sukses agar bucket terisi
	db.Create(&models.WalletTransaction{
		UserID:    1,
		Amount:    10000,
		Type:      models.TxTypeDeposit,
		Status:    models.TxStatusSuccess,
		CreatedAt: time.Now(),
	})

	w := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/admin/finance/report", nil, adminToken))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 for finance report, got %d: %s", w.Code, w.Body.String())
	}

	body := testutil.ParseJSON(w)
	if body["orders"] == nil {
		t.Error("expected orders stats in finance report")
	}
	if body["wallet_by_type"] == nil {
		t.Error("expected wallet_by_type in finance report")
	}
}

func TestFinance_DisburseAndDoubleDisburse(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	adminToken := createUserWithRoleAndLoginInDB(t, db, router, "fin_admin@test.com", models.RoleSuperAdmin)
	_ = createUserWithRoleAndLoginInDB(t, db, router, "driver_wd@test.com", models.RoleDriverMotorcycle)

	var driver models.User
	db.Where("email = ?", "driver_wd@test.com").First(&driver)

	// Buat pending withdrawal
	wdTx := models.WalletTransaction{
		UserID:    driver.ID,
		Amount:    50000,
		Type:      models.TxTypeWithdrawal,
		Status:    models.TxStatusPending,
		Note:      "BCA 123456789 a/n Driver WD",
		CreatedAt: time.Now(),
	}
	db.Create(&wdTx)

	// 1. Disburse sukses
	url := fmt.Sprintf("/api/admin/finance/withdrawals/%d/disburse", wdTx.ID)
	w := testutil.Do(router, testutil.JSONRequest(http.MethodPut, url, map[string]string{
		"note": "Transfer sukses via Flip",
	}, adminToken))

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 for disburse, got %d: %s", w.Code, w.Body.String())
	}

	// 2. Disburse kedua kali harus ditolak (409 Conflict)
	wDuplicate := testutil.Do(router, testutil.JSONRequest(http.MethodPut, url, nil, adminToken))
	if wDuplicate.Code != http.StatusConflict {
		t.Errorf("expected 409 Conflict on already settled withdrawal, got %d", wDuplicate.Code)
	}
}

func TestFinance_RejectWithdrawal(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	adminToken := createUserWithRoleAndLoginInDB(t, db, router, "fin_reject_admin@test.com", models.RoleSuperAdmin)
	_ = createUserWithRoleAndLoginInDB(t, db, router, "driver_reject@test.com", models.RoleDriverMotorcycle)

	var driver models.User
	db.Where("email = ?", "driver_reject@test.com").First(&driver)

	wdTx := models.WalletTransaction{
		UserID:    driver.ID,
		Amount:    75000,
		Type:      models.TxTypeWithdrawal,
		Status:    models.TxStatusPending,
		Note:      "Mandiri 987654321 a/n Driver Reject",
		CreatedAt: time.Now(),
	}
	db.Create(&wdTx)

	url := fmt.Sprintf("/api/admin/finance/withdrawals/%d/reject", wdTx.ID)
	w := testutil.Do(router, testutil.JSONRequest(http.MethodPut, url, map[string]string{
		"reason": "Nomor rekening tidak cocok dengan nama pemilik",
	}, adminToken))

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 for reject withdrawal, got %d: %s", w.Code, w.Body.String())
	}

	var after models.WalletTransaction
	db.First(&after, wdTx.ID)
	if after.Status != models.TxStatusFailed {
		t.Errorf("expected transaction status failed, got %s", after.Status)
	}
}
