package test

import (
	"net/http"
	"testing"

	"openjek-backend/internal/testutil"
)

func TestServer_NotFoundEndpoint(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	w := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/ngawur-tidak-ada-endpoint-ini", nil, ""))

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 Not Found, got %d", w.Code)
	}

	body := testutil.ParseJSON(w)
	if body["error"] != "Endpoint not found" {
		t.Errorf("unexpected error message: %v", body["error"])
	}
}

func TestServer_MethodNotAllowed(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	// Route ada (POST /api/login), tapi kita panggil pake GET
	w := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/login", nil, ""))

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405 Method Not Allowed, got %d", w.Code)
	}

	body := testutil.ParseJSON(w)
	if body["error"] != "Method not allowed" {
		t.Errorf("unexpected error message: %v", body["error"])
	}
}
