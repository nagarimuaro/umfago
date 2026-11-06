package handlers

import (
	"errors"
	"net/http"

	"openjek-backend/internal/auth"
	"openjek-backend/internal/middleware"
	"openjek-backend/internal/models"
	"openjek-backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	roleRepo *repository.RoleRepository
	jwtSvc   *auth.JWTService
}

func NewUserHandler(roleRepo *repository.RoleRepository, jwtSvc *auth.JWTService) *UserHandler {
	return &UserHandler{roleRepo: roleRepo, jwtSvc: jwtSvc}
}

// GetCurrentUser — GET /api/user
// Mengembalikan profil ringkas beserta role aktif dan seluruh role yang dimiliki,
// sehingga klien tahu tombol "beralih mode" mana yang perlu ditampilkan.
func (h *UserHandler) GetCurrentUser(c *gin.Context) {
	user := middleware.GetCurrentUserFromCtx(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	available := make([]gin.H, 0, len(user.Roles))
	for _, r := range user.Roles {
		available = append(available, gin.H{"code": r.Code, "name": r.Name, "group": r.Group})
	}

	// Sertakan daftar permission efektif agar klien (dashboard admin) dapat
	// merender menu secara dinamis tanpa memetakan role->menu di sisi klien.
	var permissions []models.PermissionCode
	if user.RoleCode == models.RoleSuperAdmin {
		permissions = make([]models.PermissionCode, 0, len(models.AllPermissions))
		for _, p := range models.AllPermissions {
			permissions = append(permissions, p.Code)
		}
	} else {
		permissions = make([]models.PermissionCode, 0, len(user.Role.Permissions))
		for _, p := range user.Role.Permissions {
			permissions = append(permissions, p.Code)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"id":                user.ID,
		"name":              user.Name,
		"email":             user.Email,
		"phone":             user.Phone,
		"gender":            user.Gender,
		"birth_date":        user.BirthDate,
		"address":           user.Address,
		"identity_number":   user.IdentityNumber,
		"emergency_contact": user.EmergencyContact,
		"is_active":         user.IsActive,
		"is_verified":       user.IsVerified,
		"is_online":         user.IsOnline,
		"balance":           user.Balance,
		"active_role":       user.RoleCode,
		"available_roles":   available,
		"permissions":       permissions,
	})
}

// SwitchRole — PUT /api/users/active-role
// Mengganti role aktif user. Hanya role yang sudah dimiliki yang bisa dipilih,
// jadi endpoint ini tidak bisa dipakai untuk menaikkan hak akses sendiri.
// Access token baru langsung diterbitkan agar perubahan berlaku seketika.
func (h *UserHandler) SwitchRole(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)

	var req struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	target := models.RoleCode(req.Role)
	if !models.IsValidRoleCode(target) {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Unknown role: " + req.Role})
		return
	}

	user, err := h.roleRepo.SwitchActiveRole(userID, target)
	if err != nil {
		if errors.Is(err, repository.ErrRoleNotAssigned) {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "Forbidden",
				"message": "You do not have this role. Register for it first.",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to switch role"})
		return
	}

	accessToken, err := h.jwtSvc.GenerateAccessToken(user.ID, user.Email, string(user.RoleCode))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate access token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Active role switched",
		"active_role":  user.RoleCode,
		"access_token": accessToken,
		"expires_in":   int(h.jwtSvc.AccessTokenTTL().Seconds()),
	})
}
