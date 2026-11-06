package test

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	"openjek-backend/internal/models"
	"openjek-backend/internal/testutil"
)

func TestEnterprise_SystemHealth(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	adminToken := createUserWithRoleAndLoginInDB(t, db, router, "health_admin@test.com", models.RoleSuperAdmin)

	w := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/admin/system/health", nil, adminToken))
	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	body := testutil.ParseJSON(w)
	dbInfo, ok := body["database"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected database object in health response, got %v", body["database"])
	}
	if dbInfo["status"] != true {
		t.Errorf("expected db status true, got %v", dbInfo["status"])
	}
	runtimeInfo, ok := body["runtime"].(map[string]interface{})
	if !ok || runtimeInfo["goroutines"] == nil {
		t.Error("expected goroutines in runtime info")
	}
}

func TestEnterprise_FeatureFlagsLifecycle(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	adminToken := createUserWithRoleAndLoginInDB(t, db, router, "ff_admin@test.com", models.RoleSuperAdmin)

	// Seed satu feature flag
	flag := models.FeatureFlag{
		Key:         "ai_dispatch",
		Name:        "AI Smart Dispatching",
		Description: "Dispatch order menggunakan ML",
		Enabled:     false,
		RolloutPct:  0,
		UpdatedAt:   time.Now(),
	}
	db.Create(&flag)

	// 1. List Feature Flags
	wList := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/admin/feature-flags", nil, adminToken))
	if wList.Code != http.StatusOK {
		t.Fatalf("expected 200 for listing flags, got %d: %s", wList.Code, wList.Body.String())
	}

	// 2. Update Feature Flag
	updatePayload := map[string]interface{}{
		"enabled":     true,
		"rollout_pct": 50,
	}
	wUpdate := testutil.Do(router, testutil.JSONRequest(http.MethodPut, "/api/admin/feature-flags/ai_dispatch", updatePayload, adminToken))
	if wUpdate.Code != http.StatusOK {
		t.Fatalf("expected 200 for updating flag, got %d: %s", wUpdate.Code, wUpdate.Body.String())
	}

	// 3. Verifikasi di DB
	var updated models.FeatureFlag
	db.Where("key = ?", "ai_dispatch").First(&updated)
	if !updated.Enabled {
		t.Error("expected feature flag enabled to be true")
	}
	if updated.RolloutPct != 50 {
		t.Errorf("expected rollout_pct 50, got %d", updated.RolloutPct)
	}
}

func TestEnterprise_AuditLogs(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	adminToken := createUserWithRoleAndLoginInDB(t, db, router, "audit_admin@test.com", models.RoleSuperAdmin)

	// Buat log contoh
	db.Create(&models.AuditLog{
		ActorEmail: "admin@test.com",
		ActorRole:  "admin.superadmin",
		Module:     "settings",
		Action:     "update",
		Summary:    "Mengubah tarif per km",
		CreatedAt:  time.Now(),
	})

	w := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/admin/audit-logs?page=1&limit=10", nil, adminToken))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 for audit logs, got %d: %s", w.Code, w.Body.String())
	}

	body := testutil.ParseJSON(w)
	logs, ok := body["logs"].([]interface{})
	if !ok || len(logs) == 0 {
		t.Errorf("expected non-empty audit logs array, got %v", body["logs"])
	}
}

func TestEnterprise_Approvals(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	adminToken := createUserWithRoleAndLoginInDB(t, db, router, "approval_admin@test.com", models.RoleSuperAdmin)

	// Buat data approval request
	req := models.ApprovalRequest{
		Module:      "payout",
		Action:      "withdrawal_limit_increase",
		TargetID:    "123",
		RequestedBy: 1,
		Status:      "pending",
		Reason:      "Requesting higher limit for enterprise merchant",
		CreatedAt:   time.Now(),
	}
	db.Create(&req)

	// 1. List approvals
	wList := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/admin/approvals", nil, adminToken))
	if wList.Code != http.StatusOK {
		t.Fatalf("expected 200 for list approvals, got %d: %s", wList.Code, wList.Body.String())
	}

	// 2. Decide approval (approve)
	decidePayload := map[string]string{
		"status":      "approved",
		"review_note": "Disetujui untuk uji coba",
	}
	url := fmt.Sprintf("/api/admin/approvals/%d", req.ID)
	wDecide := testutil.Do(router, testutil.JSONRequest(http.MethodPut, url, decidePayload, adminToken))
	if wDecide.Code != http.StatusOK {
		t.Fatalf("expected 200 for decide approval, got %d: %s", wDecide.Code, wDecide.Body.String())
	}

	// Verifikasi di DB
	var after models.ApprovalRequest
	db.First(&after, req.ID)
	if after.Status != "approved" {
		t.Errorf("expected approval status approved, got %s", after.Status)
	}
}

func TestEnterprise_RiskCases(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	adminToken := createUserWithRoleAndLoginInDB(t, db, router, "risk_admin@test.com", models.RoleSuperAdmin)

	// Buat risk case
	rc := models.RiskCase{
		UserID:    1,
		RiskType:  "fake_gps",
		Severity:  "high",
		RiskScore: 85,
		Status:    "open",
		Summary:   "Suspicious GPS teleportation detected",
		CreatedAt: time.Now(),
	}
	db.Create(&rc)

	// 1. List risk cases
	wList := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/admin/risk/cases", nil, adminToken))
	if wList.Code != http.StatusOK {
		t.Fatalf("expected 200 for risk cases, got %d: %s", wList.Code, wList.Body.String())
	}

	// 2. Update risk case
	url := fmt.Sprintf("/api/admin/risk/cases/%d", rc.ID)
	updatePayload := map[string]interface{}{
		"status": "resolved",
		"notes":  "Pengguna sudah diverifikasi ulang",
	}
	wUpdate := testutil.Do(router, testutil.JSONRequest(http.MethodPut, url, updatePayload, adminToken))
	if wUpdate.Code != http.StatusOK {
		t.Fatalf("expected 200 for updating risk case, got %d: %s", wUpdate.Code, wUpdate.Body.String())
	}

	var updated models.RiskCase
	db.First(&updated, rc.ID)
	if updated.Status != "resolved" {
		t.Errorf("expected risk case status resolved, got %s", updated.Status)
	}
}

func TestEnterprise_CitiesAndBranches(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	adminToken := createUserWithRoleAndLoginInDB(t, db, router, "cities_admin@test.com", models.RoleSuperAdmin)

	// 1. Create City
	cityPayload := map[string]interface{}{
		"code":     "BKT",
		"name":     "Kota Bukittinggi",
		"province": "Sumatera Barat",
		"timezone": "Asia/Jakarta",
	}
	wCity := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/admin/cities", cityPayload, adminToken))
	if wCity.Code != http.StatusCreated {
		t.Fatalf("expected 201 for creating city, got %d: %s", wCity.Code, wCity.Body.String())
	}

	// 2. List Cities
	wList := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/admin/cities", nil, adminToken))
	if wList.Code != http.StatusOK {
		t.Fatalf("expected 200 for listing cities, got %d: %s", wList.Code, wList.Body.String())
	}

	// 3. List Branches
	wBranches := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/admin/branches", nil, adminToken))
	if wBranches.Code != http.StatusOK {
		t.Fatalf("expected 200 for listing branches, got %d: %s", wBranches.Code, wBranches.Body.String())
	}
}

func TestEnterprise_SupportTickets_CreateAndList(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	customerToken := createUserWithRoleAndLoginInDB(t, db, router, "cust_ticket@test.com", models.RoleCustomer)
	adminToken := createUserWithRoleAndLoginInDB(t, db, router, "admin_ticket@test.com", models.RoleSuperAdmin)

	// 1. Customer creates a ticket via POST /api/support/tickets
	ticketPayload := map[string]interface{}{
		"category":    "ride_issue",
		"subject":     "Barang Tertinggal di Helm Driver",
		"description": "Kacamata tertinggal setelah perjalanan di Sudirman",
	}
	wCreate := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/support/tickets", ticketPayload, customerToken))
	if wCreate.Code != http.StatusCreated {
		t.Fatalf("expected 201 for creating ticket, got %d: %s", wCreate.Code, wCreate.Body.String())
	}

	// 2. Admin lists tickets via GET /api/admin/support/tickets
	wList := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/admin/support/tickets", nil, adminToken))
	if wList.Code != http.StatusOK {
		t.Fatalf("expected 200 for admin listing tickets, got %d: %s", wList.Code, wList.Body.String())
	}
}
