package handlers_test

import (
	"net/http"
	"strconv"
	"strings"
	"testing"
	"time"

	"openjek-backend/internal/models"
	"openjek-backend/internal/testutil"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// kycPayload — pengajuan KYC yang lengkap dan sah.
//
// Masa berlaku SIM dihitung relatif terhadap hari berjalan, bukan ditulis
// sebagai tanggal tetap, supaya berkas test ini tidak mulai gagal sendiri
// ketika tanggal yang di-hardcode terlewati.
func kycPayload() map[string]interface{} {
	return map[string]interface{}{
		"identity_card_number":           "3201010101010001",
		"identity_card_photo_url":        "https://cdn.example.com/ktp.jpg",
		"license_number":                 "SIM-0001",
		"license_expiry":                 time.Now().AddDate(2, 0, 0).Format("2006-01-02"),
		"license_photo_url":              "https://cdn.example.com/sim.jpg",
		"vehicle_registration_number":    "STNK-0001",
		"vehicle_registration_photo_url": "https://cdn.example.com/stnk.jpg",
		"selfie_photo_url":               "https://cdn.example.com/selfie.jpg",
		"bank_name":                      "BCA",
		"bank_account_number":            "1234567890",
		"bank_account_name":              "Test Driver",
	}
}

// userIDByEmail — ambil ID user langsung dari database.
// Dipakai untuk menyusun URL admin yang memerlukan ID driver.
func userIDByEmail(t *testing.T, db *gorm.DB, email string) uint {
	t.Helper()
	var user models.User
	if err := db.Where("email = ?", email).First(&user).Error; err != nil {
		t.Fatalf("user %s not found: %v", email, err)
	}
	return user.ID
}

func driverProfileOf(t *testing.T, db *gorm.DB, userID uint) models.DriverProfile {
	t.Helper()
	var profile models.DriverProfile
	if err := db.Where("user_id = ?", userID).First(&profile).Error; err != nil {
		t.Fatalf("driver profile for user %d not found: %v", userID, err)
	}
	return profile
}

func isVerified(t *testing.T, db *gorm.DB, userID uint) bool {
	t.Helper()
	var user models.User
	if err := db.First(&user, userID).Error; err != nil {
		t.Fatalf("user %d not found: %v", userID, err)
	}
	return user.IsVerified
}

// kycFixture — satu driver, satu super admin, dan router yang sudah siap.
type kycFixture struct {
	db          *gorm.DB
	router      *gin.Engine
	driverToken string
	adminToken  string
	driverID    uint
	adminID     uint
}

func newKYCFixture(t *testing.T, prefix string) kycFixture {
	t.Helper()
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	driverEmail := prefix + "driver@kyc.test"
	adminEmail := prefix + "admin@kyc.test"

	driverToken := createUserWithRoleAndLoginInDB(t, db, router, driverEmail, models.RoleDriverMotorcycle)
	adminToken := createUserWithRoleAndLoginInDB(t, db, router, adminEmail, models.RoleSuperAdmin)

	return kycFixture{
		db:          db,
		router:      router,
		driverToken: driverToken,
		adminToken:  adminToken,
		driverID:    userIDByEmail(t, db, driverEmail),
		adminID:     userIDByEmail(t, db, adminEmail),
	}
}

func (f kycFixture) submitKYC(t *testing.T, payload map[string]interface{}) int {
	t.Helper()
	w := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodPost, "/api/driver/kyc", payload, f.driverToken))
	return w.Code
}

func (f kycFixture) verifyDriver(t *testing.T) (int, map[string]interface{}) {
	t.Helper()
	w := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodPut, adminDriverPath(f.driverID, "/verify"), nil, f.adminToken))
	return w.Code, testutil.ParseJSON(w)
}

func adminDriverPath(id uint, suffix string) string {
	return "/api/admin/drivers/" + strconv.FormatUint(uint64(id), 10) + suffix
}

// TestDriverKYC_VerifyRejectedBeforeSubmission — tidak ada yang bisa disetujui
// selama driver belum menyerahkan berkas apa pun.
func TestDriverKYC_VerifyRejectedBeforeSubmission(t *testing.T) {
	f := newKYCFixture(t, "presubmit-")

	code, body := f.verifyDriver(t)
	if code != http.StatusConflict {
		t.Fatalf("verifying a driver without KYC must be 409, got %d: %v", code, body)
	}
	if isVerified(t, f.db, f.driverID) {
		t.Error("driver must not become verified without a KYC submission")
	}
}

// TestDriverKYC_IncompleteSubmissionRejected — pengajuan yang kurang satu
// dokumen pun ditolak sebelum menyentuh database.
func TestDriverKYC_IncompleteSubmissionRejected(t *testing.T) {
	f := newKYCFixture(t, "incomplete-")

	payload := kycPayload()
	delete(payload, "selfie_photo_url")

	if code := f.submitKYC(t, payload); code != http.StatusUnprocessableEntity {
		t.Fatalf("incomplete submission must be 422, got %d", code)
	}

	var count int64
	f.db.Model(&models.DriverProfile{}).Where("user_id = ?", f.driverID).Count(&count)
	if count != 0 {
		t.Error("a rejected submission must not create a driver profile")
	}
}

// TestDriverKYC_VerifyIncompleteProfileReports422 — profil yang berstatus
// pending tetapi datanya bolong tidak boleh bisa disetujui. Keadaan ini disusun
// langsung di database karena endpoint pengajuan sudah menutupnya lebih dulu;
// yang diuji di sini adalah lapisan pertahanan kedua di sisi admin.
func TestDriverKYC_VerifyIncompleteProfileReports422(t *testing.T) {
	f := newKYCFixture(t, "halfempty-")

	profile := models.DriverProfile{
		UserID:             f.driverID,
		IdentityCardNumber: "3201010101010001",
		KYCStatus:          models.KYCPending,
	}
	if err := f.db.Create(&profile).Error; err != nil {
		t.Fatal("failed to seed partial profile:", err)
	}

	code, body := f.verifyDriver(t)
	if code != http.StatusUnprocessableEntity {
		t.Fatalf("approving an incomplete KYC must be 422, got %d: %v", code, body)
	}
	missing, ok := body["missing_fields"].([]interface{})
	if !ok || len(missing) == 0 {
		t.Fatalf("response must list the missing fields, got %v", body["missing_fields"])
	}
	if isVerified(t, f.db, f.driverID) {
		t.Error("an incomplete KYC must never verify the driver")
	}
}

// TestDriverKYC_CompleteSubmissionBecomesPending — pengajuan lengkap masuk
// antrean tinjauan, dan status yang dikembalikan ke driver menyamarkan nomor
// rekening.
func TestDriverKYC_CompleteSubmissionBecomesPending(t *testing.T) {
	f := newKYCFixture(t, "complete-")

	if code := f.submitKYC(t, kycPayload()); code != http.StatusOK {
		t.Fatalf("complete submission must be 200, got %d", code)
	}

	profile := driverProfileOf(t, f.db, f.driverID)
	if profile.KYCStatus != models.KYCPending {
		t.Errorf("expected status pending, got %q", profile.KYCStatus)
	}
	if profile.KYCSubmittedAt == nil {
		t.Error("kyc_submitted_at must be recorded")
	}
	if isVerified(t, f.db, f.driverID) {
		t.Error("submitting KYC must not verify the driver on its own")
	}

	w := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodGet, "/api/driver/kyc", nil, f.driverToken))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 from KYC status, got %d", w.Code)
	}
	kyc, ok := testutil.ParseJSON(w)["kyc"].(map[string]interface{})
	if !ok {
		t.Fatal("response must contain a kyc object")
	}
	if kyc["status"] != string(models.KYCPending) {
		t.Errorf("expected pending, got %v", kyc["status"])
	}
	if kyc["bank_account_number"] != "******7890" {
		t.Errorf("account number must be masked, got %v", kyc["bank_account_number"])
	}
}

// TestDriverKYC_ExpiredLicenseRejected — SIM kedaluwarsa bukan dokumen yang
// bisa diverifikasi.
func TestDriverKYC_ExpiredLicenseRejected(t *testing.T) {
	f := newKYCFixture(t, "expired-")

	payload := kycPayload()
	payload["license_expiry"] = time.Now().AddDate(0, 0, -1).Format("2006-01-02")

	if code := f.submitKYC(t, payload); code != http.StatusUnprocessableEntity {
		t.Fatalf("expired license must be 422, got %d", code)
	}
}

// TestDriverKYC_PendingSubmissionCannotBeOverwritten — berkas yang sedang
// ditinjau tidak boleh berubah di bawah tangan peninjau.
func TestDriverKYC_PendingSubmissionCannotBeOverwritten(t *testing.T) {
	f := newKYCFixture(t, "pendinglock-")

	if code := f.submitKYC(t, kycPayload()); code != http.StatusOK {
		t.Fatalf("first submission must be 200, got %d", code)
	}

	second := kycPayload()
	second["bank_account_number"] = "9999999999"
	if code := f.submitKYC(t, second); code != http.StatusConflict {
		t.Fatalf("resubmitting while pending must be 409, got %d", code)
	}

	profile := driverProfileOf(t, f.db, f.driverID)
	if profile.BankAccountNumber != "1234567890" {
		t.Errorf("the pending submission must be untouched, got %q", profile.BankAccountNumber)
	}
}

// TestDriverKYC_ProfileEndpointLockedDuringReview — endpoint profil lama tidak
// boleh menjadi jalan pintas untuk menimpa data yang sudah diserahkan.
func TestDriverKYC_ProfileEndpointLockedDuringReview(t *testing.T) {
	f := newKYCFixture(t, "profilelock-")

	if code := f.submitKYC(t, kycPayload()); code != http.StatusOK {
		t.Fatalf("submission must be 200, got %d", code)
	}

	w := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodPut, "/api/profile/driver", map[string]interface{}{
			"identity_card_number": "0000000000000000",
			"license_number":       "SIM-FAKE",
		}, f.driverToken))
	if w.Code != http.StatusConflict {
		t.Fatalf("profile update during review must be 409, got %d: %s", w.Code, w.Body.String())
	}

	profile := driverProfileOf(t, f.db, f.driverID)
	if profile.IdentityCardNumber != "3201010101010001" {
		t.Errorf("identity number must be unchanged, got %q", profile.IdentityCardNumber)
	}
}

// TestDriverKYC_RejectionStoresReason — penolakan menyimpan alasannya dan tidak
// pernah menyalakan verifikasi.
func TestDriverKYC_RejectionStoresReason(t *testing.T) {
	f := newKYCFixture(t, "reject-")

	if code := f.submitKYC(t, kycPayload()); code != http.StatusOK {
		t.Fatalf("submission must be 200, got %d", code)
	}

	noReason := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodPut, adminDriverPath(f.driverID, "/reject-kyc"),
		map[string]interface{}{}, f.adminToken))
	if noReason.Code != http.StatusUnprocessableEntity {
		t.Fatalf("rejection without a reason must be 422, got %d", noReason.Code)
	}

	w := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodPut, adminDriverPath(f.driverID, "/reject-kyc"),
		map[string]interface{}{"reason": "Foto SIM buram"}, f.adminToken))
	if w.Code != http.StatusOK {
		t.Fatalf("rejection must be 200, got %d: %s", w.Code, w.Body.String())
	}

	profile := driverProfileOf(t, f.db, f.driverID)
	if profile.KYCStatus != models.KYCRejected {
		t.Errorf("expected rejected, got %q", profile.KYCStatus)
	}
	if profile.KYCRejectionReason != "Foto SIM buram" {
		t.Errorf("rejection reason must be stored, got %q", profile.KYCRejectionReason)
	}
	if profile.KYCReviewedBy == nil || *profile.KYCReviewedBy != f.adminID {
		t.Errorf("reviewer must be recorded as %d, got %v", f.adminID, profile.KYCReviewedBy)
	}
	if isVerified(t, f.db, f.driverID) {
		t.Error("a rejected driver must not be verified")
	}

	// Setelah ditolak, driver boleh memperbaiki berkasnya.
	if code := f.submitKYC(t, kycPayload()); code != http.StatusOK {
		t.Fatalf("resubmission after rejection must be 200, got %d", code)
	}
	if got := driverProfileOf(t, f.db, f.driverID).KYCStatus; got != models.KYCPending {
		t.Errorf("resubmission must return to pending, got %q", got)
	}
}

// TestDriverKYC_ApprovalVerifiesDriver — persetujuan menyalakan verifikasi dan
// mencatat siapa yang menyetujui.
func TestDriverKYC_ApprovalVerifiesDriver(t *testing.T) {
	f := newKYCFixture(t, "approve-")

	if code := f.submitKYC(t, kycPayload()); code != http.StatusOK {
		t.Fatalf("submission must be 200, got %d", code)
	}

	code, body := f.verifyDriver(t)
	if code != http.StatusOK {
		t.Fatalf("approval must be 200, got %d: %v", code, body)
	}

	profile := driverProfileOf(t, f.db, f.driverID)
	if profile.KYCStatus != models.KYCApproved {
		t.Errorf("expected approved, got %q", profile.KYCStatus)
	}
	if profile.KYCReviewedAt == nil {
		t.Error("review time must be recorded")
	}
	if profile.KYCReviewedBy == nil || *profile.KYCReviewedBy != f.adminID {
		t.Errorf("reviewer must be recorded as %d, got %v", f.adminID, profile.KYCReviewedBy)
	}
	if !isVerified(t, f.db, f.driverID) {
		t.Error("an approved driver must be verified")
	}
}

// TestDriverKYC_ResubmitAfterApprovalRevokesVerification — mengganti berkas
// (terutama rekening tujuan) setelah disetujui mengembalikan akun ke antrean
// tinjauan. Ini menutup pola pengambilalihan akun yang paling murah: masuk ke
// sesi driver, tukar rekening, tarik saldo.
func TestDriverKYC_ResubmitAfterApprovalRevokesVerification(t *testing.T) {
	f := newKYCFixture(t, "resubmit-")

	if code := f.submitKYC(t, kycPayload()); code != http.StatusOK {
		t.Fatalf("submission must be 200, got %d", code)
	}
	if code, body := f.verifyDriver(t); code != http.StatusOK {
		t.Fatalf("approval must be 200, got %d: %v", code, body)
	}

	changed := kycPayload()
	changed["bank_account_number"] = "5555555555"
	changed["bank_account_name"] = "Orang Lain"
	if code := f.submitKYC(t, changed); code != http.StatusOK {
		t.Fatalf("resubmission after approval must be 200, got %d", code)
	}

	profile := driverProfileOf(t, f.db, f.driverID)
	if profile.KYCStatus != models.KYCPending {
		t.Errorf("resubmission must drop back to pending, got %q", profile.KYCStatus)
	}
	if profile.KYCReviewedBy != nil {
		t.Error("the previous review must be cleared on resubmission")
	}
	if isVerified(t, f.db, f.driverID) {
		t.Error("verification must be revoked until the new documents are reviewed")
	}
}

// TestDriverKYC_AdminDetailIsDriverOnly — endpoint tinjauan tidak boleh dipakai
// membaca akun yang bukan driver.
func TestDriverKYC_AdminDetailIsDriverOnly(t *testing.T) {
	f := newKYCFixture(t, "detailscope-")

	createUserWithRoleAndLoginInDB(
		t, f.db, f.router, "detailscope-customer@kyc.test", models.RoleCustomer)
	customerID := userIDByEmail(t, f.db, "detailscope-customer@kyc.test")

	w := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodGet, adminDriverPath(customerID, "/kyc"), nil, f.adminToken))
	if w.Code != http.StatusNotFound {
		t.Fatalf("reading a non-driver account must be 404, got %d", w.Code)
	}

	ok := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodGet, adminDriverPath(f.driverID, "/kyc"), nil, f.adminToken))
	if ok.Code != http.StatusOK {
		t.Fatalf("reading a driver without KYC must still be 200, got %d", ok.Code)
	}
}

// TestDriverKYC_DocumentURLsMustBeHTTP — berkas yang akan dibuka peninjau harus
// benar-benar alamat http/https, bukan sekadar teks yang tidak kosong.
func TestDriverKYC_DocumentURLsMustBeHTTP(t *testing.T) {
	f := newKYCFixture(t, "docurl-")

	rejected := map[string]string{
		"javascript scheme":   "javascript:alert(1)",
		"local file scheme":   "file:///etc/passwd",
		"plain text":          "belum diunggah",
		"relative path":       "/uploads/ktp.jpg",
		"scheme without host": "https://",
		"over 500 characters": "https://cdn.example.com/" + strings.Repeat("a", 500) + ".jpg",
	}

	// Tiap field diuji sendiri-sendiri: pemeriksaannya harus menyebut field yang
	// bermasalah, bukan menolak berdasarkan salah satu field saja.
	fields := []string{
		"identity_card_photo_url",
		"license_photo_url",
		"vehicle_registration_photo_url",
		"selfie_photo_url",
	}

	for _, field := range fields {
		for name, bad := range rejected {
			payload := kycPayload()
			payload[field] = bad

			if code := f.submitKYC(t, payload); code != http.StatusUnprocessableEntity {
				t.Errorf("%s with %s must be 422, got %d", field, name, code)
			}
		}
	}

	// Setelah semua penolakan di atas, tidak boleh ada profil yang tertulis.
	var count int64
	f.db.Model(&models.DriverProfile{}).Where("user_id = ?", f.driverID).Count(&count)
	if count != 0 {
		t.Errorf("rejected submissions must not create a driver profile, found %d", count)
	}

	if code := f.submitKYC(t, kycPayload()); code != http.StatusOK {
		t.Fatalf("a submission with valid https URLs must still be accepted, got %d", code)
	}
}
