package handlers

import (
	"errors"
	"net/http"

	"openjek-backend/internal/middleware"
	"openjek-backend/internal/models"
	"openjek-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// AdminUserHandler — pengelolaan akun pengguna oleh back-office
type AdminUserHandler struct {
	db       *gorm.DB
	roleRepo *repository.RoleRepository
}

func NewAdminUserHandler(db *gorm.DB, roleRepo *repository.RoleRepository) *AdminUserHandler {
	return &AdminUserHandler{db: db, roleRepo: roleRepo}
}

// List — GET /api/admin/users
func (h *AdminUserHandler) List(c *gin.Context) {
	scoped := func() *gorm.DB {
		q := h.db.Model(&models.User{})
		if v := c.Query("role"); v != "" {
			q = q.Where("role_code = ?", v)
		}
		if v := c.Query("is_active"); v != "" {
			q = q.Where("is_active = ?", v == "true" || v == "1")
		}
		if v := c.Query("q"); v != "" {
			like := "%" + v + "%"
			q = q.Where("name ILIKE ? OR email ILIKE ? OR phone ILIKE ?", like, like, like)
		}
		return q
	}

	var total int64
	if err := scoped().Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	page, perPage, offset := paginate(c)

	var users []models.User
	if err := scoped().Order("created_at desc").Limit(perPage).Offset(offset).
		Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"users": users,
		"meta":  gin.H{"page": page, "per_page": perPage, "total": total},
	})
}

// Get — GET /api/admin/users/:id
func (h *AdminUserHandler) Get(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}

	user, err := h.roleRepo.LoadUserWithRoles(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

// SetActive — PUT /api/admin/users/:id/status
func (h *AdminUserHandler) SetActive(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}

	var req struct {
		IsActive *bool  `json:"is_active" binding:"required"`
		Reason   string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	// Admin tidak boleh menonaktifkan akunnya sendiri dan mengunci diri keluar.
	if id == c.GetUint(middleware.UserIDKey) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot change the status of your own account"})
		return
	}

	result := h.db.Model(&models.User{}).Where("id = ?", id).Update("is_active", *req.IsActive)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user status"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Menonaktifkan akun juga mencabut seluruh sesinya, agar token yang sudah
	// beredar tidak bisa dipakai memperpanjang akses.
	if !*req.IsActive {
		now := timeNow()
		h.db.Model(&models.RefreshToken{}).
			Where("user_id = ? AND revoked_at IS NULL", id).
			Update("revoked_at", now)
	}

	c.JSON(http.StatusOK, gin.H{"message": "User status updated"})
}

// AssignRole — POST /api/admin/users/:id/roles
//
// Berbeda dengan penambahan role mandiri di /api/users/roles, endpoint ini
// boleh memberikan role admin — karena itu ia dilindungi permission users.manage.
func (h *AdminUserHandler) AssignRole(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}

	var req struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	code := models.RoleCode(req.Role)
	if !models.IsValidRoleCode(code) {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error":          "Unknown role",
			"allowed_values": models.AllRoleCodes(),
		})
		return
	}

	if err := h.roleRepo.AssignRole(id, code); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign role"})
		return
	}

	user, _ := h.roleRepo.LoadUserWithRoles(id)
	c.JSON(http.StatusOK, gin.H{"message": "Role assigned", "user": user})
}

// RevokeRole — DELETE /api/admin/users/:id/roles/:role
func (h *AdminUserHandler) RevokeRole(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}

	code := models.RoleCode(c.Param("role"))
	if !models.IsValidRoleCode(code) {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Unknown role"})
		return
	}

	err := h.roleRepo.RevokeRole(id, code)
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	case errors.Is(err, repository.ErrRoleNotAssigned):
		c.JSON(http.StatusNotFound, gin.H{"error": "Role is not assigned to this user"})
		return
	case errors.Is(err, repository.ErrActiveRole):
		c.JSON(http.StatusConflict, gin.H{
			"error": "Cannot revoke the role the user is currently using. Ask them to switch role first.",
		})
		return
	case err != nil:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to revoke role"})
		return
	}

	user, _ := h.roleRepo.LoadUserWithRoles(id)
	c.JSON(http.StatusOK, gin.H{"message": "Role revoked", "user": user})
}
