package handlers_test

import (
	"net/http"
	"testing"

	"openjek-backend/internal/testutil"
)

// TestRegister_Success — registrasi berhasil dengan data valid
func TestRegister_Success(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	req := testutil.JSONRequest(http.MethodPost, "/api/register", map[string]string{
		"name":     "Budi Santoso",
		"email":    "budi@example.com",
		"phone":    "081234567890",
		"password": "password123",
	}, "")

	w := testutil.Do(router, req)
	body := testutil.ParseJSON(w)

	if w.Code != http.StatusCreated {
		t.Errorf("expected status 201, got %d — body: %v", w.Code, body)
	}
	if body["message"] != "Registration successful" {
		t.Errorf("unexpected message: %v", body["message"])
	}
}

// TestRegister_DuplicateEmail — registrasi dengan email yang sudah ada harus gagal
func TestRegister_DuplicateEmail(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	payload := map[string]string{
		"name":     "Budi Santoso",
		"email":    "budi@example.com",
		"phone":    "081234567890",
		"password": "password123",
	}

	// Daftar pertama kali
	testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/register", payload, ""))

	// Daftar lagi dengan email yang sama
	payload["phone"] = "089999999999" // ganti nomor, sama email
	w := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/register", payload, ""))

	if w.Code != http.StatusConflict {
		t.Errorf("expected status 409, got %d", w.Code)
	}
}

// TestRegister_InvalidEmail — email tidak valid harus return 422
func TestRegister_InvalidEmail(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	w := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/register", map[string]string{
		"name":     "Budi",
		"email":    "bukan-email-valid",
		"phone":    "081234567890",
		"password": "password123",
	}, ""))

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected status 422, got %d", w.Code)
	}
}

// TestRegister_ShortPassword — password kurang dari 8 karakter harus return 422
func TestRegister_ShortPassword(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	w := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/register", map[string]string{
		"name":     "Budi",
		"email":    "budi@example.com",
		"phone":    "081234567890",
		"password": "1234",
	}, ""))

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected status 422, got %d", w.Code)
	}
}
