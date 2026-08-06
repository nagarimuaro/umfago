package handlers

import (
	"errors"
	"fmt"
	"log"
	"net/http"

	"openjek-backend/internal/models"
	"openjek-backend/internal/payment"
	"openjek-backend/internal/repository"
	ws "openjek-backend/internal/websocket"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type WebhookHandler struct {
	db          *gorm.DB
	midtransSvc *payment.MidtransService
	wallet      *repository.WalletRepository
	hub         *ws.Hub
	notif       *repository.NotificationRepository
}

func NewWebhookHandler(
	db *gorm.DB,
	midtransSvc *payment.MidtransService,
	wallet *repository.WalletRepository,
	hub *ws.Hub,
	notif *repository.NotificationRepository,
) *WebhookHandler {
	return &WebhookHandler{
		db:          db,
		midtransSvc: midtransSvc,
		wallet:      wallet,
		hub:         hub,
		notif:       notif,
	}
}

// MidtransNotification — struktur notifikasi dari Midtrans
type MidtransNotification struct {
	TransactionStatus string `json:"transaction_status"`
	OrderID           string `json:"order_id"`
	StatusCode        string `json:"status_code"`
	GrossAmount       string `json:"gross_amount"`
	SignatureKey      string `json:"signature_key"`
	FraudStatus       string `json:"fraud_status"`
	PaymentType       string `json:"payment_type"`
}

// HandleMidtransWebhook — POST /webhook/midtrans (public, no JWT)
//
// Midtrans menjamin notifikasi terkirim minimal sekali, bukan tepat sekali:
// satu pembayaran bisa memicu beberapa notifikasi. Karena itu penyelesaian
// transaksi dikerjakan lewat SettlePending, yang mengunci baris transaksi dan
// menolak memproses ulang transaksi yang sudah selesai.
func (h *WebhookHandler) HandleMidtransWebhook(c *gin.Context) {
	if h.midtransSvc == nil {
		// Tanpa server key, tanda tangan tidak bisa diverifikasi. Menerima
		// notifikasi tanpa verifikasi berarti siapa pun bisa menambah saldo
		// sendiri hanya dengan mengirim satu request.
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Payment webhook is not configured"})
		return
	}

	var notif MidtransNotification
	if err := c.ShouldBindJSON(&notif); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification payload"})
		return
	}

	// 1. Verifikasi Signature Key untuk memastikan notifikasi dari Midtrans
	if !h.midtransSvc.VerifySignatureKey(notif.OrderID, notif.StatusCode, notif.GrossAmount, notif.SignatureKey) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid signature key"})
		return
	}

	// 2. Cari transaksi yang sesuai
	var walletTx models.WalletTransaction
	if err := h.db.Where("midtrans_order_id = ?", notif.OrderID).First(&walletTx).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	// 3. Tentukan hasil akhir berdasarkan status dari Midtrans
	var success bool
	switch notif.TransactionStatus {
	case "settlement", "capture":
		// Untuk kartu kredit, status capture masih bisa ditolak sistem fraud
		success = notif.FraudStatus != "deny"
	case "expire", "cancel", "deny", "failure":
		success = false
	default:
		// Status lain (pending, authorize) — belum final, tidak diproses
		c.JSON(http.StatusOK, gin.H{"message": "Status noted, no action required"})
		return
	}

	var settled *models.WalletTransaction
	err := h.db.Transaction(func(tx *gorm.DB) error {
		var err error
		settled, err = h.wallet.SettlePending(tx, walletTx.ID, success)
		return err
	})

	if errors.Is(err, repository.ErrAlreadySettled) {
		// Notifikasi ulang untuk transaksi yang sudah selesai. Balas 200 agar
		// Midtrans berhenti mengirim ulang.
		c.JSON(http.StatusOK, gin.H{"message": "Already processed"})
		return
	}
	if err != nil {
		log.Printf("[Webhook] Failed to settle midtrans order %s: %v", notif.OrderID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to settle transaction"})
		return
	}

	if success && h.hub != nil {
		h.hub.SendToUser(settled.UserID, ws.Message{
			Type:    "balance_updated",
			Payload: []byte(`{"message":"Top up berhasil, saldo Anda telah diperbarui."}`),
		})
	}

	if success && h.notif != nil {
		h.notif.Push(settled.UserID, models.NotifWalletTopUp,
			"Top up berhasil",
			fmt.Sprintf("Saldo Anda bertambah %.0f", settled.Amount),
			map[string]any{"transaction_id": settled.ID})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Webhook processed successfully"})
}
