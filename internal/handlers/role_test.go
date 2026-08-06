package handlers_test

import (
	"net/http"
	"testing"

	"openjek-backend/internal/models"
	"openjek-backend/internal/repository"
	"openjek-backend/internal/testutil"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func createUserWithRoleAndLoginInDB(t *testing.T, db *gorm.DB, router *gin.Engine, email string, role models.RoleCode) string {
	hashed, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	user := models.User{
		Name:     "Test User " + string(role),
		Email:    email,
		Phone:    "0899" + email, // pseudo random
		Password: string(hashed),
		RoleCode: role,
		IsActive: true,
	}

	if err := db.Create(&user).Error; err != nil {
		t.Fatal("failed to create user:", err)
	}

	// Role aktif juga harus tercatat di pivot user_roles, sama seperti alur
	// registrasi sungguhan. Tanpa ini, endpoint multi-role menganggap user
	// tidak memiliki role apa pun.
	if err := repository.NewRoleRepository(db).AssignRole(user.ID, role); err != nil {
		t.Fatal("failed to assign role:", err)
	}

	loginW := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/login", map[string]string{
		"email":    email,
		"password": "password123",
	}, ""))

	body := testutil.ParseJSON(loginW)
	token, ok := body["access_token"].(string)
	if !ok || token == "" {
		t.Fatalf("failed to get token: %v", loginW.Body.String())
	}

	return token
}

func createUserWithRoleAndLogin(t *testing.T, email string, role models.RoleCode) (*gin.Engine, string) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	token := createUserWithRoleAndLoginInDB(t, db, router, email, role)
	return router, token
}

func TestRBAC_SuperAdminHasAllAccess(t *testing.T) {
	router, token := createUserWithRoleAndLogin(t, "super@admin.com", models.RoleSuperAdmin)

	// Super admin mengakses manage settings (hanya super admin yg punya secara default)
	w := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/admin/settings", nil, token))
	if w.Code != http.StatusOK {
		t.Errorf("Super Admin should access settings, got %d", w.Code)
	}

	// Super admin mengakses manage drivers
	w2 := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/admin/drivers", nil, token))
	if w2.Code != http.StatusOK {
		t.Errorf("Super Admin should access drivers, got %d", w2.Code)
	}
}

func TestRBAC_FinanceHeadAccess(t *testing.T) {
	router, token := createUserWithRoleAndLogin(t, "finance@admin.com", models.RoleFinanceHead)

	// Punya akses ke orders view (di-assign di seed)
	w := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/admin/orders", nil, token))
	if w.Code != http.StatusOK {
		t.Errorf("Finance Head should access orders view, got %d", w.Code)
	}

	// TIDAK punya akses ke settings
	w2 := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/admin/settings", nil, token))
	if w2.Code != http.StatusForbidden {
		t.Errorf("Finance Head should NOT access settings, expected 403 got %d", w2.Code)
	}
}

func TestRBAC_DriverManagerAccess(t *testing.T) {
	router, token := createUserWithRoleAndLogin(t, "drivermgr@admin.com", models.RoleDriverManager)

	// Punya akses verifikasi driver (driver ID 999 tidak ada, jadi 404, tapi BUKAN 403)
	w := testutil.Do(router, testutil.JSONRequest(http.MethodPut, "/api/admin/drivers/999/verify", nil, token))
	if w.Code == http.StatusForbidden {
		t.Errorf("Driver Manager should have verify permission, expected 404 got 403")
	}
	if w.Code != http.StatusNotFound {
		t.Errorf("Expected 404 for non-existent driver, got %d", w.Code)
	}

	// TIDAK punya akses ke orders
	w2 := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/admin/orders", nil, token))
	if w2.Code != http.StatusForbidden {
		t.Errorf("Driver Manager should NOT access orders, expected 403 got %d", w2.Code)
	}
}

func TestRBAC_DriverCannotAccessAdmin(t *testing.T) {
	router, token := createUserWithRoleAndLogin(t, "driver@go.com", models.RoleDriverMotorcycle)

	// Driver (group "user") mencoba akses route admin
	w := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/admin/orders", nil, token))
	if w.Code != http.StatusForbidden {
		t.Errorf("Driver should be forbidden from admin group routes, expected 403 got %d", w.Code)
	}
}

// TestMultiRole_AddThenSwitch — customer menambah role driver lalu berpindah mode.
// Token baru harus langsung membawa role driver.
func TestMultiRole_AddThenSwitch(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	token := createUserWithRoleAndLoginInDB(t, db, router, "multirole@test.com", models.RoleCustomer)

	// Sebelum menambah role, perpindahan harus ditolak
	wEarly := testutil.Do(router, testutil.JSONRequest(http.MethodPut, "/api/users/active-role", map[string]string{
		"role": string(models.RoleDriverMotorcycle),
	}, token))
	if wEarly.Code != http.StatusForbidden {
		t.Fatalf("switching to an unowned role should be 403, got %d: %s", wEarly.Code, wEarly.Body.String())
	}

	wAdd := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/users/roles", map[string]string{
		"role": string(models.RoleDriverMotorcycle),
	}, token))
	if wAdd.Code != http.StatusOK {
		t.Fatalf("expected 200 when adding driver role, got %d: %s", wAdd.Code, wAdd.Body.String())
	}

	wSwitch := testutil.Do(router, testutil.JSONRequest(http.MethodPut, "/api/users/active-role", map[string]string{
		"role": string(models.RoleDriverMotorcycle),
	}, token))
	if wSwitch.Code != http.StatusOK {
		t.Fatalf("expected 200 when switching role, got %d: %s", wSwitch.Code, wSwitch.Body.String())
	}

	switchBody := testutil.ParseJSON(wSwitch)
	newToken, ok := switchBody["access_token"].(string)
	if !ok || newToken == "" {
		t.Fatalf("switch response must contain a new access token: %v", switchBody)
	}

	wUser := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/user", nil, newToken))
	userBody := testutil.ParseJSON(wUser)
	if userBody["active_role"] != string(models.RoleDriverMotorcycle) {
		t.Errorf("expected active_role driver_motorcycle, got %v", userBody["active_role"])
	}
	if roles, ok := userBody["available_roles"].([]interface{}); !ok || len(roles) != 2 {
		t.Errorf("expected 2 available roles, got %v", userBody["available_roles"])
	}
}

// TestMultiRole_CannotSelfAssignAdmin — role admin tidak boleh diambil sendiri.
func TestMultiRole_CannotSelfAssignAdmin(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	token := createUserWithRoleAndLoginInDB(t, db, router, "escalate@test.com", models.RoleCustomer)

	w := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/users/roles", map[string]string{
		"role": string(models.RoleSuperAdmin),
	}, token))
	if w.Code != http.StatusForbidden {
		t.Fatalf("self-assigning super_admin must be rejected, got %d: %s", w.Code, w.Body.String())
	}
}
