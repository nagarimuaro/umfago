package handlers_test

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
}
