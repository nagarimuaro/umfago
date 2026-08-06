package handlers

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"openjek-backend/internal/auth"
	"openjek-backend/internal/middleware"
	"openjek-backend/internal/models"
	"openjek-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	db       *gorm.DB
	jwtSvc   *auth.JWTService
	roleRepo *repository.RoleRepository
}

func NewAuthHandler(db *gorm.DB, jwtSvc *auth.JWTService) *AuthHandler {
	return &AuthHandler{db: db, jwtSvc: jwtSvc, roleRepo: repository.NewRoleRepository(db)}
}

// selfAssignableRoles — role yang boleh dipilih sendiri saat registrasi.
// Role admin sengaja tidak ada di sini: hanya bisa diberikan lewat endpoint
// admin dengan permission users.manage.
var selfAssignableRoles = map[models.RoleCode]bool{
	models.RoleCustomer:         true,
	models.RoleDriverMotorcycle: true,
	models.RoleDriverCar:        true,
	models.RoleMerchant:         true,
}

// Register - POST /api/register
func (h *AuthHandler) Register(c *gin.Context) {
	var req struct {
		Name     string `json:"name" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		Phone    string `json:"phone" binding:"required"`
		Password string `json:"password" binding:"required,min=8"`
		Role     string `json:"role"` // opsional, default customer
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	role := models.RoleCustomer
	if req.Role != "" {
		candidate := models.RoleCode(req.Role)
		if !selfAssignableRoles[candidate] {
			c.JSON(http.StatusUnprocessableEntity, gin.H{
				"error": "Role tidak tersedia untuk registrasi mandiri: " + req.Role,
			})
			return
		}
		role = candidate
	}

	// Hash password
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	user := models.User{
		Name:     req.Name,
		Email:    req.Email,
		Phone:    req.Phone,
		Password: string(hashed),
		RoleCode: role,
		// Ditulis eksplisit, bukan diserahkan pada default kolom: GORM tidak
		// mengirim kolom bernilai zero saat Create, sehingga `default:true` di
		// sisi database membuat akun yang sengaja dibuat nonaktif justru
		// tersimpan aktif. Pendaftaran adalah satu-satunya tempat akun lahir,
		// jadi nilai bawaannya ditentukan di sini.
		IsActive: true,
	}

	// Buat user dan baris user_roles dalam satu transaksi, supaya tidak ada akun
	// yang lahir tanpa role sama sekali.
	err = h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&user).Error; err != nil {
			return err
		}
		return repository.NewRoleRepository(tx).AssignRole(user.ID, role)
	})
	if err != nil {
		if isUniqueViolation(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "Email or phone already registered"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create account"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Registration successful",
		"user": gin.H{
			"id":          user.ID,
			"name":        user.Name,
			"email":       user.Email,
			"active_role": user.RoleCode,
		},
	})
}

// AddRole - POST /api/users/roles
// Menambahkan role baru ke akun yang sudah ada, misalnya customer yang ingin
// sekaligus jadi merchant atau driver. Hanya role non-admin yang bisa diminta;
// verifikasi dokumen tetap ditangani admin lewat drivers.verify / merchants.approve.
func (h *AuthHandler) AddRole(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)

	var req struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	role := models.RoleCode(req.Role)
	if !selfAssignableRoles[role] {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Role ini hanya bisa diberikan oleh admin: " + req.Role,
		})
		return
	}

	if err := h.roleRepo.AssignRole(userID, role); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add role"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Role added. Use PUT /api/users/active-role to switch to it.",
		"role":    role,
	})
}

// Login - POST /api/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := h.db.Preload("Roles").Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Akun yang di-suspend tidak boleh mendapat token baru
	if !user.IsActive {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Account suspended",
			"message": "Your account has been deactivated. Please contact support.",
		})
		return
	}

	accessToken, rawRefresh, err := h.issueTokens(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to issue tokens"})
		return
	}

	availableRoles := make([]models.RoleCode, 0, len(user.Roles))
	for _, r := range user.Roles {
		availableRoles = append(availableRoles, r.Code)
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token":  accessToken,
		"refresh_token": rawRefresh,
		"expires_in":    int(h.jwtSvc.AccessTokenTTL().Seconds()),
		"user": gin.H{
			"id":              user.ID,
			"name":            user.Name,
			"email":           user.Email,
			"active_role":     user.RoleCode,
			"available_roles": availableRoles,
		},
	})
}

// Refresh - POST /api/refresh
// Dipanggil OTOMATIS oleh klien saat Access Token kedaluwarsa. Tanpa login ulang.
//
// Refresh token dirotasi: token yang dipakai langsung dicabut dan diganti token
// baru. Bila token yang sudah dicabut dipakai lagi, itu berarti token bocor,
// sehingga seluruh sesi milik user tersebut ikut dicabut.
func (h *AuthHandler) Refresh(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	hash := auth.HashRefreshToken(req.RefreshToken)

	var record models.RefreshToken
	if err := h.db.Where("token_hash = ?", hash).First(&record).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
		return
	}

	now := time.Now()

	// Token sudah pernah dipakai (dicabut saat rotasi) tapi muncul lagi —
	// perlakukan sebagai kebocoran dan cabut semua sesi user ini.
	if record.RevokedAt != nil {
		h.revokeAllSessions(record.UserID)
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Refresh token reuse detected",
			"message": "All sessions have been revoked. Please login again.",
		})
		return
	}

	if now.After(record.ExpiresAt) {
		h.db.Model(&record).Update("revoked_at", now)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Refresh token expired, please login again"})
		return
	}

	var user models.User
	if err := h.db.Preload("Roles").First(&user, record.UserID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	if !user.IsActive {
		h.revokeAllSessions(user.ID)
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Account suspended",
			"message": "Your account has been deactivated. Please contact support.",
		})
		return
	}

	// Rotasi: cabut token lama, terbitkan pasangan token baru
	var accessToken, rawRefresh string
	err := h.db.Transaction(func(tx *gorm.DB) error {
		res := tx.Model(&models.RefreshToken{}).
			Where("id = ? AND revoked_at IS NULL", record.ID).
			Update("revoked_at", now)
		if res.Error != nil {
			return res.Error
		}
		// Baris tidak berubah artinya request lain sudah merotasi token yang sama
		if res.RowsAffected == 0 {
			return errors.New("refresh token already rotated")
		}

		var err error
		accessToken, rawRefresh, err = h.issueTokensTx(tx, &user)
		return err
	})
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token":  accessToken,
		"refresh_token": rawRefresh,
		"expires_in":    int(h.jwtSvc.AccessTokenTTL().Seconds()),
	})
}

// Logout - POST /api/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
		AllDevices   bool   `json:"all_devices"`
	}
	_ = c.ShouldBindJSON(&req)

	userID := c.GetUint(middleware.UserIDKey)

	if req.AllDevices {
		h.revokeAllSessions(userID)
		c.JSON(http.StatusOK, gin.H{"message": "Logged out from all devices"})
		return
	}

	if req.RefreshToken != "" {
		// Batasi ke sesi milik pemanggil agar token orang lain tidak bisa dicabut
		h.db.Model(&models.RefreshToken{}).
			Where("token_hash = ? AND user_id = ? AND revoked_at IS NULL",
				auth.HashRefreshToken(req.RefreshToken), userID).
			Update("revoked_at", time.Now())
	}

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

// ── Helpers ─────────────────────────────────────────────────────────────

func (h *AuthHandler) issueTokens(user *models.User) (accessToken, rawRefresh string, err error) {
	return h.issueTokensTx(h.db, user)
}

func (h *AuthHandler) issueTokensTx(tx *gorm.DB, user *models.User) (accessToken, rawRefresh string, err error) {
	accessToken, err = h.jwtSvc.GenerateAccessToken(user.ID, user.Email, string(user.RoleCode))
	if err != nil {
		return "", "", err
	}

	raw, hashed, expiresAt, err := h.jwtSvc.GenerateRefreshToken()
	if err != nil {
		return "", "", err
	}

	record := models.RefreshToken{
		UserID:    user.ID,
		TokenHash: hashed,
		ExpiresAt: expiresAt,
	}
	if err := tx.Create(&record).Error; err != nil {
		return "", "", err
	}

	return accessToken, raw, nil
}

func (h *AuthHandler) revokeAllSessions(userID uint) {
	h.db.Model(&models.RefreshToken{}).
		Where("user_id = ? AND revoked_at IS NULL", userID).
		Update("revoked_at", time.Now())
}

// isUniqueViolation — bedakan bentrok email/telepon dari kegagalan database lain,
// supaya server yang bermasalah tidak dilaporkan sebagai "email sudah terdaftar".
func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return true
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate key") ||
		strings.Contains(msg, "unique constraint") ||
		strings.Contains(msg, "sqlstate 23505")
}
