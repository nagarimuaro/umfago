package handlers_test

import (
	"net/http"
	"testing"
	"time"

	"openjek-backend/internal/models"
	"openjek-backend/internal/testutil"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// driverStatusFixture — satu driver terverifikasi dan router siap pakai
type driverStatusFixture struct {
	db       *gorm.DB
	router   *gin.Engine
	token    string
	driverID uint
}

func newDriverStatusFixture(t *testing.T, verified bool) driverStatusFixture {
	t.Helper()
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	const email = "status-driver@test.com"
	token := createUserWithRoleAndLoginInDB(t, db, router, email, models.RoleDriverMotorcycle)
	driverID := userIDByEmail(t, db, email)

	if verified {
		if err := db.Model(&models.User{}).Where("id = ?", driverID).
			Update("is_verified", true).Error; err != nil {
			t.Fatal("failed to verify driver:", err)
		}
	}

	return driverStatusFixture{db: db, router: router, token: token, driverID: driverID}
}

func (f driverStatusFixture) setStatus(t *testing.T, status string) (int, map[string]interface{}) {
	t.Helper()
	w := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodPut, "/api/driver/status", map[string]string{"status": status}, f.token))
	return w.Code, testutil.ParseJSON(w)
}

func (f driverStatusFixture) reloadDriver(t *testing.T) models.User {
	t.Helper()
	var user models.User
	if err := f.db.First(&user, f.driverID).Error; err != nil {
		t.Fatal("failed to reload driver:", err)
	}
	return user
}

func TestDriverStatus_GoOnlineSetsFlagAndTimestamp(t *testing.T) {
	f := newDriverStatusFixture(t, true)

	code, body := f.setStatus(t, "online")
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %v", code, body)
	}

	driver := f.reloadDriver(t)
	if !driver.IsOnline {
		t.Error("expected is_online to be true")
	}
	if driver.OnlineSince == nil {
		t.Error("expected online_since to be set")
	}
}

func TestDriverStatus_GoOfflineClearsFlagAndTimestamp(t *testing.T) {
	f := newDriverStatusFixture(t, true)

	if code, body := f.setStatus(t, "online"); code != http.StatusOK {
		t.Fatalf("failed to go online: %d %v", code, body)
	}
	if code, body := f.setStatus(t, "offline"); code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %v", code, body)
	}

	driver := f.reloadDriver(t)
	if driver.IsOnline {
		t.Error("expected is_online to be false")
	}
	// online_since dikosongkan agar sapuan berkala tidak salah menilai driver
	// yang memang sengaja offline.
	if driver.OnlineSince != nil {
		t.Error("expected online_since to be cleared")
	}
}

// Driver yang belum lolos KYC tidak boleh mulai menerima order, sebab
// matching worker hanya menyaring is_verified — bila endpoint ini permisif,
// driver bisa menyalakan status dan menunggu verifikasi yang tidak pernah datang.
func TestDriverStatus_UnverifiedDriverCannotGoOnline(t *testing.T) {
	f := newDriverStatusFixture(t, false)

	code, body := f.setStatus(t, "online")
	if code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %v", code, body)
	}
	if f.reloadDriver(t).IsOnline {
		t.Error("expected unverified driver to stay offline")
	}
	if _, ok := body["kyc_status"]; !ok {
		t.Error("expected response to include kyc_status")
	}
}

// Driver yang belum terverifikasi tetap boleh menyatakan diri offline; menolak
// permintaan ini hanya akan membuat status yang menggantung tidak bisa dibereskan.
func TestDriverStatus_UnverifiedDriverCanGoOffline(t *testing.T) {
	f := newDriverStatusFixture(t, false)

	if code, body := f.setStatus(t, "offline"); code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %v", code, body)
	}
}

func TestDriverStatus_RejectsUnknownStatus(t *testing.T) {
	f := newDriverStatusFixture(t, true)

	code, body := f.setStatus(t, "busy")
	if code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d: %v", code, body)
	}
	if _, ok := body["allowed_values"]; !ok {
		t.Error("expected response to list allowed_values")
	}
}

// Driver yang masih mengantar penumpang tidak boleh menghilang dari sistem,
// karena penumpangnya kehilangan cara melacak perjalanan yang sedang berjalan.
func TestDriverStatus_CannotGoOfflineWithOngoingOrder(t *testing.T) {
	f := newDriverStatusFixture(t, true)

	if code, body := f.setStatus(t, "online"); code != http.StatusOK {
		t.Fatalf("failed to go online: %d %v", code, body)
	}

	const riderEmail = "status-rider@test.com"
	createUserWithRoleAndLoginInDB(t, f.db, f.router, riderEmail, models.RoleCustomer)
	riderID := userIDByEmail(t, f.db, riderEmail)
	seedOrder(t, f.db, models.Order{
		RiderID:  riderID,
		DriverID: &f.driverID,
		Status:   models.StatusInProgress,
	})

	code, body := f.setStatus(t, "offline")
	if code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %v", code, body)
	}
	if !f.reloadDriver(t).IsOnline {
		t.Error("expected driver to remain online while an order is ongoing")
	}
}

// Status hanya boleh diubah oleh pemilik akun; permintaan tanpa token harus
// ditolak sebelum menyentuh database.
func TestDriverStatus_RequiresAuthentication(t *testing.T) {
	f := newDriverStatusFixture(t, true)

	w := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodPut, "/api/driver/status", map[string]string{"status": "online"}, ""))
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

// Customer tidak punya status online; penjaga peran harus menolaknya.
func TestDriverStatus_RejectsNonDriverRole(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	token := createUserWithRoleAndLoginInDB(t, db, router, "status-customer@test.com", models.RoleCustomer)

	w := testutil.Do(router, testutil.JSONRequest(
		http.MethodPut, "/api/driver/status", map[string]string{"status": "online"}, token))
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %s", w.Code, w.Body.String())
	}
}

// Menyalakan status dua kali berturut-turut harus memperbarui online_since,
// karena sapuan berkala memakai nilai itu sebagai bukti kehadiran terakhir.
func TestDriverStatus_GoingOnlineTwiceRefreshesTimestamp(t *testing.T) {
	f := newDriverStatusFixture(t, true)

	if code, body := f.setStatus(t, "online"); code != http.StatusOK {
		t.Fatalf("failed to go online: %d %v", code, body)
	}
	first := f.reloadDriver(t).OnlineSince
	if first == nil {
		t.Fatal("expected online_since to be set")
	}

	// Mundurkan nilai di database agar perbedaannya terlihat tanpa menunggu.
	past := first.Add(-10 * time.Minute)
	if err := f.db.Model(&models.User{}).Where("id = ?", f.driverID).
		Update("online_since", past).Error; err != nil {
		t.Fatal("failed to backdate online_since:", err)
	}

	if code, body := f.setStatus(t, "online"); code != http.StatusOK {
		t.Fatalf("failed to go online again: %d %v", code, body)
	}

	second := f.reloadDriver(t).OnlineSince
	if second == nil {
		t.Fatal("expected online_since to remain set")
	}
	if !second.After(past) {
		t.Errorf("expected online_since to be refreshed, got %v", second)
	}
}
