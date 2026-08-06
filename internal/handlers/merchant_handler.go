package handlers

import (
	"net/http"

	"openjek-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// MerchantHandler — pengelolaan merchant oleh back-office
type MerchantHandler struct {
	db *gorm.DB
}

func NewMerchantHandler(db *gorm.DB) *MerchantHandler {
	return &MerchantHandler{db: db}
}

// List — GET /api/admin/merchants
func (h *MerchantHandler) List(c *gin.Context) {
	scoped := func() *gorm.DB {
		q := h.db.Model(&models.MerchantProfile{})
		if v := c.Query("is_active"); v != "" {
			q = q.Where("is_active = ?", v == "true" || v == "1")
		}
		if v := c.Query("category"); v != "" {
			q = q.Where("category = ?", v)
		}
		if v := c.Query("q"); v != "" {
			q = q.Where("business_name ILIKE ?", "%"+v+"%")
		}
		return q
	}

	var total int64
	if err := scoped().Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch merchants"})
		return
	}

	page, perPage, offset := paginate(c)

	var merchants []models.MerchantProfile
	if err := scoped().Order("created_at desc").Limit(perPage).Offset(offset).
		Find(&merchants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch merchants"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"merchants": merchants,
		"meta":      gin.H{"page": page, "per_page": perPage, "total": total},
	})
}

// Get — GET /api/admin/merchants/:id
func (h *MerchantHandler) Get(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}

	var merchant models.MerchantProfile
	if err := h.db.First(&merchant, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Merchant not found"})
		return
	}

	var owner models.User
	h.db.Select("id", "name", "email", "phone", "is_active").First(&owner, merchant.UserID)

	c.JSON(http.StatusOK, gin.H{"merchant": merchant, "owner": owner})
}

// Approve — PUT /api/admin/merchants/:id/approve
//
// Persetujuan mengaktifkan profil merchant sekaligus menandai akun pemiliknya
// terverifikasi, agar merchant tidak perlu diverifikasi dua kali di dua tempat.
func (h *MerchantHandler) Approve(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}

	var merchant models.MerchantProfile
	if err := h.db.First(&merchant, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Merchant not found"})
		return
	}

	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&merchant).Update("is_active", true).Error; err != nil {
			return err
		}
		return tx.Model(&models.User{}).Where("id = ?", merchant.UserID).
			Update("is_verified", true).Error
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to approve merchant"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Merchant approved"})
}

// Suspend — PUT /api/admin/merchants/:id/suspend
func (h *MerchantHandler) Suspend(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}

	var req struct {
		Reason string `json:"reason"`
	}
	_ = c.ShouldBindJSON(&req)

	result := h.db.Model(&models.MerchantProfile{}).Where("id = ?", id).
		Updates(map[string]interface{}{"is_active": false, "is_open": false})

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to suspend merchant"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Merchant not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Merchant suspended"})
}
