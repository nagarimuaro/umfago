package test

import (
	"crypto/sha512"
	"fmt"
	"testing"

	"openjek-backend/internal/payment"
)

func TestMidtrans_VerifySignatureKey(t *testing.T) {
	serverKey := "SB-Mid-server-test-key-12345"
	svc := payment.NewMidtransService(serverKey, false)

	orderID := "ORDER-WALLET-DEP-100"
	statusCode := "200"
	grossAmount := "50000.00"

	// Hitung expected SHA512: order_id + status_code + gross_amount + server_key
	raw := orderID + statusCode + grossAmount + serverKey
	hash := sha512.Sum512([]byte(raw))
	validSignature := fmt.Sprintf("%x", hash)

	// 1. Signature valid harus true
	if !svc.VerifySignatureKey(orderID, statusCode, grossAmount, validSignature) {
		t.Error("expected valid signature to be verified successfully")
	}

	// 2. Signature salah harus false
	if svc.VerifySignatureKey(orderID, statusCode, grossAmount, "invalid-signature-hash") {
		t.Error("expected invalid signature to be rejected")
	}

	// 3. Amount diubah (tampered) harus false
	if svc.VerifySignatureKey(orderID, statusCode, "100000.00", validSignature) {
		t.Error("expected tampered amount to fail signature verification")
	}

	// 4. Status code diubah harus false
	if svc.VerifySignatureKey(orderID, "201", grossAmount, validSignature) {
		t.Error("expected tampered status code to fail signature verification")
	}
}

