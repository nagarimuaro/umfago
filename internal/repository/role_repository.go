package repository

import (
	"errors"
	"fmt"
	"log"
	"os"
	"strings"

	"openjek-backend/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	// ErrRoleNotAssigned dikembalikan saat user mencoba memakai role yang tidak dimilikinya
	ErrRoleNotAssigned = errors.New("role is not assigned to this user")
	// ErrUnknownRole dikembalikan saat kode role tidak dikenal sistem
	ErrUnknownRole = errors.New("unknown role code")
	// ErrActiveRole dikembalikan saat role yang sedang dipakai user hendak dicabut
	ErrActiveRole = errors.New("cannot revoke the role that is currently active")
)

// SeedRolesAndPermissions — isi tabel roles dan permissions jika belum ada
func SeedRolesAndPermissions(db *gorm.DB) {
	// 1. Seed semua permissions
	for _, perm := range models.AllPermissions {
		var count int64
		db.Model(&models.Permission{}).Where("code = ?", perm.Code).Count(&count)
		if count == 0 {
			if err := db.Create(&perm).Error; err != nil {
				log.Printf("[Seed] Failed to create permission %s: %v", perm.Code, err)
			}
		}
	}
	log.Println("[Seed] Permissions seeded")

	// 2. Seed semua roles beserta relasi permission-nya
	for _, entry := range models.SeedRoles {
		role := entry.Role

		var existing models.Role
		err := db.Where("code = ?", role.Code).First(&existing).Error

		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			if err := db.Create(&role).Error; err != nil {
				log.Printf("[Seed] Failed to create role %s: %v", role.Code, err)
				continue
			}
			existing = role
		case err != nil:
			// Error selain "tidak ditemukan" — jangan lanjut memakai record kosong,
			// karena Association.Replace pada ID 0 akan merusak data.
			log.Printf("[Seed] Failed to read role %s: %v", role.Code, err)
			continue
		default:
			// Role sudah ada — pastikan nama dan grupnya tetap sinkron dengan kode
			db.Model(&existing).Updates(map[string]interface{}{
				"name":  role.Name,
				"group": role.Group,
			})
		}

		// Ambil permission objects dari DB berdasarkan kode
		var perms []models.Permission
		if len(entry.Permissions) > 0 {
			db.Where("code IN ?", permCodesToStrings(entry.Permissions)).Find(&perms)
		}

		// Set asosiasi M2M. Dipanggil juga saat perms kosong agar role yang
		// permission-nya dicabut di kode ikut kehilangan permission di DB.
		if err := db.Model(&existing).Association("Permissions").Replace(perms); err != nil {
			log.Printf("[Seed] Failed to sync permissions for role %s: %v", role.Code, err)
		}
	}
	log.Println("[Seed] Roles and permissions seeded")

	// 3. Backfill: pastikan setiap user punya baris user_roles untuk role aktifnya.
	// Diperlukan agar akun yang dibuat sebelum skema multi-role tetap bisa login.
	backfillUserRoles(db)
}

// SeedAdminAccount — buat atau pastikan akun Super Admin ada bila ADMIN_EMAIL
// dan ADMIN_PASSWORD disetel di environment. Idempoten.
func SeedAdminAccount(db *gorm.DB) {
	email := strings.TrimSpace(os.Getenv("ADMIN_EMAIL"))
	pass := os.Getenv("ADMIN_PASSWORD")
	name := strings.TrimSpace(os.Getenv("ADMIN_NAME"))
	if email == "" || pass == "" {
		return
	}
	if name == "" {
		name = "Super Admin"
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(pass), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("[Seed] Failed to hash ADMIN_PASSWORD: %v", err)
		return
	}

	var user models.User
	err = db.Where("email = ?", email).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		user = models.User{
			Name:       name,
			Email:      email,
			Phone:      "080000000000",
			Password:   string(hashed),
			RoleCode:   models.RoleSuperAdmin,
			IsActive:   true,
			IsVerified: true,
		}
		if err := db.Create(&user).Error; err != nil {
			log.Printf("[Seed] Failed to create admin account %s: %v", email, err)
			return
		}
	} else if err == nil {
		db.Model(&user).Updates(map[string]interface{}{
			"password":  string(hashed),
			"role_code": models.RoleSuperAdmin,
			"is_active": true,
		})
	} else {
		return
	}

	roleRepo := NewRoleRepository(db)
	for _, entry := range models.SeedRoles {
		if entry.Role.Group == models.RoleGroupAdmin {
			_ = roleRepo.AssignRole(user.ID, entry.Role.Code)
		}
	}
	log.Printf("[Seed] Admin account ready: %s (all admin roles assigned)", email)
}

// backfillUserRoles — tambahkan role aktif setiap user ke pivot user_roles bila belum ada
func backfillUserRoles(db *gorm.DB) {
	var users []models.User
	if err := db.Select("id", "role_code").Find(&users).Error; err != nil {
		log.Printf("[Seed] Failed to list users for backfill: %v", err)
		return
	}

	added := 0
	for _, u := range users {
		roleID, err := roleIDByCode(db, u.RoleCode)
		if err != nil {
			continue
		}

		var count int64
		db.Model(&models.UserRole{}).Where("user_id = ? AND role_id = ?", u.ID, roleID).Count(&count)
		if count > 0 {
			continue
		}
		if err := db.Create(&models.UserRole{UserID: u.ID, RoleID: roleID}).Error; err == nil {
			added++
		}
	}
	if added > 0 {
		log.Printf("[Seed] Backfilled %d user_roles entries", added)
	}
}

// RoleRepository — operasi role pada level user
type RoleRepository struct {
	db *gorm.DB
}

func NewRoleRepository(db *gorm.DB) *RoleRepository {
	return &RoleRepository{db: db}
}

// AssignRole — berikan sebuah role kepada user. Idempoten.
func (r *RoleRepository) AssignRole(userID uint, code models.RoleCode) error {
	if !models.IsValidRoleCode(code) {
		return fmt.Errorf("%w: %s", ErrUnknownRole, code)
	}

	// Keberadaan user diperiksa lebih dulu. Tanpa ini, permintaan untuk user
	// yang tidak ada tetap membuat baris user_roles yatim dan endpoint-nya
	// membalas sukses untuk sesuatu yang tidak terjadi.
	var exists int64
	if err := r.db.Model(&models.User{}).Where("id = ?", userID).Count(&exists).Error; err != nil {
		return err
	}
	if exists == 0 {
		return gorm.ErrRecordNotFound
	}

	roleID, err := roleIDByCode(r.db, code)
	if err != nil {
		return err
	}

	var count int64
	r.db.Model(&models.UserRole{}).Where("user_id = ? AND role_id = ?", userID, roleID).Count(&count)
	if count > 0 {
		return nil
	}
	return r.db.Create(&models.UserRole{UserID: userID, RoleID: roleID}).Error
}

// RevokeRole — cabut sebuah role dari user. Role yang sedang aktif tidak boleh dicabut.
func (r *RoleRepository) RevokeRole(userID uint, code models.RoleCode) error {
	var user models.User
	if err := r.db.First(&user, userID).Error; err != nil {
		return err
	}
	if user.RoleCode == code {
		return ErrActiveRole
	}

	roleID, err := roleIDByCode(r.db, code)
	if err != nil {
		return err
	}
	result := r.db.Where("user_id = ? AND role_id = ?", userID, roleID).Delete(&models.UserRole{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrRoleNotAssigned
	}
	return nil
}

// SwitchActiveRole — jadikan salah satu role milik user sebagai role aktif.
// Menolak role yang tidak dimiliki user, sehingga endpoint switch tidak bisa
// dipakai untuk menaikkan hak akses sendiri.
func (r *RoleRepository) SwitchActiveRole(userID uint, code models.RoleCode) (*models.User, error) {
	user, err := r.LoadUserWithRoles(userID)
	if err != nil {
		return nil, err
	}
	if !user.HasRole(code) {
		return nil, fmt.Errorf("%w: %s", ErrRoleNotAssigned, code)
	}
	if user.RoleCode == code {
		return user, nil
	}

	if err := r.db.Model(&models.User{}).Where("id = ?", userID).Update("role_code", code).Error; err != nil {
		return nil, err
	}
	return r.LoadUserWithRoles(userID)
}

// LoadUserWithRoles — ambil user lengkap dengan role aktif, permission role aktif,
// dan seluruh role yang dimilikinya.
func (r *RoleRepository) LoadUserWithRoles(userID uint) (*models.User, error) {
	var user models.User
	err := r.db.
		Preload("Role.Permissions").
		Preload("Roles").
		First(&user, userID).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func roleIDByCode(db *gorm.DB, code models.RoleCode) (uint, error) {
	var role models.Role
	if err := db.Where("code = ?", code).First(&role).Error; err != nil {
		return 0, fmt.Errorf("%w: %s", ErrUnknownRole, code)
	}
	return role.ID, nil
}

func permCodesToStrings(codes []models.PermissionCode) []string {
	result := make([]string, len(codes))
	for i, c := range codes {
		result[i] = string(c)
	}
	return result
}
