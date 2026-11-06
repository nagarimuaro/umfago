package test

import (
	"net/http"
	"testing"

	"openjek-backend/internal/models"
	"openjek-backend/internal/testutil"
)

func TestWalletHandler_Deposit(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	token := createUserWithRoleAndLoginInDB(t, db, router, "user_wallet@test.com", models.RoleCustomer)

	payload := map[string]interface{}{
		"amount": 50000.0,
		"method": "bank_transfer",
	}

	w := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/wallet/deposit", payload, token))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", w.Code, w.Body.String())
	}

	body := testutil.ParseJSON(w)
	if body["message"] != "Deposit successful (simulation mode)" {
		t.Errorf("unexpected message: %v", body["message"])
	}

	// Cek saldo user di database
	var user models.User
	db.Where("email = ?", "user_wallet@test.com").First(&user)
	if user.Balance != 50000.0 {
		t.Errorf("expected balance to be 50000, got %f", user.Balance)
	}

	// ── Test History ──
	wHist := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/wallet/history", nil, token))
	if wHist.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for history, got %d", wHist.Code)
	}

	histBody := testutil.ParseJSON(wHist)
	transactions, ok := histBody["transactions"].([]interface{})
	if !ok || len(transactions) != 1 {
		t.Fatalf("expected 1 transaction in history, got %v", histBody["transactions"])
	}

	txData := transactions[0].(map[string]interface{})
	if txData["type"] != string(models.TxTypeDeposit) || txData["amount"].(float64) != 50000.0 {
		t.Errorf("unexpected transaction data: %v", txData)
	}

	// ── Test GetBalance ──
	wBal := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/wallet", nil, token))
	if wBal.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for balance, got %d", wBal.Code)
	}
	balBody := testutil.ParseJSON(wBal)
	if balBody["balance"].(float64) != 50000.0 || balBody["currency"] != "IDR" {
		t.Errorf("unexpected balance data: %v", balBody)
	}

	// ── Test Withdraw: Insufficient Balance ──
	failWithdraw := map[string]interface{}{
		"amount":         90000.0,
		"bank_name":      "BCA",
		"account_number": "1234567890",
		"account_name":   "User Wallet",
	}
	wFail := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/wallet/withdraw", failWithdraw, token))
	if wFail.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request, got %d", wFail.Code)
	}

	// ── Test Withdraw: Success ──
	okWithdraw := map[string]interface{}{
		"amount":         20000.0,
		"bank_name":      "BCA",
		"account_number": "1234567890",
		"account_name":   "User Wallet",
	}
	wOk := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/wallet/withdraw", okWithdraw, token))
	if wOk.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created for withdraw, got %d: %s", wOk.Code, wOk.Body.String())
	}

	// Verifikasi saldo berkurang
	wBalAfter := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/wallet", nil, token))
	balAfterBody := testutil.ParseJSON(wBalAfter)
	if balAfterBody["balance"].(float64) != 30000.0 {
		t.Errorf("expected balance after withdraw to be 30000, got %v", balAfterBody["balance"])
	}

	// ── Test Transfer Antar User ──
	tokenRecipient := createUserWithRoleAndLoginInDB(t, db, router, "recipient@test.com", models.RoleCustomer)
	_ = tokenRecipient

	// Transfer sukses ke recipient@test.com
	transferReq := map[string]interface{}{
		"recipient": "recipient@test.com",
		"amount":    15000.0,
		"note":      "Uang jajan",
	}
	wTransfer := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/wallet/transfer", transferReq, token))
	if wTransfer.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for transfer, got %d: %s", wTransfer.Code, wTransfer.Body.String())
	}

	// Cek saldo sender berkurang 15000 (sisa 15000)
	var senderUser models.User
	db.Where("email = ?", "user_wallet@test.com").First(&senderUser)
	if senderUser.Balance != 15000.0 {
		t.Errorf("expected sender balance to be 15000, got %f", senderUser.Balance)
	}

	// Cek saldo recipient bertambah 15000
	var recipientUser models.User
	db.Where("email = ?", "recipient@test.com").First(&recipientUser)
	if recipientUser.Balance != 15000.0 {
		t.Errorf("expected recipient balance to be 15000, got %f", recipientUser.Balance)
	}

	// Transfer ke akun sendiri ditolak
	selfTransfer := map[string]interface{}{
		"recipient": "user_wallet@test.com",
		"amount":    10000.0,
	}
	wSelf := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/wallet/transfer", selfTransfer, token))
	if wSelf.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for self-transfer, got %d", wSelf.Code)
	}

	// Pembayaran PPOB sukses (Pulsa Rp 10.000)
	ppobReq := map[string]interface{}{
		"service":      "PULSA",
		"customer_no":  "081234567890",
		"amount":       10000.0,
		"product_name": "Pulsa Telkomsel 10rb",
	}
	wPPOB := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/wallet/ppob", ppobReq, token))
	if wPPOB.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for PPOB pay, got %d: %s", wPPOB.Code, wPPOB.Body.String())
	}

	// Cek saldo berkurang dari 15000 menjadi 5000
	db.Where("email = ?", "user_wallet@test.com").First(&senderUser)
	if senderUser.Balance != 5000.0 {
		t.Errorf("expected balance 5000 after PPOB, got %f", senderUser.Balance)
	}

	// Pembayaran PPOB gagal karena saldo tidak mencukupi (Rp 20.000 > Rp 5.000)
	ppobFailReq := map[string]interface{}{
		"service":      "PLN",
		"customer_no":  "512345678901",
		"amount":       20000.0,
		"product_name": "Token Listrik 20rb",
	}
	wPPOBFail := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/wallet/ppob", ppobFailReq, token))
	if wPPOBFail.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for insufficient balance PPOB, got %d", wPPOBFail.Code)
	}
}
