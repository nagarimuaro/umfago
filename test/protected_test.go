package test

import (
	"net/http"
	"testing"

	"openjek-backend/internal/testutil"
)

// TestGetCurrentUser_Authenticated — GET /api/user dengan token valid harus return data user
func TestGetCurrentUser_Authenticated(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/register", map[string]string{
		"name": "User A", "email": "usera@example.com", "phone": "085555555555", "password": "password123",
	}, ""))
	loginW := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/login", map[string]string{
		"email": "usera@example.com", "password": "password123",
	}, ""))
	loginBody := testutil.ParseJSON(loginW)
	accessToken := loginBody["access_token"].(string)

	w := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/user", nil, accessToken))

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d — body: %s", w.Code, w.Body.String())
	}
	body := testutil.ParseJSON(w)
	if body["email"] != "usera@example.com" {
		t.Errorf("unexpected email: %v", body["email"])
	}
}

// TestGetCurrentUser_NoToken — GET /api/user tanpa token harus return 401
func TestGetCurrentUser_NoToken(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	w := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/user", nil, ""))

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// TestGetCurrentUser_InvalidToken — GET /api/user dengan token palsu harus return 401
func TestGetCurrentUser_InvalidToken(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	w := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/user", nil, "ini.token.palsu"))

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// TestAdminRoute_ForbiddenForCustomer — route admin harus return 403 untuk customer biasa
func TestAdminRoute_ForbiddenForCustomer(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	// Register sebagai customer biasa
	testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/register", map[string]string{
		"name": "Customer Biasa", "email": "customer@example.com",
		"phone": "086666666666", "password": "password123",
	}, ""))

	loginW := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/login", map[string]string{
		"email": "customer@example.com", "password": "password123",
	}, ""))
	loginBody := testutil.ParseJSON(loginW)
	token := loginBody["access_token"].(string)

	// Coba akses route admin
	w := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/admin/drivers", nil, token))

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403 for customer accessing admin route, got %d", w.Code)
	}
}
