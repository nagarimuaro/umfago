package handlers_test

import (
	"errors"
	"net/http"
	"testing"

	"openjek-backend/internal/models"
	"openjek-backend/internal/repository"
	"openjek-backend/internal/testutil"

	"gorm.io/gorm"
)

// TestWebhook_SettlementIsIdempotent — notifikasi pembayaran dikirim ulang oleh
// payment gateway saat balasan pertama tidak sampai. Penyelesaian transaksi
// karenanya harus hanya sekali; tanpa itu, satu top up bisa menambah saldo
// berkali-kali.
func TestWebhook_SettlementIsIdempotent(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	createUserWithRoleAndLoginInDB(t, db, router, "webhook_user@test.com", models.RoleCustomer)

	var user models.User
	db.Where("email = ?", "webhook_user@test.com").First(&user)

	midtransOrderID := "TOPUP-TEST-WEBHOOK"
	walletTx := models.WalletTransaction{
		UserID:          user.ID,
		Amount:          100000,
		Type:            models.TxTypeDeposit,
		Status:          models.TxStatusPending,
		MidtransOrderID: &midtransOrderID,
		Note:            "Test deposit",
	}
	if err := db.Create(&walletTx).Error; err != nil {
		t.Fatal("failed to create pending transaction:", err)
	}

	walletRepo := repository.NewWalletRepository()

	settle := func() error {
		return db.Transaction(func(tx *gorm.DB) error {
			_, err := walletRepo.SettlePending(tx, walletTx.ID, true)
			return err
		})
	}

	if err := settle(); err != nil {
		t.Fatalf("first settlement should succeed: %v", err)
	}

	// Pengiriman ulang notifikasi yang sama
	err := settle()
	if !errors.Is(err, repository.ErrAlreadySettled) {
		t.Fatalf("expected ErrAlreadySettled on replay, got %v", err)
	}

	var updatedUser models.User
	db.First(&updatedUser, user.ID)
	if updatedUser.Balance != 100000 {
		t.Errorf("expected balance 100000 after one settlement, got %f", updatedUser.Balance)
	}

	var updatedTx models.WalletTransaction
	db.Where("midtrans_order_id = ?", midtransOrderID).First(&updatedTx)
	if updatedTx.Status != models.TxStatusSuccess {
		t.Errorf("expected transaction status SUCCESS, got %s", updatedTx.Status)
	}
	if updatedTx.BalanceAfter != 100000 {
		t.Errorf("expected balance_after 100000, got %f", updatedTx.BalanceAfter)
	}
}

// TestWebhook_FailedSettlementKeepsBalance — notifikasi gagal/expired tidak
// boleh menambah saldo.
func TestWebhook_FailedSettlementKeepsBalance(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	createUserWithRoleAndLoginInDB(t, db, router, "webhook_failed@test.com", models.RoleCustomer)

	var user models.User
	db.Where("email = ?", "webhook_failed@test.com").First(&user)

	midtransOrderID := "TOPUP-TEST-FAILED"
	walletTx := models.WalletTransaction{
		UserID:          user.ID,
		Amount:          75000,
		Type:            models.TxTypeDeposit,
		Status:          models.TxStatusPending,
		MidtransOrderID: &midtransOrderID,
	}
	db.Create(&walletTx)

	err := db.Transaction(func(tx *gorm.DB) error {
		_, err := repository.NewWalletRepository().SettlePending(tx, walletTx.ID, false)
		return err
	})
	if err != nil {
		t.Fatalf("settling a failed payment should not error: %v", err)
	}

	var updatedUser models.User
	db.First(&updatedUser, user.ID)
	if updatedUser.Balance != 0 {
		t.Errorf("expected balance to stay 0 on failed payment, got %f", updatedUser.Balance)
	}

	var updatedTx models.WalletTransaction
	db.First(&updatedTx, walletTx.ID)
	if updatedTx.Status != models.TxStatusFailed {
		t.Errorf("expected status FAILED, got %s", updatedTx.Status)
	}
}

// TestWebhook_RejectedWithoutSignatureVerification — tanpa Midtrans server key,
// webhook tidak bisa memverifikasi tanda tangan. Menerimanya berarti siapa pun
// bisa mengisi saldo sendiri, jadi endpoint harus menolak.
func TestWebhook_RejectedWithoutSignatureVerification(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	w := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/webhook/midtrans", map[string]interface{}{
		"order_id":           "TOPUP-1-abcdef",
		"transaction_status": "settlement",
		"status_code":        "200",
		"gross_amount":       "100000.00",
		"signature_key":      "irrelevant",
	}, ""))

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 when signature cannot be verified, got %d: %s", w.Code, w.Body.String())
	}
}

// TestWallet_DepositSimulationMode — tanpa key Midtrans, deposit langsung selesai
// sehingga alur pengembangan tetap bisa diuji.
func TestWallet_DepositSimulationMode(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	token := createUserWithRoleAndLoginInDB(t, db, router, "simulasi@test.com", models.RoleCustomer)

	w := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/wallet/deposit", map[string]interface{}{
		"amount": 50000.0,
	}, token))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for simulation deposit, got %d: %s", w.Code, w.Body.String())
	}

	body := testutil.ParseJSON(w)
	if body["message"] != "Deposit successful (simulation mode)" {
		t.Errorf("unexpected message in simulation mode: %v", body["message"])
	}
	if body["new_balance"] != 50000.0 {
		t.Errorf("expected new_balance 50000, got %v", body["new_balance"])
	}
}
