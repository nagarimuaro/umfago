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

// AdminHandler — endpoint back-office. Setiap route dilindungi permission
// tersendiri di server.go, bukan hanya oleh grup admin.
type AdminHandler struct {
	db       *gorm.DB
	wallet   *repository.WalletRepository
	roleRepo *repository.RoleRepository
	notif    *repository.NotificationRepository
}

func NewAdminHandler(
	db *gorm.DB,
	wallet *repository.WalletRepository,
	roleRepo *repository.RoleRepository,
	notif *repository.NotificationRepository,
) *AdminHandler {
	return &AdminHandler{
		db:       db,
		wallet:   wallet,
		roleRepo: roleRepo,
		notif:    notif,
	}
}

// ── Driver ───────────────────────────────────────────────────────────────

// ListDrivers — GET /api/admin/drivers
func (h *AdminHandler) ListDrivers(c *gin.Context) {
	driverRoles := []string{
		string(models.RoleDriverMotorcycle),
		string(models.RoleDriverCar),
	}

	scoped := func() *gorm.DB {
		q := h.db.Model(&models.User{}).Where("role_code IN ?", driverRoles)
		if v := c.Query("is_verified"); v != "" {
			q = q.Where("is_verified = ?", v == "true" || v == "1")
		}
		if v := c.Query("is_active"); v != "" {
			q = q.Where("is_active = ?", v == "true" || v == "1")
		}
		if v := c.Query("kyc_status"); v != "" {
			// Join ke driver_profiles agar antrian peninjauan bisa dibuka
			// langsung dengan ?kyc_status=pending. Driver tanpa profil
			// dianggap belum mengajukan.
			if v == string(models.KYCNotSubmitted) {
				q = q.Where(`NOT EXISTS (
					SELECT 1 FROM driver_profiles p
					WHERE p.user_id = users.id AND p.deleted_at IS NULL
					  AND p.kyc_status <> ?
				)`, models.KYCNotSubmitted)
			} else {
				q = q.Where(`EXISTS (
					SELECT 1 FROM driver_profiles p
					WHERE p.user_id = users.id AND p.deleted_at IS NULL
					  AND p.kyc_status = ?
				)`, v)
			}
		}
		if v := c.Query("q"); v != "" {
			like := "%" + v + "%"
			q = q.Where("name ILIKE ? OR email ILIKE ? OR phone ILIKE ?", like, like, like)
		}
		return q
	}

	var total int64
	if err := scoped().Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch drivers"})
		return
	}

	page, perPage, offset := paginate(c)

	var drivers []models.User
	if err := scoped().Preload("Vehicles").Preload("DriverProfile").
		Order("created_at desc").Limit(perPage).Offset(offset).
		Find(&drivers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch drivers"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"drivers": drivers,
		"meta":    gin.H{"page": page, "per_page": perPage, "total": total},
	})
}

// VerifyDriver — PUT /api/admin/drivers/:id/verify
//
// Verifikasi driver adalah persetujuan berkas KYC, bukan sekadar menyalakan
// sebuah tanda. Tanpa berkas yang bisa diperiksa, tidak ada yang bisa disetujui,
// jadi driver yang belum mengajukan KYC ditolak di sini.
func (h *AdminHandler) VerifyDriver(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}

	driver, profile, ok := h.loadDriverForKYC(c, id)
	if !ok {
		return
	}

	if profile == nil || profile.KYCStatus == "" || profile.KYCStatus == models.KYCNotSubmitted {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Driver has not submitted KYC documents yet",
		})
		return
	}

	if missing := profile.MissingKYCFields(); len(missing) > 0 {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error":          "KYC submission is incomplete",
			"missing_fields": missing,
		})
		return
	}

	reviewerID := c.GetUint(middleware.UserIDKey)
	now := timeNow()

	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.DriverProfile{}).Where("id = ?", profile.ID).
			Updates(map[string]interface{}{
				"kyc_status":           models.KYCApproved,
				"kyc_reviewed_at":      now,
				"kyc_reviewed_by":      reviewerID,
				"kyc_rejection_reason": "",
			}).Error; err != nil {
			return err
		}
		return tx.Model(&models.User{}).Where("id = ?", driver.ID).
			Update("is_verified", true).Error
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify driver"})
		return
	}

	if h.notif != nil {
		h.notif.Push(driver.ID, models.NotifKYCApproved,
			"KYC disetujui",
			"Dokumen Anda telah diverifikasi. Anda sekarang dapat menerima order.",
			map[string]any{"driver_id": driver.ID})
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Driver verified successfully",
		"kyc_status": models.KYCApproved,
	})
}

// RejectDriverKYC — PUT /api/admin/drivers/:id/reject-kyc
//
// Alasan penolakan wajib: driver harus tahu berkas mana yang perlu diperbaiki,
// dan peninjau berikutnya harus tahu apa yang sudah dinilai sebelumnya.
func (h *AdminHandler) RejectDriverKYC(c *gin.Context) {
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

	driver, profile, ok := h.loadDriverForKYC(c, id)
	if !ok {
		return
	}
	if profile == nil || profile.KYCStatus == "" || profile.KYCStatus == models.KYCNotSubmitted {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Driver has not submitted KYC documents yet",
		})
		return
	}

	reviewerID := c.GetUint(middleware.UserIDKey)
	now := timeNow()

	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.DriverProfile{}).Where("id = ?", profile.ID).
			Updates(map[string]interface{}{
				"kyc_status":           models.KYCRejected,
				"kyc_reviewed_at":      now,
				"kyc_reviewed_by":      reviewerID,
				"kyc_rejection_reason": req.Reason,
			}).Error; err != nil {
			return err
		}
		// Penolakan juga mencabut verifikasi yang mungkin diberikan sebelumnya,
		// sehingga driver berhenti menerima order sampai berkasnya benar.
		return tx.Model(&models.User{}).Where("id = ?", driver.ID).
			Update("is_verified", false).Error
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject driver KYC"})
		return
	}

	if h.notif != nil {
		h.notif.Push(driver.ID, models.NotifKYCRejected,
			"KYC ditolak",
			req.Reason,
			map[string]any{"driver_id": driver.ID})
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Driver KYC rejected",
		"kyc_status": models.KYCRejected,
		"reason":     req.Reason,
	})
}

// GetDriverKYC — GET /api/admin/drivers/:id/kyc
//
// Berbeda dari GET /api/driver/kyc milik driver sendiri, respons ini memuat
// seluruh URL dokumen dan nomor rekening utuh — inilah layar yang dipakai
// peninjau untuk mengambil keputusan.
func (h *AdminHandler) GetDriverKYC(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}

	driver, profile, ok := h.loadDriverForKYC(c, id)
	if !ok {
		return
	}

	if profile == nil {
		c.JSON(http.StatusOK, gin.H{
			"driver": gin.H{
				"id":          driver.ID,
				"name":        driver.Name,
				"email":       driver.Email,
				"phone":       driver.Phone,
				"role_code":   driver.RoleCode,
				"is_verified": driver.IsVerified,
				"is_active":   driver.IsActive,
			},
			"kyc": gin.H{
				"status":         models.KYCNotSubmitted,
				"missing_fields": (*models.DriverProfile)(nil).MissingKYCFields(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"driver": gin.H{
			"id":          driver.ID,
			"name":        driver.Name,
			"email":       driver.Email,
			"phone":       driver.Phone,
			"role_code":   driver.RoleCode,
			"is_verified": driver.IsVerified,
			"is_active":   driver.IsActive,
		},
		"kyc":            profile,
		"missing_fields": profile.MissingKYCFields(),
	})
}

// loadDriverForKYC — muat akun driver beserta profilnya.
//
// Membalas 404 sendiri bila akun tidak ada atau bukan driver, sehingga endpoint
// KYC tidak bisa dipakai membaca akun non-driver. Profil bernilai nil bila
// driver belum pernah mengisi apa pun.
func (h *AdminHandler) loadDriverForKYC(c *gin.Context, id uint) (*models.User, *models.DriverProfile, bool) {
	var driver models.User
	err := h.db.Where("id = ? AND role_code IN ?", id, []string{
		string(models.RoleDriverMotorcycle), string(models.RoleDriverCar),
	}).First(&driver).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Driver not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load driver"})
		}
		return nil, nil, false
	}

	var profile models.DriverProfile
	err = h.db.Where("user_id = ?", id).First(&profile).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return &driver, nil, true
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load driver profile"})
		return nil, nil, false
	}
	return &driver, &profile, true
}

// SuspendDriver — PUT /api/admin/drivers/:id/suspend
func (h *AdminHandler) SuspendDriver(c *gin.Context) {
	h.setActive(c, false, "Driver suspended successfully")
}

// ReactivateDriver — PUT /api/admin/drivers/:id/reactivate
func (h *AdminHandler) ReactivateDriver(c *gin.Context) {
	h.setActive(c, true, "Driver reactivated successfully")
}

func (h *AdminHandler) setActive(c *gin.Context, active bool, msg string) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}

	var target models.User
	if err := h.db.First(&target, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Admin tidak boleh menonaktifkan admin lain lewat endpoint driver ini.
	if models.IsAdminRole(target.RoleCode) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot change status of an admin account through this endpoint"})
		return
	}

	if err := h.db.Model(&target).Update("is_active", active).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update status"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": msg})
}

// GiveDriverBonus — POST /api/admin/drivers/:id/bonus
func (h *AdminHandler) GiveDriverBonus(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}

	var req struct {
		Amount float64 `json:"amount" binding:"required,gt=0"`
		Note   string  `json:"note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	var driver models.User
	if err := h.db.First(&driver, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Driver not found"})
		return
	}
	if !models.IsDriverRole(driver.RoleCode) && !driver.HasRole(models.RoleDriverMotorcycle) && !driver.HasRole(models.RoleDriverCar) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Target user is not a driver"})
		return
	}

	note := req.Note
	if note == "" {
		note = "Bonus dari admin"
	}

	var entry *models.WalletTransaction
	err := h.db.Transaction(func(tx *gorm.DB) error {
		var err error
		entry, err = h.wallet.Credit(tx, repository.Entry{
			UserID: driver.ID,
			Amount: req.Amount,
			Type:   models.TxTypeBonus,
			Note:   note,
		})
		return err
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to grant bonus"})
		return
	}

	if h.notif != nil {
		h.notif.Push(driver.ID, models.NotifDriverBonus,
			"Bonus diterima",
			fmt.Sprintf("Anda menerima bonus %.0f: %s", req.Amount, note),
			map[string]any{"transaction_id": entry.ID, "amount": req.Amount})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Bonus granted", "transaction": entry})
}

// ── Order ────────────────────────────────────────────────────────────────

// AdminListOrders — GET /api/admin/orders
func (h *AdminHandler) AdminListOrders(c *gin.Context) {
	scoped := func() *gorm.DB {
		q := h.db.Model(&models.Order{})
		if status := c.Query("status"); status != "" {
			q = q.Where("status = ?", status)
		}
		if from := c.Query("from"); from != "" {
			q = q.Where("created_at >= ?", from)
		}
		if to := c.Query("to"); to != "" {
			q = q.Where("created_at <= ?", to)
		}
		return q
	}

	var total int64
	if err := scoped().Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders"})
		return
	}

	page, perPage, offset := paginate(c)

	var orders []models.Order
	if err := scoped().Preload("Rider").Preload("Driver").
		Order("created_at DESC").Limit(perPage).Offset(offset).
		Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"orders": orders,
		"meta":   gin.H{"page": page, "per_page": perPage, "total": total},
	})
}

// AdminCancelOrder — PUT /api/admin/orders/:uuid/cancel
//
// Membatalkan order yang pembayarannya lewat dompet juga mengembalikan dananya.
// Sebelumnya endpoint ini hanya mengubah status, sehingga uang customer hilang.
func (h *AdminHandler) AdminCancelOrder(c *gin.Context) {
	uuidParam := c.Param("uuid")

	var req struct {
		Reason string `json:"reason"`
	}
	_ = c.ShouldBindJSON(&req)

	var refunded float64
	err := h.db.Transaction(func(tx *gorm.DB) error {
		var order models.Order
		if err := tx.Clauses(lockForUpdate()).Where("uuid = ?", uuidParam).First(&order).Error; err != nil {
			return err
		}

		if order.Status == models.StatusCancelled || order.Status == models.StatusCompleted {
			return errInvalidTransition
		}

		if order.PaymentMethod == models.PaymentWallet {
			if _, err := h.wallet.Credit(tx, repository.Entry{
				UserID:    order.RiderID,
				Amount:    order.FareAmount,
				Type:      models.TxTypeRefund,
				OrderUUID: order.UUID,
				Note:      "Pembatalan oleh admin: " + req.Reason,
			}); err != nil {
				return err
			}
			refunded = order.FareAmount
		}

		note := order.ReviewNote
		if req.Reason != "" {
			note = "Dibatalkan admin: " + req.Reason
		}

		return tx.Model(&models.Order{}).Where("uuid = ?", order.UUID).
			Updates(map[string]interface{}{
				"status":       models.StatusCancelled,
				"cancelled_at": time.Now(),
				"review_note":  note,
			}).Error
	})

	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	case errors.Is(err, errInvalidTransition):
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot cancel a completed or already cancelled order"})
		return
	case err != nil:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel order"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Order cancelled by admin",
		"refunded": refunded,
	})
}

// ForceCompleteOrder — PUT /api/admin/orders/:uuid/force-complete
//
// Dipakai ketika driver lupa menutup perjalanan yang sudah selesai. Pembagian
// pendapatan tetap dijalankan agar pembukuan tidak bolong.
func (h *AdminHandler) ForceCompleteOrder(c *gin.Context) {
	uuidParam := c.Param("uuid")

	err := h.db.Transaction(func(tx *gorm.DB) error {
		var order models.Order
		if err := tx.Clauses(lockForUpdate()).Where("uuid = ?", uuidParam).First(&order).Error; err != nil {
			return err
		}

		if order.Status == models.StatusCompleted || order.Status == models.StatusCancelled {
			return errInvalidTransition
		}
		if order.DriverID == nil {
			return errInvalidTransition
		}

		updates := map[string]interface{}{
			"status":       models.StatusCompleted,
			"completed_at": time.Now(),
		}

		// Bila pendapatan belum pernah dibagi, bagi sekarang. Pengecekan ini
		// mencegah driver dibayar dua kali bila endpoint dipanggil ulang.
		if order.DriverEarning == 0 && order.PaymentMethod == models.PaymentWallet {
			if _, err := h.wallet.Credit(tx, repository.Entry{
				UserID:    *order.DriverID,
				Amount:    order.FareAmount,
				Type:      models.TxTypeEarning,
				OrderUUID: order.UUID,
				Note:      "Penyelesaian order oleh admin " + order.UUID,
			}); err != nil {
				return err
			}
			updates["driver_earning"] = order.FareAmount
		}

		return tx.Model(&models.Order{}).Where("uuid = ?", order.UUID).Updates(updates).Error
	})

	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	case errors.Is(err, errInvalidTransition):
		c.JSON(http.StatusBadRequest, gin.H{"error": "Order cannot be force-completed in its current state"})
		return
	case err != nil:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete order"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Order force-completed"})
}
