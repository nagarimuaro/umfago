package handlers

import (
	"net/http"

	"openjek-backend/internal/middleware"
	"openjek-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ProfileHandler struct {
	db *gorm.DB
}

func NewProfileHandler(db *gorm.DB) *ProfileHandler {
	return &ProfileHandler{db: db}
}

// GetProfile — Ambil profil lengkap (User + Driver + Merchant)
func (h *ProfileHandler) GetProfile(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)

	var user models.User
	if err := h.db.Preload("DriverProfile").Preload("MerchantProfile").Preload("Vehicles").First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"profile": user,
	})
}

// UpdateUserProfile — Update data profil pengguna
// Bila akun sudah terverifikasi (KYC approved / is_verified = true), data
// identitas utama (nama, jenis kelamin, tanggal lahir, NIK KTP) dikunci dan
// tidak boleh diubah sendiri.
func (h *ProfileHandler) UpdateUserProfile(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)

	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var req struct {
		Name             string `json:"name"`
		Phone            string `json:"phone"`
		Gender           string `json:"gender"`
		BirthDate        string `json:"birth_date"`
		Address          string `json:"address"`
		IdentityNumber   string `json:"identity_number"`
		EmergencyContact string `json:"emergency_contact"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Phone != "" {
		updates["phone"] = req.Phone
	}
	if req.Address != "" {
		updates["address"] = req.Address
	}
	if req.EmergencyContact != "" {
		updates["emergency_contact"] = req.EmergencyContact
	}

	// Hanya izinkan perubahan nama, jenis kelamin, tanggal lahir, dan NIK jika belum KYC / belum terverifikasi
	if !user.IsVerified {
		if req.Name != "" {
			updates["name"] = req.Name
		}
		if req.Gender != "" {
			updates["gender"] = req.Gender
		}
		if req.BirthDate != "" {
			updates["birth_date"] = req.BirthDate
		}
		if req.IdentityNumber != "" {
			updates["identity_number"] = req.IdentityNumber
		}
	}

	if len(updates) > 0 {
		if err := h.db.Model(&models.User{}).Where("id = ?", userID).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Profile updated"})
}

// UpdateDriverProfile — Update data spesifik driver
//
// Endpoint ini hanya untuk driver yang belum masuk proses KYC. Setelah berkas
// diajukan, nomor KTP dan SIM menjadi bagian dari bahan peninjauan, sehingga
// perubahannya harus lewat POST /api/driver/kyc agar statusnya ikut turun ke
// pending dan tidak ada data terverifikasi yang tertimpa tanpa jejak.
func (h *ProfileHandler) UpdateDriverProfile(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)

	var req struct {
		IdentityCardNumber string `json:"identity_card_number"`
		LicenseNumber      string `json:"license_number"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	// Upsert (Update or Create)
	var profile models.DriverProfile
	result := h.db.Where("user_id = ?", userID).First(&profile)
	if result.Error != nil && result.Error != gorm.ErrRecordNotFound {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if profile.KYCStatus == models.KYCPending || profile.KYCStatus == models.KYCApproved {
		c.JSON(http.StatusConflict, gin.H{
			"error":      "Identity data is locked by KYC verification. Submit POST /api/driver/kyc to change it.",
			"kyc_status": profile.KYCStatus,
		})
		return
	}

	profile.UserID = userID
	profile.IdentityCardNumber = req.IdentityCardNumber
	profile.LicenseNumber = req.LicenseNumber

	// Error penulisan tidak boleh diabaikan: tanpa pemeriksaan ini, kegagalan
	// simpan tetap dijawab 200 beserta isi profil yang sebenarnya tidak pernah
	// masuk database, sehingga klien menampilkan data yang tidak ada.
	var writeErr error
	if result.Error == gorm.ErrRecordNotFound {
		writeErr = h.db.Create(&profile).Error
	} else {
		writeErr = h.db.Save(&profile).Error
	}
	if writeErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save driver profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Driver profile updated", "profile": profile})
}

// UpdateMerchantProfile — Update data spesifik merchant
func (h *ProfileHandler) UpdateMerchantProfile(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)

	var req struct {
		BusinessName    string `json:"business_name"`
		BusinessAddress string `json:"business_address"`
		Category        string `json:"category"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	// Upsert (Update or Create)
	var profile models.MerchantProfile
	result := h.db.Where("user_id = ?", userID).First(&profile)
	if result.Error != nil && result.Error != gorm.ErrRecordNotFound {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	profile.UserID = userID
	profile.BusinessName = req.BusinessName
	profile.BusinessAddress = req.BusinessAddress
	profile.Category = req.Category

	var writeErr error
	if result.Error == gorm.ErrRecordNotFound {
		writeErr = h.db.Create(&profile).Error
	} else {
		writeErr = h.db.Save(&profile).Error
	}
	if writeErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save merchant profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Merchant profile updated", "profile": profile})
}
