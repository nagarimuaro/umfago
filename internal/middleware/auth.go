package middleware

import (
	"errors"
	"net/http"

	"openjek-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// CurrentUserKey — key context tempat user lengkap disimpan oleh LoadUser
const CurrentUserKey = "current_user"

// LoadUser — ambil user lengkap (role aktif + permission + daftar role) dari DB
// dan simpan ke context. Dipakai sebagai dasar RequirePermission, sekaligus
// memastikan akun yang di-suspend langsung kehilangan akses tanpa menunggu
// access token kedaluwarsa.
//
// Gunakan setelah JWTAuth.
func LoadUser(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, exists := c.Get(CurrentUserKey); exists {
			c.Next()
			return
		}

		user, err := loadUser(db, c)
		if err != nil {
			abortWithUserError(c, err)
			return
		}

		c.Set(CurrentUserKey, user)
		c.Next()
	}
}

// RequirePermission — pastikan ROLE AKTIF user punya semua permission yang diminta.
// Gunakan setelah JWTAuth.
func RequirePermission(db *gorm.DB, perms ...models.PermissionCode) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := GetCurrentUserFromCtx(c)
		if user == nil {
			loaded, err := loadUser(db, c)
			if err != nil {
				abortWithUserError(c, err)
				return
			}
			user = loaded
			c.Set(CurrentUserKey, user)
		}

		for _, perm := range perms {
			if !user.HasPermission(perm) {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
					"error":      "Forbidden",
					"message":    "You don't have permission to perform this action",
					"permission": perm,
				})
				return
			}
		}

		c.Next()
	}
}

// RequireAnyPermission — pastikan role aktif punya SALAH SATU permission yang diminta.
func RequireAnyPermission(db *gorm.DB, perms ...models.PermissionCode) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := GetCurrentUserFromCtx(c)
		if user == nil {
			loaded, err := loadUser(db, c)
			if err != nil {
				abortWithUserError(c, err)
				return
			}
			user = loaded
			c.Set(CurrentUserKey, user)
		}

		for _, perm := range perms {
			if user.HasPermission(perm) {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error":   "Forbidden",
			"message": "You don't have permission to perform this action",
		})
	}
}

// RequireRole — batasi akses berdasarkan ROLE AKTIF user.
//
// Membaca klaim dari JWT, jadi tidak menyentuh database. Konsekuensinya, ganti
// role baru berlaku setelah token di-refresh — karena itu endpoint switch role
// menerbitkan token baru seketika. Untuk rute yang butuh status akun real-time,
// pasang LoadUser di depannya.
func RequireRole(roles ...models.RoleCode) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Bila LoadUser sudah jalan, pakai data DB yang lebih baru
		currentRole := models.RoleCode(c.GetString(UserRoleKey))
		if user := GetCurrentUserFromCtx(c); user != nil {
			currentRole = user.RoleCode
		}

		for _, r := range roles {
			if currentRole == r {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error":   "Forbidden",
			"message": "Your active role does not have access to this resource",
		})
	}
}

// RequireAdminGroup — batasi akses ke semua role bergrup "admin".
// Daftar role admin diturunkan dari definisi role di models, bukan hardcode,
// sehingga menambah role admin baru tidak perlu mengubah middleware ini.
func RequireAdminGroup() gin.HandlerFunc {
	return func(c *gin.Context) {
		currentRole := models.RoleCode(c.GetString(UserRoleKey))
		if user := GetCurrentUserFromCtx(c); user != nil {
			currentRole = user.RoleCode
		}

		if !models.IsAdminRole(currentRole) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":   "Forbidden",
				"message": "Admin access required",
			})
			return
		}
		c.Next()
	}
}

// RequireDriver — batasi akses ke role driver (motor maupun mobil)
func RequireDriver() gin.HandlerFunc {
	return RequireRole(models.RoleDriverMotorcycle, models.RoleDriverCar)
}

// GetCurrentUserFromCtx — ambil user lengkap dari context (diisi oleh LoadUser
// atau RequirePermission). Mengembalikan nil bila belum dimuat.
func GetCurrentUserFromCtx(c *gin.Context) *models.User {
	if user, exists := c.Get(CurrentUserKey); exists {
		if u, ok := user.(*models.User); ok {
			return u
		}
	}
	return nil
}

// errAccountSuspended — akun ada tapi sudah dinonaktifkan
var errAccountSuspended = errors.New("account suspended")

func loadUser(db *gorm.DB, c *gin.Context) (*models.User, error) {
	userID := c.GetUint(UserIDKey)
	if userID == 0 {
		return nil, gorm.ErrRecordNotFound
	}

	var user models.User
	if err := db.Preload("Role.Permissions").Preload("Roles").First(&user, userID).Error; err != nil {
		return nil, err
	}

	if !user.IsActive {
		return nil, errAccountSuspended
	}

	return &user, nil
}

func abortWithUserError(c *gin.Context, err error) {
	if errors.Is(err, errAccountSuspended) {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error":   "Account suspended",
			"message": "Your account has been deactivated. Please contact support.",
		})
		return
	}
	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
}
