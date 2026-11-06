package test

import (
	"net/http"
	"strconv"
	"testing"
	"time"

	"openjek-backend/internal/models"
	"openjek-backend/internal/testutil"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// promoFixture — satu penumpang bersaldo dan router siap pakai
type promoFixture struct {
	db     *gorm.DB
	router *gin.Engine
	token  string
	userID uint
}

func newPromoFixture(t *testing.T) promoFixture {
	t.Helper()
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	const email = "promo-customer@test.com"
	token := createUserWithRoleAndLoginInDB(t, db, router, email, models.RoleCustomer)
	userID := userIDByEmail(t, db, email)
	setBalance(t, db, userID, 100000)

	return promoFixture{db: db, router: router, token: token, userID: userID}
}

// seedPromo — simpan promo dengan nilai bawaan yang masuk akal, lalu terapkan
// penyesuaian dari pemanggil.
func (f promoFixture) seedPromo(t *testing.T, adjust func(*models.Promo)) models.Promo {
	t.Helper()
	promo := models.Promo{
		Code:          "HEMAT10",
		Name:          "Hemat 10 ribu",
		DiscountType:  models.DiscountFixed,
		DiscountValue: 3000,
		PerUserLimit:  1,
		IsActive:      true,
		StartsAt:      time.Now().Add(-time.Hour),
		EndsAt:        time.Now().Add(time.Hour),
	}
	if adjust != nil {
		adjust(&promo)
	}
	promo.Code = models.NormalizeCode(promo.Code)
	if err := f.db.Create(&promo).Error; err != nil {
		t.Fatal("failed to seed promo:", err)
	}
	return promo
}

func (f promoFixture) validate(t *testing.T, code string, fare float64) (int, map[string]interface{}) {
	t.Helper()
	w := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodPost, "/api/promos/validate", map[string]interface{}{
			"code":                 code,
			"fare_before_discount": fare,
		}, f.token))
	return w.Code, testutil.ParseJSON(w)
}

// createOrder — order jarak pendek dengan pembayaran dompet, sehingga tarifnya
// jatuh ke tarif minimum dan potongan promo terlihat jelas pada saldo.
func (f promoFixture) createOrder(t *testing.T, promoCode string) (int, map[string]interface{}) {
	t.Helper()
	payload := map[string]interface{}{
		"service_type":   "ride",
		"pickup_lat":     -6.200000,
		"pickup_lon":     106.816666,
		"dropoff_lat":    -6.210000,
		"dropoff_lon":    106.820000,
		"payment_method": "wallet",
	}
	if promoCode != "" {
		payload["promo_code"] = promoCode
	}
	w := testutil.Do(f.router, testutil.JSONRequest(http.MethodPost, "/api/orders", payload, f.token))
	return w.Code, testutil.ParseJSON(w)
}

func (f promoFixture) balance(t *testing.T) float64 {
	t.Helper()
	var user models.User
	if err := f.db.First(&user, f.userID).Error; err != nil {
		t.Fatal("failed to reload user:", err)
	}
	return user.Balance
}

func (f promoFixture) usedCount(t *testing.T, promoID uint) int {
	t.Helper()
	var promo models.Promo
	if err := f.db.First(&promo, promoID).Error; err != nil {
		t.Fatal("failed to reload promo:", err)
	}
	return promo.UsedCount
}

// ── Validasi ────────────────────────────────────────────────────────────────

func TestPromoValidate_ValidCodeReturnsDiscount(t *testing.T) {
	f := newPromoFixture(t)
	f.seedPromo(t, nil)

	code, body := f.validate(t, "hemat10", 15000)
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %v", code, body)
	}
	if body["valid"] != true {
		t.Errorf("expected valid to be true, got %v", body)
	}
	if body["discount_amount"] != 3000.0 {
		t.Errorf("expected discount 3000, got %v", body["discount_amount"])
	}
	if body["final_fare"] != 12000.0 {
		t.Errorf("expected final_fare 12000, got %v", body["final_fare"])
	}
}

// Potongan persen dibatasi max_discount agar tidak menghabiskan tarif.
func TestPromoValidate_PercentDiscountRespectsCap(t *testing.T) {
	f := newPromoFixture(t)
	f.seedPromo(t, func(p *models.Promo) {
		p.DiscountType = models.DiscountPercent
		p.DiscountValue = 50
		p.MaxDiscount = 5000
	})

	code, body := f.validate(t, "HEMAT10", 20000)
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %v", code, body)
	}
	if body["discount_amount"] != 5000.0 {
		t.Errorf("expected discount capped at 5000, got %v", body["discount_amount"])
	}
}

func TestPromoValidate_UnknownCodeReturns404(t *testing.T) {
	f := newPromoFixture(t)

	code, body := f.validate(t, "TIDAKADA", 15000)
	if code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %v", code, body)
	}
	if body["valid"] != false {
		t.Errorf("expected valid to be false, got %v", body)
	}
}

func TestPromoValidate_ExpiredCodeReturns410(t *testing.T) {
	f := newPromoFixture(t)
	f.seedPromo(t, func(p *models.Promo) {
		p.StartsAt = time.Now().Add(-48 * time.Hour)
		p.EndsAt = time.Now().Add(-24 * time.Hour)
	})

	code, body := f.validate(t, "HEMAT10", 15000)
	if code != http.StatusGone {
		t.Fatalf("expected 410, got %d: %v", code, body)
	}
}

// Promo yang dinonaktifkan admin diperlakukan sama dengan yang lewat masa
// berlaku: tidak bisa dipakai, dan bukan salah ketik.
func TestPromoValidate_InactiveCodeReturns410(t *testing.T) {
	f := newPromoFixture(t)
	f.seedPromo(t, func(p *models.Promo) { p.IsActive = false })

	code, body := f.validate(t, "HEMAT10", 15000)
	if code != http.StatusGone {
		t.Fatalf("expected 410, got %d: %v", code, body)
	}
}

func TestPromoValidate_ExhaustedQuotaReturns409(t *testing.T) {
	f := newPromoFixture(t)
	f.seedPromo(t, func(p *models.Promo) {
		p.Quota = 5
		p.UsedCount = 5
	})

	code, body := f.validate(t, "HEMAT10", 15000)
	if code != http.StatusConflict {
		t.Fatalf("expected 409, got %d: %v", code, body)
	}
}

func TestPromoValidate_PerUserLimitReturns409(t *testing.T) {
	f := newPromoFixture(t)
	promo := f.seedPromo(t, nil)

	if err := f.db.Create(&models.PromoUsage{
		PromoID:   promo.ID,
		UserID:    f.userID,
		OrderUUID: "earlier-order",
		Discount:  3000,
	}).Error; err != nil {
		t.Fatal("failed to seed usage:", err)
	}

	code, body := f.validate(t, "HEMAT10", 15000)
	if code != http.StatusConflict {
		t.Fatalf("expected 409, got %d: %v", code, body)
	}
}

// Batas per user berlaku per akun, bukan global: pemakaian orang lain tidak
// boleh menghalangi user ini.
func TestPromoValidate_OtherUsersUsageDoesNotBlock(t *testing.T) {
	f := newPromoFixture(t)
	promo := f.seedPromo(t, nil)

	const otherEmail = "promo-other@test.com"
	createUserWithRoleAndLoginInDB(t, f.db, f.router, otherEmail, models.RoleCustomer)
	otherID := userIDByEmail(t, f.db, otherEmail)

	if err := f.db.Create(&models.PromoUsage{
		PromoID:   promo.ID,
		UserID:    otherID,
		OrderUUID: "other-order",
		Discount:  3000,
	}).Error; err != nil {
		t.Fatal("failed to seed usage:", err)
	}

	code, body := f.validate(t, "HEMAT10", 15000)
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %v", code, body)
	}
}

func TestPromoValidate_FareBelowMinimumReturns422(t *testing.T) {
	f := newPromoFixture(t)
	f.seedPromo(t, func(p *models.Promo) { p.MinFare = 50000 })

	code, body := f.validate(t, "HEMAT10", 15000)
	if code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d: %v", code, body)
	}
}

// Validasi hanya membaca; mengunci kuota di sini akan menghabiskan kode hanya
// karena diketik-ketik di layar konfirmasi.
func TestPromoValidate_DoesNotConsumeQuota(t *testing.T) {
	f := newPromoFixture(t)
	promo := f.seedPromo(t, func(p *models.Promo) { p.Quota = 5 })

	if code, body := f.validate(t, "HEMAT10", 15000); code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %v", code, body)
	}

	if got := f.usedCount(t, promo.ID); got != 0 {
		t.Errorf("expected used_count to stay 0 after validation, got %d", got)
	}

	var usages int64
	f.db.Model(&models.PromoUsage{}).Where("promo_id = ?", promo.ID).Count(&usages)
	if usages != 0 {
		t.Errorf("expected no promo usage rows after validation, got %d", usages)
	}
}

func TestPromoValidate_RejectsDriverRole(t *testing.T) {
	f := newPromoFixture(t)
	f.seedPromo(t, nil)

	driverToken := createUserWithRoleAndLoginInDB(t, f.db, f.router,
		"promo-driver@test.com", models.RoleDriverMotorcycle)

	w := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodPost, "/api/promos/validate", map[string]interface{}{
			"code":                 "HEMAT10",
			"fare_before_discount": 15000,
		}, driverToken))
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %s", w.Code, w.Body.String())
	}
}

func TestPromoValidate_RequiresAuthentication(t *testing.T) {
	f := newPromoFixture(t)

	w := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodPost, "/api/promos/validate", map[string]interface{}{
			"code":                 "HEMAT10",
			"fare_before_discount": 15000,
		}, ""))
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

// ── Promo pada pembuatan order ──────────────────────────────────────────────

// Tarif jarak pendek jatuh ke tarif minimum 3 km x 3000 = 9000; promo 3000
// memotongnya menjadi 6000, dan saldo terdebit sebesar itu pula.
func TestCreateOrder_WithPromoReducesFareAndBalance(t *testing.T) {
	f := newPromoFixture(t)
	promo := f.seedPromo(t, nil)

	before := f.balance(t)

	code, body := f.createOrder(t, "HEMAT10")
	if code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %v", code, body)
	}

	order, ok := body["order"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected order in response, got %v", body)
	}
	if order["fare_amount"] != 6000.0 {
		t.Errorf("expected fare_amount 6000, got %v", order["fare_amount"])
	}
	if order["promo_discount"] != 3000.0 {
		t.Errorf("expected promo_discount 3000, got %v", order["promo_discount"])
	}
	if order["voucher_code"] != "HEMAT10" {
		t.Errorf("expected voucher_code HEMAT10, got %v", order["voucher_code"])
	}

	promoBlock, ok := body["promo"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected promo block in response, got %v", body)
	}
	if promoBlock["discount_amount"] != 3000.0 || promoBlock["final_fare"] != 6000.0 {
		t.Errorf("unexpected promo block: %v", promoBlock)
	}

	if after := f.balance(t); before-after != 6000 {
		t.Errorf("expected balance to drop by 6000, dropped by %v", before-after)
	}

	if got := f.usedCount(t, promo.ID); got != 1 {
		t.Errorf("expected used_count to rise by exactly one, got %d", got)
	}

	var usages int64
	f.db.Model(&models.PromoUsage{}).
		Where("promo_id = ? AND user_id = ?", promo.ID, f.userID).Count(&usages)
	if usages != 1 {
		t.Errorf("expected exactly one promo usage row, got %d", usages)
	}
}

// Nama lama voucher_code tetap diterima demi klien yang sudah beredar.
func TestCreateOrder_AcceptsLegacyVoucherCodeField(t *testing.T) {
	f := newPromoFixture(t)
	f.seedPromo(t, nil)

	payload := map[string]interface{}{
		"service_type":   "ride",
		"pickup_lat":     -6.200000,
		"pickup_lon":     106.816666,
		"dropoff_lat":    -6.210000,
		"dropoff_lon":    106.820000,
		"payment_method": "wallet",
		"voucher_code":   "HEMAT10",
	}
	w := testutil.Do(f.router, testutil.JSONRequest(http.MethodPost, "/api/orders", payload, f.token))
	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	order := testutil.ParseJSON(w)["order"].(map[string]interface{})
	if order["promo_discount"] != 3000.0 {
		t.Errorf("expected the legacy field to apply the promo, got %v", order["promo_discount"])
	}
}

// Kode yang tidak sah membatalkan seluruh transaksi: order tidak tercipta dan
// saldo tidak berkurang sepeser pun.
func TestCreateOrder_InvalidPromoCreatesNoOrder(t *testing.T) {
	f := newPromoFixture(t)
	before := f.balance(t)

	code, body := f.createOrder(t, "TIDAKADA")
	if code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %v", code, body)
	}

	var orders int64
	f.db.Model(&models.Order{}).Where("rider_id = ?", f.userID).Count(&orders)
	if orders != 0 {
		t.Errorf("expected no order to be created, got %d", orders)
	}

	if after := f.balance(t); after != before {
		t.Errorf("expected balance to be untouched, went from %v to %v", before, after)
	}
}

func TestCreateOrder_ExpiredPromoReturns410(t *testing.T) {
	f := newPromoFixture(t)
	f.seedPromo(t, func(p *models.Promo) {
		p.StartsAt = time.Now().Add(-48 * time.Hour)
		p.EndsAt = time.Now().Add(-24 * time.Hour)
	})

	code, body := f.createOrder(t, "HEMAT10")
	if code != http.StatusGone {
		t.Fatalf("expected 410, got %d: %v", code, body)
	}
}

// Batas per user ditegakkan pada pembuatan order, bukan hanya pada validasi.
func TestCreateOrder_SecondUseBeyondPerUserLimitIsRejected(t *testing.T) {
	f := newPromoFixture(t)
	promo := f.seedPromo(t, nil)

	if code, body := f.createOrder(t, "HEMAT10"); code != http.StatusCreated {
		t.Fatalf("first order failed: %d %v", code, body)
	}

	balanceAfterFirst := f.balance(t)

	code, body := f.createOrder(t, "HEMAT10")
	if code != http.StatusConflict {
		t.Fatalf("expected 409 on the second use, got %d: %v", code, body)
	}

	if after := f.balance(t); after != balanceAfterFirst {
		t.Errorf("expected balance to be untouched by the rejected order, got %v", after)
	}
	if got := f.usedCount(t, promo.ID); got != 1 {
		t.Errorf("expected used_count to stay 1, got %d", got)
	}

	var orders int64
	f.db.Model(&models.Order{}).Where("rider_id = ?", f.userID).Count(&orders)
	if orders != 1 {
		t.Errorf("expected exactly one order, got %d", orders)
	}
}

// Kuota yang habis menghentikan pemakaian walau batas per user masih tersisa.
func TestCreateOrder_ExhaustedQuotaReturns409(t *testing.T) {
	f := newPromoFixture(t)
	f.seedPromo(t, func(p *models.Promo) {
		p.Quota = 1
		p.UsedCount = 1
		p.PerUserLimit = 0
	})

	code, body := f.createOrder(t, "HEMAT10")
	if code != http.StatusConflict {
		t.Fatalf("expected 409, got %d: %v", code, body)
	}
}

// Order tanpa promo tetap berjalan seperti sebelumnya: tarif penuh, tanpa blok
// promo pada jawaban.
func TestCreateOrder_WithoutPromoIsUnchanged(t *testing.T) {
	f := newPromoFixture(t)
	before := f.balance(t)

	code, body := f.createOrder(t, "")
	if code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %v", code, body)
	}

	order := body["order"].(map[string]interface{})
	if order["fare_amount"] != 9000.0 {
		t.Errorf("expected the full minimum fare 9000, got %v", order["fare_amount"])
	}
	if order["promo_discount"] != 0.0 {
		t.Errorf("expected no discount, got %v", order["promo_discount"])
	}
	if _, ok := body["promo"]; ok {
		t.Errorf("expected no promo block for an order without a code, got %v", body["promo"])
	}
	if after := f.balance(t); before-after != 9000 {
		t.Errorf("expected balance to drop by the full fare, dropped by %v", before-after)
	}
}

// ── Pembuatan dan penyuntingan promo oleh admin ─────────────────────────────

// adminPromoFixture — satu admin promo dan router siap pakai.
type adminPromoFixture struct {
	db     *gorm.DB
	router *gin.Engine
	token  string
}

func newAdminPromoFixture(t *testing.T, prefix string) adminPromoFixture {
	t.Helper()
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	token := createUserWithRoleAndLoginInDB(
		t, db, router, prefix+"promo@admin.test", models.RoleSuperAdmin)
	return adminPromoFixture{db: db, router: router, token: token}
}

func (f adminPromoFixture) create(t *testing.T, payload map[string]interface{}) int {
	t.Helper()
	w := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodPost, "/api/admin/promos", payload, f.token))
	return w.Code
}

// validPromoPayload — promo yang lengkap dan masuk akal, sebagai dasar untuk
// mengganti satu field pada tiap kasus uji.
func validPromoPayload() map[string]interface{} {
	return map[string]interface{}{
		"code":           "ADMINHEMAT",
		"name":           "Hemat admin",
		"discount_type":  "fixed",
		"discount_value": 5000.0,
		"max_discount":   10000.0,
		"min_fare":       15000.0,
		"quota":          100,
		"per_user_limit": 2,
	}
}

// TestAdminPromo_NegativeBoundsRejected — models.Promo memperlakukan batas
// bernilai <= 0 sebagai "tanpa batas", jadi angka negatif justru mematikan
// plafon dan kuota alih-alih mengetatkannya.
func TestAdminPromo_NegativeBoundsRejected(t *testing.T) {
	f := newAdminPromoFixture(t, "negcreate-")

	negative := map[string]interface{}{
		"max_discount":   -1.0,
		"min_fare":       -0.5,
		"quota":          -10,
		"per_user_limit": -1,
	}

	for field, bad := range negative {
		payload := validPromoPayload()
		payload[field] = bad

		if code := f.create(t, payload); code != http.StatusUnprocessableEntity {
			t.Errorf("a negative %s must be 422, got %d", field, code)
		}
	}

	// discount_value nol atau negatif bukan potongan sama sekali.
	for _, bad := range []float64{0, -100} {
		payload := validPromoPayload()
		payload["discount_value"] = bad

		if code := f.create(t, payload); code != http.StatusUnprocessableEntity {
			t.Errorf("discount_value %v must be 422, got %d", bad, code)
		}
	}

	var count int64
	f.db.Model(&models.Promo{}).Count(&count)
	if count != 0 {
		t.Fatalf("rejected payloads must not create a promo, found %d", count)
	}

	// Nol tetap sah untuk keempat batas: artinya memang "tanpa batas".
	zeroed := validPromoPayload()
	zeroed["max_discount"] = 0.0
	zeroed["min_fare"] = 0.0
	zeroed["quota"] = 0
	zeroed["per_user_limit"] = 0

	if code := f.create(t, zeroed); code != http.StatusCreated {
		t.Fatalf("zero bounds mean unlimited and must be accepted, got %d", code)
	}
}

// TestAdminPromo_NegativeBoundsRejectedOnUpdate — penyuntingan memakai field
// penunjuk, sehingga batasnya diperiksa di dalam handler, bukan di lapisan
// binding. Field yang tidak dikirim harus tetap tidak tersentuh.
func TestAdminPromo_NegativeBoundsRejectedOnUpdate(t *testing.T) {
	f := newAdminPromoFixture(t, "negupdate-")

	if code := f.create(t, validPromoPayload()); code != http.StatusCreated {
		t.Fatalf("failed to seed a promo, got %d", code)
	}

	var promo models.Promo
	if err := f.db.First(&promo).Error; err != nil {
		t.Fatal("failed to reload the seeded promo:", err)
	}
	path := "/api/admin/promos/" + strconv.FormatUint(uint64(promo.ID), 10)

	negative := map[string]interface{}{
		"max_discount":   -1.0,
		"min_fare":       -0.5,
		"quota":          -10,
		"per_user_limit": -1,
		"discount_value": -5.0,
	}

	for field, bad := range negative {
		w := testutil.Do(f.router, testutil.JSONRequest(
			http.MethodPut, path, map[string]interface{}{field: bad}, f.token))
		if w.Code != http.StatusUnprocessableEntity {
			t.Errorf("a negative %s must be 422, got %d: %s", field, w.Code, w.Body.String())
		}
	}

	var after models.Promo
	if err := f.db.First(&after, promo.ID).Error; err != nil {
		t.Fatal("failed to reload the promo:", err)
	}
	if after.MaxDiscount != promo.MaxDiscount || after.MinFare != promo.MinFare ||
		after.Quota != promo.Quota || after.PerUserLimit != promo.PerUserLimit ||
		after.DiscountValue != promo.DiscountValue {
		t.Errorf("a rejected update must leave the promo untouched: %+v", after)
	}
}

func TestPromo_ListCustomer(t *testing.T) {
	f := newPromoFixture(t)
	f.seedPromo(t, func(p *models.Promo) {
		p.Code = "PROMOAKTIF"
		p.Name = "Promo Pelanggan Aktif"
		p.IsActive = true
	})

	// 1. With token (authenticated)
	w := testutil.Do(f.router, testutil.JSONRequest(http.MethodGet, "/api/promos", nil, f.token))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for GET /api/promos with token, got %d: %s", w.Code, w.Body.String())
	}

	// 2. Without token (public/guest user)
	wGuest := testutil.Do(f.router, testutil.JSONRequest(http.MethodGet, "/api/promos", nil, ""))
	if wGuest.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for GET /api/promos without token, got %d: %s", wGuest.Code, wGuest.Body.String())
	}
}
