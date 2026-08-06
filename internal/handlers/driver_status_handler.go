package handlers

import (
	"net/http"
	"time"

	"openjek-backend/internal/middleware"
	"openjek-backend/internal/models"
	"openjek-backend/internal/pricing"
	"openjek-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// DriverStatusHandler — driver menyalakan dan memadamkan kesiapannya menerima
// order.
//
// Kolom users.is_online sebelumnya ada tetapi tidak pernah ditulis siapa pun,
// sehingga pencarian driver hanya bersandar pada posisi terakhir di Redis.
// Akibatnya driver yang sudah menutup aplikasi tetap ditawari order selama
// posisinya belum kedaluwarsa dari indeks.
type DriverStatusHandler struct {
	db      *gorm.DB
	locRepo *repository.LocationRepository
	pricing *pricing.Calculator
}

// NewDriverStatusHandler — locRepo boleh nil (lingkungan tanpa Redis, termasuk
// test); status di database tetap berubah, hanya indeks geospasial yang dilewati.
// calc boleh nil juga; tanpa kalkulator, batas saldo tidak diperiksa.
func NewDriverStatusHandler(db *gorm.DB, locRepo *repository.LocationRepository, calc *pricing.Calculator) *DriverStatusHandler {
	return &DriverStatusHandler{db: db, locRepo: locRepo, pricing: calc}
}

// Nilai status yang diterima dari klien
const (
	driverStatusOnline  = "online"
	driverStatusOffline = "offline"
)

// SetStatus — PUT /api/driver/status
func (h *DriverStatusHandler) SetStatus(c *gin.Context) {
	driver := middleware.GetCurrentUserFromCtx(c)
	if driver == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}
	if req.Status != driverStatusOnline && req.Status != driverStatusOffline {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error":          "status must be online or offline",
			"allowed_values": []string{driverStatusOnline, driverStatusOffline},
		})
		return
	}

	// Driver yang belum lolos KYC tidak akan pernah dilewatkan penyaringan
	// pencarian. Membiarkannya berstatus online hanya membuat aplikasi
	// menampilkan kesiapan yang tidak pernah menghasilkan order.
	if req.Status == driverStatusOnline && !driver.IsVerified {
		c.JSON(http.StatusForbidden, gin.H{
			"error":      "Driver account is not verified yet",
			"kyc_status": h.kycStatusOf(driver.ID),
		})
		return
	}

	// Saldo yang sudah menembus batas utang menutup akses sampai deposit.
	if req.Status == driverStatusOnline && h.pricing != nil {
		floor := h.pricing.MinBalance(c.Request.Context())
		if driver.Balance <= floor {
			c.JSON(http.StatusForbidden, gin.H{
				"error":           "Your balance has reached the minimum limit",
				"current_balance": driver.Balance,
				"min_balance":     floor,
				"action_required": "Please deposit to continue",
			})
			return
		}
	}

	// Offline di tengah perjalanan berarti meninggalkan penumpang yang sudah
	// menunggu atau sedang diantar.
	if req.Status == driverStatusOffline {
		var ongoing int64
		if err := h.db.Model(&models.Order{}).
			Where("driver_id = ? AND status IN ?", driver.ID,
				[]models.OrderStatus{models.StatusAccepted, models.StatusArrived, models.StatusInProgress}).
			Count(&ongoing).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check ongoing orders"})
			return
		}
		if ongoing > 0 {
			c.JSON(http.StatusForbidden, gin.H{"error": "Finish your ongoing order before going offline"})
			return
		}
	}

	now := time.Now()
	updates := map[string]interface{}{"is_online": req.Status == driverStatusOnline}
	if req.Status == driverStatusOnline {
		updates["online_since"] = now
	} else {
		updates["online_since"] = nil
	}

	if err := h.db.Model(&models.User{}).Where("id = ?", driver.ID).
		Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update driver status"})
		return
	}

	// Posisi terakhir dibuang dari indeks geospasial saat offline. Tanpa ini,
	// driver tetap muncul sebagai hasil GEOSEARCH dan tetap ikut disaring
	// setiap kali ada order baru di dekatnya.
	if req.Status == driverStatusOffline && h.locRepo != nil {
		if err := h.locRepo.RemoveDriver(c.Request.Context(), driver.ID); err != nil {
			// Status di database sudah benar; indeks yang tertinggal akan
			// tersaring oleh predikat is_online pada pencarian driver.
			c.JSON(http.StatusOK, gin.H{
				"status":     req.Status,
				"updated_at": now,
				"warning":    "Location index could not be cleared",
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": req.Status, "updated_at": now})
}

// kycStatusOf — status KYC driver, untuk melengkapi pesan penolakan.
// Profil yang belum ada berarti driver memang belum menyerahkan apa pun.
func (h *DriverStatusHandler) kycStatusOf(driverID uint) models.KYCStatus {
	var profile models.DriverProfile
	if err := h.db.Where("user_id = ?", driverID).First(&profile).Error; err != nil {
		return models.KYCNotSubmitted
	}
	if profile.KYCStatus == "" {
		return models.KYCNotSubmitted
	}
	return profile.KYCStatus
}
