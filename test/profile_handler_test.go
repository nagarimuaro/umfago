package test

import (
	"net/http"
	"testing"

	"openjek-backend/internal/models"
	"openjek-backend/internal/testutil"
)

func TestProfile_GetAndUserUpdate(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	userToken := createUserWithRoleAndLoginInDB(t, db, router, "profile_user@test.com", models.RoleCustomer)

	// 1. Get Profile
	wGet := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/profile", nil, userToken))
	if wGet.Code != http.StatusOK {
		t.Fatalf("expected 200 for GetProfile, got %d: %s", wGet.Code, wGet.Body.String())
	}
	body := testutil.ParseJSON(wGet)
	prof, ok := body["profile"].(map[string]interface{})
	if !ok || prof["email"] != "profile_user@test.com" {
		t.Errorf("expected email profile_user@test.com in profile, got %v", prof)
	}

	// 2. Update User Profile (unverified can change name and address)
	updatePayload := map[string]string{
		"name":              "Profil Baru",
		"address":           "Jl. Anggrek No. 10",
		"phone":             "081234567890",
		"emergency_contact": "089876543210",
	}
	wUpdate := testutil.Do(router, testutil.JSONRequest(http.MethodPut, "/api/profile", updatePayload, userToken))
	if wUpdate.Code != http.StatusOK {
		t.Fatalf("expected 200 for UpdateUserProfile, got %d: %s", wUpdate.Code, wUpdate.Body.String())
	}

	// Verifikasi di DB
	var u models.User
	db.Where("email = ?", "profile_user@test.com").First(&u)
	if u.Name != "Profil Baru" {
		t.Errorf("expected name Profil Baru, got %s", u.Name)
	}
	if u.Address != "Jl. Anggrek No. 10" {
		t.Errorf("expected address Jl. Anggrek No. 10, got %s", u.Address)
	}

	// 3. Kunci nama bila is_verified = true
	db.Model(&u).Update("is_verified", true)
	wLocked := testutil.Do(router, testutil.JSONRequest(http.MethodPut, "/api/profile", map[string]string{
		"name":    "Mencoba Ubah Nama Terverifikasi",
		"address": "Jl. Mawar No. 5",
	}, userToken))
	if wLocked.Code != http.StatusOK {
		t.Fatalf("expected 200 for locked update, got %d", wLocked.Code)
	}

	var uAfter models.User
	db.Where("email = ?", "profile_user@test.com").First(&uAfter)
	if uAfter.Name != "Profil Baru" {
		t.Errorf("verified user name should remain locked, got %s", uAfter.Name)
	}
	if uAfter.Address != "Jl. Mawar No. 5" {
		t.Errorf("address should still update for verified user, got %s", uAfter.Address)
	}
}

func TestProfile_DriverUpdate(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	driverToken := createUserWithRoleAndLoginInDB(t, db, router, "driver_prof@test.com", models.RoleDriverMotorcycle)

	driverPayload := map[string]string{
		"identity_card_number": "1371012345678901",
		"license_number":      "SIM-1234-5678",
	}
	w := testutil.Do(router, testutil.JSONRequest(http.MethodPut, "/api/profile/driver", driverPayload, driverToken))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 for UpdateDriverProfile, got %d: %s", w.Code, w.Body.String())
	}

	var d models.DriverProfile
	var user models.User
	db.Where("email = ?", "driver_prof@test.com").First(&user)
	db.Where("user_id = ?", user.ID).First(&d)

	if d.IdentityCardNumber != "1371012345678901" {
		t.Errorf("expected KTP 1371012345678901, got %s", d.IdentityCardNumber)
	}
	if d.LicenseNumber != "SIM-1234-5678" {
		t.Errorf("expected SIM SIM-1234-5678, got %s", d.LicenseNumber)
	}
}

func TestProfile_MerchantUpdate(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	merchantToken := createUserWithRoleAndLoginInDB(t, db, router, "merchant_prof@test.com", models.RoleMerchant)

	merchantPayload := map[string]string{
		"business_name":    "Warung Nasi Padang Rancak",
		"business_address": "Jl. Khatib Sulaiman No. 20",
		"category":         "food",
	}
	w := testutil.Do(router, testutil.JSONRequest(http.MethodPut, "/api/profile/merchant", merchantPayload, merchantToken))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 for UpdateMerchantProfile, got %d: %s", w.Code, w.Body.String())
	}

	var m models.MerchantProfile
	var user models.User
	db.Where("email = ?", "merchant_prof@test.com").First(&user)
	db.Where("user_id = ?", user.ID).First(&m)

	if m.BusinessName != "Warung Nasi Padang Rancak" {
		t.Errorf("expected business name Warung Nasi Padang Rancak, got %s", m.BusinessName)
	}
}

