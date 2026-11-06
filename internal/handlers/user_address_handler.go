package handlers

import (
	"net/http"
	"strings"

	"openjek-backend/internal/middleware"
	"openjek-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// UserAddressHandler — pengelolaan alamat tersimpan pengguna.
type UserAddressHandler struct {
	db *gorm.DB
}

func NewUserAddressHandler(db *gorm.DB) *UserAddressHandler {
	return &UserAddressHandler{db: db}
}

type addressRequest struct {
	Label     string  `json:"label" binding:"required"`
	Address   string  `json:"address" binding:"required"`
	Note      string  `json:"note"`
	Area      string  `json:"area"`
	Lat       float64 `json:"lat"`
	Lon       float64 `json:"lon"`
	Icon      string  `json:"icon"`
	IsDefault bool    `json:"is_default"`
}

// List — GET /api/user/addresses
func (h *UserAddressHandler) List(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)

	var addresses []models.UserAddress
	if err := h.db.Where("user_id = ?", userID).
		Order("is_default desc, updated_at desc").
		Find(&addresses).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch addresses"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"addresses": addresses})
}

// Create — POST /api/user/addresses
func (h *UserAddressHandler) Create(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)

	var req addressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Label and address are required"})
		return
	}

	icon := strings.TrimSpace(req.Icon)
	if icon == "" {
		icon = "location-on"
	}

	item := models.UserAddress{
		UserID:    userID,
		Label:     strings.TrimSpace(req.Label),
		Address:   strings.TrimSpace(req.Address),
		Note:      strings.TrimSpace(req.Note),
		Area:      strings.TrimSpace(req.Area),
		Lat:       req.Lat,
		Lon:       req.Lon,
		Icon:      icon,
		IsDefault: req.IsDefault,
	}

	if err := h.db.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save address"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Address saved successfully",
		"address": item,
	})
}

// Update — PUT /api/user/addresses/:id
func (h *UserAddressHandler) Update(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}

	var item models.UserAddress
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).First(&item).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Address not found"})
		return
	}

	var req addressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	if req.Label != "" {
		item.Label = strings.TrimSpace(req.Label)
	}
	if req.Address != "" {
		item.Address = strings.TrimSpace(req.Address)
	}
	item.Note = strings.TrimSpace(req.Note)
	item.Area = strings.TrimSpace(req.Area)
	if req.Lat != 0 {
		item.Lat = req.Lat
	}
	if req.Lon != 0 {
		item.Lon = req.Lon
	}
	if req.Icon != "" {
		item.Icon = strings.TrimSpace(req.Icon)
	}
	item.IsDefault = req.IsDefault

	if err := h.db.Save(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update address"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Address updated successfully",
		"address": item,
	})
}

// Delete — DELETE /api/user/addresses/:id
func (h *UserAddressHandler) Delete(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}

	res := h.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.UserAddress{})
	if res.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete address"})
		return
	}
	if res.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Address not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Address deleted successfully"})
}

