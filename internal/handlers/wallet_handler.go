package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"openjek-backend/internal/middleware"
	"openjek-backend/internal/models"
	"openjek-backend/internal/payment"
	"openjek-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WalletHandler struct {
	db          *gorm.DB
	midtransSvc *payment.MidtransService
	wallet      *repository.WalletRepository
}

func NewWalletHandler(db *gorm.DB, midtransSvc *payment.MidtransService, wallet *repository.WalletRepository) *WalletHandler {
	return &WalletHandler{db: db, midtransSvc: midtransSvc, wallet: wallet}
}

// GetBalance — GET /api/wallet
func (h *WalletHandler) GetBalance(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)

	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"balance":  user.Balance,
		"currency": "IDR",
	})
}

// Deposit — Inisiasi Top Up Saldo via Midtrans Snap
func (h *WalletHandler) Deposit(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)

	var req struct {
		Amount float64 `json:"amount" binding:"required,gt=0"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	// Midtrans hanya menerima rupiah bulat, jadi pecahan ditolak di sini
	// daripada dibulatkan diam-diam dan membuat saldo tidak cocok dengan tagihan.
	if req.Amount != float64(int64(req.Amount)) {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "amount must be a whole number of rupiah"})
		return
	}

	// Ambil data user untuk keperluan detail transaksi Midtrans
	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Buat Midtrans Order ID yang unik
	midtransOrderID := fmt.Sprintf("TOPUP-%d-%s", userID, uuid.New().String()[:8])
	grossAmount := int64(req.Amount)

	// 1. Buat WalletTransaction dengan status PENDING dulu.
	// Saldo baru bertambah setelah notifikasi pembayaran diverifikasi.
	walletTx := models.WalletTransaction{
		UserID:          userID,
		Amount:          req.Amount,
		Type:            models.TxTypeDeposit,
		Status:          models.TxStatusPending,
		MidtransOrderID: &midtransOrderID,
		Note:            "Top up via Midtrans",
	}

	if err := h.db.Create(&walletTx).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create transaction record"})
		return
	}

	// 2. Panggil Midtrans Snap untuk mendapatkan payment token
	if h.midtransSvc != nil {
		snapResult, err := h.midtransSvc.CreateSnapTransaction(midtransOrderID, grossAmount, user.Name, user.Email)
		if err != nil {
			// Jika Midtrans error, tandai transaksi sebagai FAILED
			h.db.Model(&walletTx).Update("status", models.TxStatusFailed)
			c.JSON(http.StatusBadGateway, gin.H{
				"error":   "Failed to create payment transaction",
				"details": err.Error(),
			})
			return
		}

		// Simpan snap token ke transaksi
		h.db.Model(&walletTx).Update("midtrans_token", snapResult.Token)

		c.JSON(http.StatusCreated, gin.H{
			"message":           "Payment created. Please complete payment.",
			"midtrans_order_id": midtransOrderID,
			"snap_token":        snapResult.Token,
			"redirect_url":      snapResult.RedirectURL,
		})
		return
	}

	// Mode simulasi (dev/test tanpa Midtrans key) — langsung diselesaikan
	var settled *models.WalletTransaction
	err := h.db.Transaction(func(tx *gorm.DB) error {
		var err error
		settled, err = h.wallet.SettlePending(tx, walletTx.ID, true)
		return err
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to settle deposit"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Deposit successful (simulation mode)",
		"new_balance": settled.BalanceAfter,
		"transaction": settled,
	})
}

// Withdraw — POST /api/wallet/withdraw
//
// Saldo langsung dipotong dan transaksi dicatat sebagai PENDING sampai bagian
// keuangan mencairkannya. Memotong di awal mencegah saldo yang sama diajukan
// untuk dua penarikan sekaligus.
//
// Untuk driver, rekening tujuan TIDAK pernah diambil dari permintaan HTTP.
// Rekening yang dipakai adalah rekening yang sudah diverifikasi bersama berkas
// KYC-nya. Tanpa aturan ini, sesi driver yang diambil alih bisa mengalirkan
// seluruh saldo ke rekening mana pun, dan tim keuangan tidak punya dasar untuk
// menolaknya. Peran lain belum punya proses KYC, jadi tetap mengirim rekening
// pada badan permintaan.
func (h *WalletHandler) Withdraw(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)
	role := models.RoleCode(c.GetString(middleware.UserRoleKey))

	var req struct {
		Amount        float64 `json:"amount" binding:"required,gt=0"`
		BankName      string  `json:"bank_name"`
		AccountNumber string  `json:"account_number"`
		AccountName   string  `json:"account_name"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	bankName, accountNumber, accountName := req.BankName, req.AccountNumber, req.AccountName

	if models.IsDriverRole(role) {
		var profile models.DriverProfile
		err := h.db.Where("user_id = ?", userID).First(&profile).Error
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load driver profile"})
			return
		}
		if err != nil || !profile.IsKYCApproved() {
			c.JSON(http.StatusForbidden, gin.H{
				"error":      "Complete driver KYC verification before withdrawing",
				"kyc_status": kycStatusOf(&profile, err == nil),
			})
			return
		}
		if !profile.HasPayoutAccount() {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "No verified payout account on your KYC record",
			})
			return
		}

		// Nilai dari badan permintaan sengaja dibuang di sini, bukan dipakai
		// sebagai cadangan.
		bankName = profile.BankName
		accountNumber = profile.BankAccountNumber
		accountName = profile.BankAccountName
	} else if bankName == "" || accountNumber == "" || accountName == "" {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": "bank_name, account_number, and account_name are required",
		})
		return
	}

	var entry *models.WalletTransaction
	err := h.db.Transaction(func(tx *gorm.DB) error {
		var err error
		entry, err = h.wallet.Debit(tx, repository.Entry{
			UserID: userID,
			Amount: req.Amount,
			Type:   models.TxTypeWithdrawal,
			Note: fmt.Sprintf("Penarikan ke %s %s a.n. %s",
				bankName, accountNumber, accountName),
		})
		if err != nil {
			return err
		}
		// Status diturunkan ke PENDING: dana sudah keluar dari saldo, tapi
		// belum benar-benar dicairkan ke rekening tujuan.
		return tx.Model(entry).Updates(map[string]interface{}{
			"status":              models.TxStatusPending,
			"bank_name":           bankName,
			"bank_account_number": accountNumber,
			"bank_account_name":   accountName,
		}).Error
	})

	if errors.Is(err, repository.ErrInsufficientBalance) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient wallet balance"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to request withdrawal"})
		return
	}

	entry.Status = models.TxStatusPending
	entry.BankName = bankName
	entry.BankAccountNumber = accountNumber
	entry.BankAccountName = accountName
	c.JSON(http.StatusCreated, gin.H{
		"message":     "Withdrawal requested, waiting for disbursement",
		"transaction": entry,
	})
}

// kycStatusOf — status KYC yang bisa dilaporkan ke pemanggil.
// Profil yang belum pernah dibuat dilaporkan sebagai belum mengajukan.
func kycStatusOf(p *models.DriverProfile, exists bool) models.KYCStatus {
	if !exists || p == nil || p.KYCStatus == "" {
		return models.KYCNotSubmitted
	}
	return p.KYCStatus
}

// GetHistory — Ambil riwayat transaksi dompet
func (h *WalletHandler) GetHistory(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)

	scoped := func() *gorm.DB {
		q := h.db.Model(&models.WalletTransaction{}).Where("user_id = ?", userID)
		if txType := c.Query("type"); txType != "" {
			q = q.Where("type = ?", txType)
		}
		if status := c.Query("status"); status != "" {
			q = q.Where("status = ?", status)
		}
		return q
	}

	var total int64
	if err := scoped().Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve transactions"})
		return
	}

	page, perPage, offset := paginate(c)

	var transactions []models.WalletTransaction
	if err := scoped().Order("created_at desc").
		Limit(perPage).Offset(offset).Find(&transactions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve transactions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"transactions": transactions,
		"meta": gin.H{
			"page":     page,
			"per_page": perPage,
			"total":    total,
		},
	})
}

// parseUintParam — baca parameter path berupa angka
func parseUintParam(c *gin.Context, name string) (uint, bool) {
	raw := c.Param(name)
	val, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || val == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid " + name})
		return 0, false
	}
	return uint(val), true
}

// Transfer — POST /api/wallet/transfer
// Transfer saldo sesama pengguna OpenJek menggunakan nomor HP atau email tujuan.
func (h *WalletHandler) Transfer(c *gin.Context) {
	senderID := c.GetUint(middleware.UserIDKey)

	var req struct {
		Recipient string  `json:"recipient" binding:"required"`
		Amount    float64 `json:"amount" binding:"required,gt=0"`
		Note      string  `json:"note"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	if req.Amount < 10000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Minimal transfer adalah Rp 10.000"})
		return
	}

	target := strings.TrimSpace(req.Recipient)
	var recipient models.User
	if err := h.db.Where("email = ? OR phone = ?", target, target).First(&recipient).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Penerima tidak ditemukan. Pastikan email atau nomor HP sudah benar."})
		return
	}

	if recipient.ID == senderID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tidak dapat melakukan transfer ke akun sendiri."})
		return
	}

	if !recipient.IsActive {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Akun penerima sedang tidak aktif."})
		return
	}

	var sender models.User
	if err := h.db.First(&sender, senderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pengirim tidak ditemukan"})
		return
	}

	noteSender := req.Note
	if noteSender == "" {
		noteSender = fmt.Sprintf("Transfer ke %s (%s)", recipient.Name, target)
	} else {
		noteSender = fmt.Sprintf("Transfer ke %s: %s", recipient.Name, req.Note)
	}

	noteRecipient := req.Note
	if noteRecipient == "" {
		senderIdentifier := sender.Phone
		if senderIdentifier == "" {
			senderIdentifier = sender.Email
		}
		noteRecipient = fmt.Sprintf("Transfer dari %s (%s)", sender.Name, senderIdentifier)
	} else {
		noteRecipient = fmt.Sprintf("Transfer dari %s: %s", sender.Name, req.Note)
	}

	var debitTx *models.WalletTransaction
	err := h.db.Transaction(func(tx *gorm.DB) error {
		var err error
		debitTx, err = h.wallet.Debit(tx, repository.Entry{
			UserID: senderID,
			Amount: req.Amount,
			Type:   models.TxTypeTransfer,
			Note:   noteSender,
		})
		if err != nil {
			return err
		}

		_, err = h.wallet.Credit(tx, repository.Entry{
			UserID: recipient.ID,
			Amount: req.Amount,
			Type:   models.TxTypeTransfer,
			Note:   noteRecipient,
		})
		return err
	})

	if errors.Is(err, repository.ErrInsufficientBalance) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Saldo tidak mencukupi untuk transfer"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses transfer"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Transfer berhasil",
		"new_balance": debitTx.BalanceAfter,
		"recipient": gin.H{
			"id":    recipient.ID,
			"name":  recipient.Name,
			"phone": recipient.Phone,
			"email": recipient.Email,
		},
		"transaction": debitTx,
	})
}

// PayPPOB — POST /api/wallet/ppob
// Pembayaran transaksi PPOB (Pulsa, Paket Data, Token PLN, BPJS, PDAM, dll) menggunakan saldo OpenPay.
func (h *WalletHandler) PayPPOB(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)

	var req struct {
		Service     string  `json:"service" binding:"required"`
		CustomerNo  string  `json:"customer_no" binding:"required"`
		Amount      float64 `json:"amount" binding:"required,gt=0"`
		ProductName string  `json:"product_name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	custNo := strings.TrimSpace(req.CustomerNo)
	if custNo == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nomor tujuan atau ID pelanggan tidak boleh kosong"})
		return
	}

	note := fmt.Sprintf("PPOB %s: %s (%s)", req.Service, req.ProductName, custNo)

	var debitTx *models.WalletTransaction
	err := h.db.Transaction(func(tx *gorm.DB) error {
		var err error
		debitTx, err = h.wallet.Debit(tx, repository.Entry{
			UserID: userID,
			Amount: req.Amount,
			Type:   models.TxTypePayment,
			Note:   note,
		})
		return err
	})

	if errors.Is(err, repository.ErrInsufficientBalance) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Saldo OpenPay tidak mencukupi untuk pembayaran ini"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses pembayaran PPOB"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Pembayaran PPOB berhasil",
		"new_balance": debitTx.BalanceAfter,
		"transaction": debitTx,
	})
}
