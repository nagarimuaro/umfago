package handlers_test

import (
	"net/http"
	"testing"

	"openjek-backend/internal/testutil"
)

// TestLogin_Success — login dengan kredensial benar harus return token
func TestLogin_Success(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	// Register dulu
	testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/register", map[string]string{
		"name": "Siti", "email": "siti@example.com", "phone": "081111111111", "password": "password123",
	}, ""))

	// Login
	w := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/login", map[string]string{
		"email":    "siti@example.com",
		"password": "password123",
	}, ""))

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	body := testutil.ParseJSON(w)
	if body["access_token"] == nil || body["access_token"] == "" {
		t.Error("expected access_token in response")
	}
	if body["refresh_token"] == nil || body["refresh_token"] == "" {
		t.Error("expected refresh_token in response")
	}
	if body["expires_in"] != float64(900) {
		t.Errorf("expected expires_in=900, got %v", body["expires_in"])
	}
}

// TestLogin_WrongPassword — password salah harus return 401
func TestLogin_WrongPassword(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/register", map[string]string{
		"name": "Ali", "email": "ali@example.com", "phone": "082222222222", "password": "password123",
	}, ""))

	w := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/login", map[string]string{
		"email":    "ali@example.com",
		"password": "salah_password",
	}, ""))

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

// TestLogin_UserNotFound — login dengan email yang tidak terdaftar harus 401
func TestLogin_UserNotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	w := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/login", map[string]string{
		"email":    "tidakada@example.com",
		"password": "password123",
	}, ""))

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

// TestRefreshToken_Success — refresh token yang valid harus return access token baru
func TestRefreshToken_Success(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	// Register + Login dalam satu router yang sama
	testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/register", map[string]string{
		"name": "Dewi", "email": "dewi@example.com", "phone": "083333333333", "password": "password123",
	}, ""))

	loginW := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/login", map[string]string{
		"email": "dewi@example.com", "password": "password123",
	}, ""))
	if loginW.Code != http.StatusOK {
		t.Fatalf("login failed with %d: %s", loginW.Code, loginW.Body.String())
	}
	loginBody := testutil.ParseJSON(loginW)
	refreshToken, ok := loginBody["refresh_token"].(string)
	if !ok || refreshToken == "" {
		t.Fatal("expected refresh_token from login")
	}

	// Gunakan refresh token di router yang sama (DB sama, token tersimpan di DB yang sama)
	w := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/refresh", map[string]string{
		"refresh_token": refreshToken,
	}, ""))

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d — body: %s", w.Code, w.Body.String())
	}
	body := testutil.ParseJSON(w)
	if body["access_token"] == nil {
		t.Error("expected new access_token in refresh response")
	}
}

// TestRefreshToken_InvalidToken — refresh token palsu harus return 401
func TestRefreshToken_InvalidToken(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	w := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/refresh", map[string]string{
		"refresh_token": "ini-token-palsu-tidak-valid",
	}, ""))

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}
