package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"openjek-backend/internal/middleware"
	"openjek-backend/internal/models"
	"openjek-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// FinanceHandler — endpoint keuangan back-office
type FinanceHandler struct {
	db     *gorm.DB
	wallet *repository.WalletRepository
	notif  *repository.NotificationRepository
}

func NewFinanceHandler(
	db *gorm.DB,
	wallet *repository.WalletRepository,
	notif *repository.NotificationRepository,
) *FinanceHandler {
	return &FinanceHandler{db: db, wallet: wallet, notif: notif}
}

// parseDateRange — baca rentang tanggal dari query string.
// Bila tidak diisi, rentangnya adalah 30 hari terakhir.
func parseDateRange(c *gin.Context) (from, to time.Time) {
	const layout = "2006-01-02"
	to = time.Now()
	from = to.AddDate(0, 0, -30)

	if raw := c.Query("from"); raw != "" {
		if t, err := time.Parse(layout, raw); err == nil {
			from = t
		}
	}
	if raw := c.Query("to"); raw != "" {
		if t, err := time.Parse(layout, raw); err == nil {
			// Sertakan seluruh hari terakhir, bukan hanya pukul 00:00.
			to = t.Add(24*time.Hour - time.Nanosecond)
		}
	}
	return from, to
}

// Report — GET /api/admin/finance/report
func (h *FinanceHandler) Report(c *gin.Context) {
	from, to := parseDateRange(c)

	var orderStats struct {
		TotalOrders   int64
		GrossRevenue  float64
		PlatformFee   float64
		DriverEarning float64
	}
	if err := h.db.Model(&models.Order{}).
		Select(`COUNT(*) AS total_orders,
		        COALESCE(SUM(fare_amount), 0) AS gross_revenue,
		        COALESCE(SUM(platform_fee), 0) AS platform_fee,
		        COALESCE(SUM(driver_earning), 0) AS driver_earning`).
		Where("status = ? AND completed_at BETWEEN ? AND ?", models.StatusCompleted, from, to).
		Scan(&orderStats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to build finance report"})
		return
	}

	// Rekap per jenis transaksi dompet, supaya top up, refund, dan pencairan
	// bisa dilihat terpisah tanpa query tambahan.
	type txBucket struct {
		Type  models.TransactionType `json:"type"`
		Count int64                  `json:"count"`
		Total float64                `json:"total"`
	}
	var buckets []txBucket
	if err := h.db.Model(&models.WalletTransaction{}).
		Select("type, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total").
		Where("status = ? AND created_at BETWEEN ? AND ?", models.TxStatusSuccess, from, to).
		Group("type").Scan(&buckets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to build finance report"})
		return
	}

	var pendingWithdrawal float64
	h.db.Model(&models.WalletTransaction{}).
		Where("type = ? AND status = ?", models.TxTypeWithdrawal, models.TxStatusPending).
		Select("COALESCE(SUM(amount), 0)").Scan(&pendingWithdrawal)

	c.JSON(http.StatusOK, gin.H{
		"range": gin.H{"from": from, "to": to},
		"orders": gin.H{
			"total":          orderStats.TotalOrders,
			"gross_revenue":  orderStats.GrossRevenue,
			"platform_fee":   orderStats.PlatformFee,
			"driver_earning": orderStats.DriverEarning,
		},
		"wallet_by_type":     buckets,
		"pending_withdrawal": pendingWithdrawal,
	})
}

// ListWithdrawals — GET /api/admin/finance/withdrawals
func (h *FinanceHandler) ListWithdrawals(c *gin.Context) {
	status := c.DefaultQuery("status", string(models.TxStatusPending))

	scoped := func() *gorm.DB {
		return h.db.Model(&models.WalletTransaction{}).
			Where("type = ? AND status = ?", models.TxTypeWithdrawal, status)
	}

	var total int64
	if err := scoped().Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch withdrawals"})
		return
	}

	page, perPage, offset := paginate(c)

	var items []models.WalletTransaction
	if err := scoped().Order("created_at asc").Limit(perPage).Offset(offset).
		Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch withdrawals"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"withdrawals": items,
		"meta":        gin.H{"page": page, "per_page": perPage, "total": total},
	})
}

// Disburse — PUT /api/admin/finance/withdrawals/:id/disburse
//
// Saldo sudah dipotong saat pengajuan, jadi di sini yang berubah hanya status
// menjadi DISBURSED. Baris dikunci dan statusnya dicek ulang agar satu
// pengajuan tidak bisa dicairkan dua kali oleh dua petugas sekaligus.
func (h *FinanceHandler) Disburse(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}

	var req struct {
		Note string `json:"note"`
	}
	_ = c.ShouldBindJSON(&req)

	actorID := c.GetUint(middleware.UserIDKey)

	var payee uint
	var amount float64

	err := h.db.Transaction(func(tx *gorm.DB) error {
		var entry models.WalletTransaction
		if err := tx.Clauses(lockForUpdate()).First(&entry, id).Error; err != nil {
			return err
		}
		if entry.Type != models.TxTypeWithdrawal || entry.Status != models.TxStatusPending {
			return repository.ErrAlreadySettled
		}

		note := entry.Note
		if req.Note != "" {
			note = note + " | " + req.Note
		}

		payee, amount = entry.UserID, entry.Amount

		return tx.Model(&entry).Updates(map[string]interface{}{
			"status": models.TxStatusSuccess,
			"type":   models.TxTypeDisbursed,
			"note":   note,
			"ref_id": "disbursed_by:" + uintToString(actorID),
		}).Error
	})

	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "Withdrawal not found"})
		return
	case errors.Is(err, repository.ErrAlreadySettled):
		c.JSON(http.StatusConflict, gin.H{"error": "Withdrawal is not pending"})
		return
	case err != nil:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to disburse"})
		return
	}

	if h.notif != nil {
		h.notif.Push(payee, models.NotifWithdrawalDisbursed,
			"Penarikan dicairkan",
			fmt.Sprintf("Penarikan sebesar %.0f sudah dikirim ke rekening Anda.", amount),
			map[string]any{"transaction_id": id, "amount": amount})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Withdrawal disbursed"})
}

// RejectWithdrawal — PUT /api/admin/finance/withdrawals/:id/reject
//
// Pengajuan yang ditolak mengembalikan dana ke saldo user, karena saldo sudah
// dipotong sejak pengajuan dibuat.
func (h *FinanceHandler) RejectWithdrawal(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	var payee uint
	var amount float64

	err := h.db.Transaction(func(tx *gorm.DB) error {
		var entry models.WalletTransaction
		if err := tx.Clauses(lockForUpdate()).First(&entry, id).Error; err != nil {
			return err
		}
		if entry.Type != models.TxTypeWithdrawal || entry.Status != models.TxStatusPending {
			return repository.ErrAlreadySettled
		}

		if err := tx.Model(&entry).Updates(map[string]interface{}{
			"status": models.TxStatusFailed,
			"note":   entry.Note + " | Ditolak: " + req.Reason,
		}).Error; err != nil {
			return err
		}

		payee, amount = entry.UserID, entry.Amount

		_, err := h.wallet.Credit(tx, repository.Entry{
			UserID: entry.UserID,
			Amount: entry.Amount,
			Type:   models.TxTypeRefund,
			RefID:  "withdrawal_reject",
			Note:   "Pengembalian penarikan yang ditolak: " + req.Reason,
		})
		return err
	})

	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "Withdrawal not found"})
		return
	case errors.Is(err, repository.ErrAlreadySettled):
		c.JSON(http.StatusConflict, gin.H{"error": "Withdrawal is not pending"})
		return
	case err != nil:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject withdrawal"})
		return
	}

	if h.notif != nil {
		h.notif.Push(payee, models.NotifWithdrawalRejected,
			"Penarikan ditolak",
			fmt.Sprintf("Penarikan sebesar %.0f ditolak: %s", amount, req.Reason),
			map[string]any{"transaction_id": id, "amount": amount})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Withdrawal rejected and balance returned"})
}

// Refund — POST /api/admin/finance/refund
//
// Pengembalian dana manual ke customer, misalnya untuk keluhan yang ditangani
// customer service.
func (h *FinanceHandler) Refund(c *gin.Context) {
	var req struct {
		UserID    uint    `json:"user_id" binding:"required"`
		Amount    float64 `json:"amount" binding:"required,gt=0"`
		OrderUUID string  `json:"order_uuid"`
		Reason    string  `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	actorID := c.GetUint(middleware.UserIDKey)

	var entry *models.WalletTransaction
	err := h.db.Transaction(func(tx *gorm.DB) error {
		var err error
		entry, err = h.wallet.Credit(tx, repository.Entry{
			UserID:    req.UserID,
			Amount:    req.Amount,
			Type:      models.TxTypeRefund,
			OrderUUID: req.OrderUUID,
			RefID:     "refund_by:" + uintToString(actorID),
			Note:      "Refund manual: " + req.Reason,
		})
		return err
	})

	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process refund"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Refund processed", "transaction": entry})
}
