package handlers

import (
	"net/http"

	"openjek-backend/internal/middleware"
	"openjek-backend/internal/models"
	"openjek-backend/internal/repository"
	"openjek-backend/internal/sdui"

	"github.com/gin-gonic/gin"
)

type SDUIHandler struct {
	builder  *sdui.Builder
	settings *repository.SettingsRepository
}

func NewSDUIHandler(builder *sdui.Builder, settings *repository.SettingsRepository) *SDUIHandler {
	return &SDUIHandler{builder: builder, settings: settings}
}

// GetHomeScreen — GET /api/ui/home
// Android memanggil ini saat membuka aplikasi untuk mendapatkan struktur layar terbaru
func (h *SDUIHandler) GetHomeScreen(c *gin.Context) {
	role := models.RoleCode(c.GetString(middleware.UserRoleKey))

	var screen sdui.Screen
	if models.IsDriverRole(role) {
		screen = h.builder.BuildDriverScreen(c.Request.Context())
	} else {
		screen = h.builder.BuildHomeScreen(c.Request.Context())
	}

	c.JSON(http.StatusOK, screen)
}

// GetSettings — GET /api/settings (hanya untuk Admin)
// Mengembalikan semua setting saat ini
func (h *SDUIHandler) GetSettings(c *gin.Context) {
	settings, err := h.settings.GetAll(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load settings"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"settings": settings})
}

// UpdateSetting — PUT /api/settings/:key (hanya untuk Admin)
// Admin Dashboard memanggil ini untuk mengubah pengaturan secara real-time
func (h *SDUIHandler) UpdateSetting(c *gin.Context) {
	key := c.Param("key")

	var req struct {
		Value string `json:"value" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	if err := h.settings.Set(c.Request.Context(), key, req.Value); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update setting"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Setting updated successfully",
		"key":     key,
		"value":   req.Value,
	})
}
