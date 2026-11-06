package test

import (
	"net/http"
	"testing"
	"time"

	"openjek-backend/internal/models"
	"openjek-backend/internal/testutil"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// rejectFixture — satu order yang sedang dicarikan driver, dua driver
// terverifikasi, dan router siap pakai.
type rejectFixture struct {
	db     *gorm.DB
	router *gin.Engine

	riderID       uint
	driverToken   string
	driverID      uint
	otherToken    string
	otherDriverID uint
	orderUUID     string
}

func newRejectFixture(t *testing.T) rejectFixture {
	t.Helper()
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	const (
		riderEmail  = "reject-rider@test.com"
		driverEmail = "reject-driver@test.com"
		otherEmail  = "reject-driver2@test.com"
	)

	createUserWithRoleAndLoginInDB(t, db, router, riderEmail, models.RoleCustomer)
	driverToken := createUserWithRoleAndLoginInDB(t, db, router, driverEmail, models.RoleDriverMotorcycle)
	otherToken := createUserWithRoleAndLoginInDB(t, db, router, otherEmail, models.RoleDriverMotorcycle)

	f := rejectFixture{
		db:            db,
		router:        router,
		riderID:       userIDByEmail(t, db, riderEmail),
		driverToken:   driverToken,
		driverID:      userIDByEmail(t, db, driverEmail),
		otherToken:    otherToken,
		otherDriverID: userIDByEmail(t, db, otherEmail),
	}

	if err := db.Model(&models.User{}).
		Where("id IN ?", []uint{f.driverID, f.otherDriverID}).
		Updates(map[string]interface{}{"is_verified": true, "is_online": true}).Error; err != nil {
		t.Fatal("failed to prepare drivers:", err)
	}

	order := seedOrder(t, db, models.Order{
		RiderID:     f.riderID,
		Status:      models.StatusSearching,
		VehicleType: models.VehicleMotorcycle,
		FareAmount:  15000,
	})
	f.orderUUID = order.UUID

	return f
}

// offer — catat sebuah tawaran yang masih menunggu jawaban
func (f rejectFixture) offer(t *testing.T, driverID uint) models.OrderOffer {
	t.Helper()
	offer := models.OrderOffer{
		OrderUUID: f.orderUUID,
		DriverID:  driverID,
		Status:    models.OfferOffered,
		ExpiresAt: time.Now().Add(30 * time.Second),
	}
	if err := f.db.Create(&offer).Error; err != nil {
		t.Fatal("failed to seed offer:", err)
	}
	return offer
}

func (f rejectFixture) reject(t *testing.T, token string, body interface{}) (int, map[string]interface{}) {
	t.Helper()
	w := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodPut, "/api/orders/"+f.orderUUID+"/reject", body, token))
	return w.Code, testutil.ParseJSON(w)
}

func (f rejectFixture) reloadOffer(t *testing.T, driverID uint) models.OrderOffer {
	t.Helper()
	var offer models.OrderOffer
	if err := f.db.Where("order_uuid = ? AND driver_id = ?", f.orderUUID, driverID).
		First(&offer).Error; err != nil {
		t.Fatal("offer not found:", err)
	}
	return offer
}

func (f rejectFixture) reloadOrder(t *testing.T) models.Order {
	t.Helper()
	var order models.Order
	if err := f.db.Where("uuid = ?", f.orderUUID).First(&order).Error; err != nil {
		t.Fatal("order not found:", err)
	}
	return order
}

// Menolak tawaran tidak boleh membatalkan order: penumpang tetap dicarikan
// driver lain, dan hanya baris tawaran milik driver ini yang berubah.
func TestRejectOrder_MarksOfferRejectedAndKeepsOrderSearching(t *testing.T) {
	f := newRejectFixture(t)
	f.offer(t, f.driverID)

	code, body := f.reject(t, f.driverToken, map[string]string{"reason": "terlalu_jauh"})
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %v", code, body)
	}
	if body["rejected_by_this_driver"] != true {
		t.Errorf("expected rejected_by_this_driver to be true, got %v", body)
	}

	offer := f.reloadOffer(t, f.driverID)
	if offer.Status != models.OfferRejected {
		t.Errorf("expected offer status rejected, got %s", offer.Status)
	}
	if offer.Reason != "terlalu_jauh" {
		t.Errorf("expected reason to be stored, got %q", offer.Reason)
	}

	if order := f.reloadOrder(t); order.Status != models.StatusSearching {
		t.Errorf("expected order to stay searching, got %s", order.Status)
	}
}

// Driver yang tidak pernah ditawari tidak boleh bisa memakai endpoint ini untuk
// memastikan sebuah order ada.
func TestRejectOrder_WithoutOfferReturns404(t *testing.T) {
	f := newRejectFixture(t)

	code, body := f.reject(t, f.driverToken, nil)
	if code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %v", code, body)
	}
}

func TestRejectOrder_UnknownOrderReturns404(t *testing.T) {
	f := newRejectFixture(t)

	w := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodPut, "/api/orders/does-not-exist/reject", nil, f.driverToken))
	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

func TestRejectOrder_SecondRejectionReturns409(t *testing.T) {
	f := newRejectFixture(t)
	f.offer(t, f.driverID)

	if code, body := f.reject(t, f.driverToken, nil); code != http.StatusOK {
		t.Fatalf("first rejection failed: %d %v", code, body)
	}

	code, body := f.reject(t, f.driverToken, nil)
	if code != http.StatusConflict {
		t.Fatalf("expected 409, got %d: %v", code, body)
	}
}

// Order yang sudah diambil driver lain tidak bisa ditolak lagi; jawabannya
// menyebut sebab itu supaya aplikasi driver bisa menjelaskannya.
func TestRejectOrder_AfterAnotherDriverAcceptedReturns409(t *testing.T) {
	f := newRejectFixture(t)
	f.offer(t, f.driverID)

	if err := f.db.Model(&models.Order{}).Where("uuid = ?", f.orderUUID).
		Updates(map[string]interface{}{
			"status":    models.StatusAccepted,
			"driver_id": f.otherDriverID,
		}).Error; err != nil {
		t.Fatal("failed to simulate acceptance:", err)
	}

	code, body := f.reject(t, f.driverToken, nil)
	if code != http.StatusConflict {
		t.Fatalf("expected 409, got %d: %v", code, body)
	}

	// Tawaran tetap 'offered': tidak ada penolakan yang benar-benar terjadi.
	if offer := f.reloadOffer(t, f.driverID); offer.Status != models.OfferOffered {
		t.Errorf("expected offer to stay offered, got %s", offer.Status)
	}
}

// Tawaran yang sudah kedaluwarsa tidak bisa ditolak belakangan.
func TestRejectOrder_ExpiredOfferReturns409(t *testing.T) {
	f := newRejectFixture(t)
	offer := f.offer(t, f.driverID)

	if err := f.db.Model(&models.OrderOffer{}).Where("id = ?", offer.ID).
		Update("status", models.OfferExpired).Error; err != nil {
		t.Fatal("failed to expire offer:", err)
	}

	code, body := f.reject(t, f.driverToken, nil)
	if code != http.StatusConflict {
		t.Fatalf("expected 409, got %d: %v", code, body)
	}
}

// Alasan yang kepanjangan dipangkas, bukan ditolak: penolakan lebih penting
// daripada teks bebasnya.
func TestRejectOrder_TruncatesLongReason(t *testing.T) {
	f := newRejectFixture(t)
	f.offer(t, f.driverID)

	long := ""
	for i := 0; i < 200; i++ {
		long += "x"
	}

	if code, body := f.reject(t, f.driverToken, map[string]string{"reason": long}); code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %v", code, body)
	}

	if got := len(f.reloadOffer(t, f.driverID).Reason); got != 100 {
		t.Errorf("expected reason to be truncated to 100 chars, got %d", got)
	}
}

// Penolakan satu driver tidak boleh mengubah tawaran milik driver lain.
func TestRejectOrder_DoesNotTouchOtherDriversOffer(t *testing.T) {
	f := newRejectFixture(t)
	f.offer(t, f.driverID)
	f.offer(t, f.otherDriverID)

	if code, body := f.reject(t, f.driverToken, nil); code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %v", code, body)
	}

	if offer := f.reloadOffer(t, f.otherDriverID); offer.Status != models.OfferOffered {
		t.Errorf("expected other driver's offer to stay offered, got %s", offer.Status)
	}
}

func TestRejectOrder_RequiresDriverRole(t *testing.T) {
	f := newRejectFixture(t)
	f.offer(t, f.driverID)

	customerToken := createUserWithRoleAndLoginInDB(t, f.db, f.router,
		"reject-customer@test.com", models.RoleCustomer)

	code, body := f.reject(t, customerToken, nil)
	if code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %v", code, body)
	}
}

func TestRejectOrder_RequiresAuthentication(t *testing.T) {
	f := newRejectFixture(t)

	code, body := f.reject(t, "", nil)
	if code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %v", code, body)
	}
}

// Driver yang menerima order menutup tawarannya sendiri, sehingga catatan
// tawaran tidak menyimpang dari keadaan order.
func TestAcceptOrder_MarksOfferAccepted(t *testing.T) {
	f := newRejectFixture(t)
	f.offer(t, f.driverID)

	w := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodPut, "/api/orders/"+f.orderUUID+"/accept", nil, f.driverToken))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	if offer := f.reloadOffer(t, f.driverID); offer.Status != models.OfferAccepted {
		t.Errorf("expected offer status accepted, got %s", offer.Status)
	}
}
