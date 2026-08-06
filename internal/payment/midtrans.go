package payment

import (
	"crypto/sha512"
	"fmt"
	"log"

	"github.com/midtrans/midtrans-go"
	"github.com/midtrans/midtrans-go/snap"
)

// MidtransService — wrapper untuk Midtrans Snap API
type MidtransService struct {
	serverKey    string
	isProduction bool
	snapClient   snap.Client
}

// NewMidtransService — membuat instance MidtransService
func NewMidtransService(serverKey string, isProduction bool) *MidtransService {
	env := midtrans.Sandbox
	if isProduction {
		env = midtrans.Production
	}

	var sc snap.Client
	sc.New(serverKey, env)

	envName := "Sandbox"
	if isProduction {
		envName = "Production"
	}
	log.Printf("[Midtrans] Initialized in %s mode", envName)

	return &MidtransService{
		serverKey:    serverKey,
		isProduction: isProduction,
		snapClient:   sc,
	}
}

// SnapResult — hasil dari pembuatan transaksi Snap
type SnapResult struct {
	Token       string `json:"snap_token"`
	RedirectURL string `json:"redirect_url"`
}

// CreateSnapTransaction — membuat transaksi Snap di Midtrans
func (m *MidtransService) CreateSnapTransaction(orderID string, grossAmount int64, customerName, email string) (*SnapResult, error) {
	req := &snap.Request{
		TransactionDetails: midtrans.TransactionDetails{
			OrderID:  orderID,
			GrossAmt: grossAmount,
		},
		CustomerDetail: &midtrans.CustomerDetails{
			FName: customerName,
			Email: email,
		},
		EnabledPayments: []snap.SnapPaymentType{
			snap.PaymentTypeBCAVA,
			snap.PaymentTypeBNIVA,
			snap.PaymentTypeBRIVA,
			snap.PaymentTypePermataVA,
			snap.PaymentTypeGopay,
			snap.PaymentTypeShopeepay,
			snap.PaymentTypeCreditCard,
		},
	}

	snapResp, err := m.snapClient.CreateTransaction(req)
	if err != nil {
		return nil, fmt.Errorf("midtrans create transaction error: %w", err)
	}

	return &SnapResult{
		Token:       snapResp.Token,
		RedirectURL: snapResp.RedirectURL,
	}, nil
}

// VerifySignatureKey — verifikasi tanda tangan notifikasi dari Midtrans
// SHA512(order_id + status_code + gross_amount + server_key)
func (m *MidtransService) VerifySignatureKey(orderID, statusCode, grossAmount, incomingSignature string) bool {
	raw := orderID + statusCode + grossAmount + m.serverKey
	hash := sha512.Sum512([]byte(raw))
	expected := fmt.Sprintf("%x", hash)
	return expected == incomingSignature
}
