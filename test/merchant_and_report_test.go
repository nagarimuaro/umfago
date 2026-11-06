package test

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	"openjek-backend/internal/models"
	"openjek-backend/internal/testutil"
)

func TestMerchant_ListGetApproveSuspend(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	adminToken := createUserWithRoleAndLoginInDB(t, db, router, "merchant_admin@test.com", models.RoleSuperAdmin)
	_ = createUserWithRoleAndLoginInDB(t, db, router, "merchant_owner@test.com", models.RoleMerchant)

	var owner models.User
	db.Where("email = ?", "merchant_owner@test.com").First(&owner)

	// Buat profil merchant yang belum aktif
	merchant := models.MerchantProfile{
		UserID:          owner.ID,
		BusinessName:    "Sate Padang Mak Syukur",
		BusinessAddress: "Jl. Sudirman Padang",
		Category:        "food",
		IsActive:        false,
		CreatedAt:       time.Now(),
	}
	db.Create(&merchant)

	// 1. List Merchants
	wList := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/admin/merchants?page=1&limit=10", nil, adminToken))
	if wList.Code != http.StatusOK {
		t.Fatalf("expected 200 for ListMerchants, got %d: %s", wList.Code, wList.Body.String())
	}

	// 2. Get Merchant Detail
	urlGet := fmt.Sprintf("/api/admin/merchants/%d", merchant.ID)
	wGet := testutil.Do(router, testutil.JSONRequest(http.MethodGet, urlGet, nil, adminToken))
	if wGet.Code != http.StatusOK {
		t.Fatalf("expected 200 for GetMerchant, got %d: %s", wGet.Code, wGet.Body.String())
	}

	// 3. Approve Merchant
	urlApprove := fmt.Sprintf("/api/admin/merchants/%d/approve", merchant.ID)
	wApprove := testutil.Do(router, testutil.JSONRequest(http.MethodPut, urlApprove, nil, adminToken))
	if wApprove.Code != http.StatusOK {
		t.Fatalf("expected 200 for ApproveMerchant, got %d: %s", wApprove.Code, wApprove.Body.String())
	}

	// Verifikasi di DB: merchant active dan owner verified
	var updatedMerchant models.MerchantProfile
	db.First(&updatedMerchant, merchant.ID)
	if !updatedMerchant.IsActive {
		t.Error("expected merchant to be active after approval")
	}
	var updatedOwner models.User
	db.First(&updatedOwner, owner.ID)
	if !updatedOwner.IsVerified {
		t.Error("expected owner to be verified after merchant approval")
	}

	// 4. Suspend Merchant
	urlSuspend := fmt.Sprintf("/api/admin/merchants/%d/suspend", merchant.ID)
	wSuspend := testutil.Do(router, testutil.JSONRequest(http.MethodPut, urlSuspend, map[string]string{
		"reason": "Pelanggaran higienitas makanan",
	}, adminToken))
	if wSuspend.Code != http.StatusOK {
		t.Fatalf("expected 200 for SuspendMerchant, got %d: %s", wSuspend.Code, wSuspend.Body.String())
	}

	var suspendedMerchant models.MerchantProfile
	db.First(&suspendedMerchant, merchant.ID)
	if suspendedMerchant.IsActive {
		t.Error("expected merchant to be inactive after suspension")
	}
}

func TestReport_DashboardAndAnalytics(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	adminToken := createUserWithRoleAndLoginInDB(t, db, router, "report_admin@test.com", models.RoleSuperAdmin)

	// 1. Dashboard Overview
	wDash := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/admin/reports/dashboard", nil, adminToken))
	if wDash.Code != http.StatusOK {
		t.Fatalf("expected 200 for dashboard report, got %d: %s", wDash.Code, wDash.Body.String())
	}
	bodyDash := testutil.ParseJSON(wDash)
	if bodyDash["completed"] == nil {
		t.Error("expected completed object in dashboard report")
	}

	// 2. Sales Trend
	wSales := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/admin/reports/sales", nil, adminToken))
	if wSales.Code != http.StatusOK {
		t.Fatalf("expected 200 for sales trend report, got %d: %s", wSales.Code, wSales.Body.String())
	}

	// 3. Top Drivers
	wTop := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/admin/reports/top-drivers", nil, adminToken))
	if wTop.Code != http.StatusOK {
		t.Fatalf("expected 200 for top drivers report, got %d: %s", wTop.Code, wTop.Body.String())
	}
}

func TestMerchant_CustomerListAndGet(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	customerToken := createUserWithRoleAndLoginInDB(t, db, router, "cust_merchant@test.com", models.RoleCustomer)
	_ = createUserWithRoleAndLoginInDB(t, db, router, "active_owner@test.com", models.RoleMerchant)

	var owner models.User
	db.Where("email = ?", "active_owner@test.com").First(&owner)

	// Buat merchant aktif
	merchant := models.MerchantProfile{
		UserID:          owner.ID,
		BusinessName:    "KFC Veteran",
		BusinessAddress: "Jl. Veteran No. 5",
		Category:        "fastfood",
		Lat:             -0.9412,
		Lon:             100.3620,
		Rating:          4.8,
		ReviewCount:     50,
		IsActive:        true,
		IsOpen:          true,
	}
	db.Create(&merchant)

	// Buat produk untuk merchant tersebut
	product := models.Product{
		MerchantID:  merchant.ID,
		Name:        "Paket Super Besar",
		Description: "Ayam krispi + nasi + minum",
		Price:       35000,
		Category:    "makanan",
		IsAvailable: true,
	}
	db.Create(&product)

	// 1. Customer List Merchants
	wList := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/merchants", nil, customerToken))
	if wList.Code != http.StatusOK {
		t.Fatalf("expected 200 for customer GET /api/merchants, got %d: %s", wList.Code, wList.Body.String())
	}
	bodyList := testutil.ParseJSON(wList)
	if bodyList["merchants"] == nil {
		t.Fatal("expected merchants array in response")
	}

	// 2. Customer Get Merchant Detail with Products
	urlGet := fmt.Sprintf("/api/merchants/%d", merchant.ID)
	wGet := testutil.Do(router, testutil.JSONRequest(http.MethodGet, urlGet, nil, customerToken))
	if wGet.Code != http.StatusOK {
		t.Fatalf("expected 200 for customer GET /api/merchants/:id, got %d: %s", wGet.Code, wGet.Body.String())
	}
	bodyGet := testutil.ParseJSON(wGet)
	if bodyGet["merchant"] == nil || bodyGet["products"] == nil {
		t.Fatal("expected merchant and products in response")
	}
}

func TestUserAddress_CRUD(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	userToken := createUserWithRoleAndLoginInDB(t, db, router, "address_user@test.com", models.RoleCustomer)

	// 1. Create Address
	createReq := map[string]interface{}{
		"label":      "Rumah",
		"address":    "Jl. M. Yamin No. 15",
		"note":       "Pagar putih",
		"area":       "Kampung Jao",
		"lat":        -0.9450,
		"lon":        100.3600,
		"icon":       "home",
		"is_default": true,
	}
	wCreate := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/user/addresses", createReq, userToken))
	if wCreate.Code != http.StatusCreated {
		t.Fatalf("expected 201 for POST /api/user/addresses, got %d: %s", wCreate.Code, wCreate.Body.String())
	}
	bodyCreate := testutil.ParseJSON(wCreate)
	addrObj, ok := bodyCreate["address"].(map[string]interface{})
	if !ok || addrObj["id"] == nil {
		t.Fatalf("expected created address in response: %v", bodyCreate)
	}
	addrID := uint(addrObj["id"].(float64))

	// 2. List Addresses
	wList := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/user/addresses", nil, userToken))
	if wList.Code != http.StatusOK {
		t.Fatalf("expected 200 for GET /api/user/addresses, got %d: %s", wList.Code, wList.Body.String())
	}

	// 3. Update Address
	updateReq := map[string]interface{}{
		"label":   "Rumah Ortu",
		"address": "Jl. M. Yamin No. 15 (Baru)",
		"note":    "Pagar cat hijau",
	}
	urlUpdate := fmt.Sprintf("/api/user/addresses/%d", addrID)
	wUpdate := testutil.Do(router, testutil.JSONRequest(http.MethodPut, urlUpdate, updateReq, userToken))
	if wUpdate.Code != http.StatusOK {
		t.Fatalf("expected 200 for PUT /api/user/addresses/:id, got %d: %s", wUpdate.Code, wUpdate.Body.String())
	}

	// 4. Delete Address
	urlDelete := fmt.Sprintf("/api/user/addresses/%d", addrID)
	wDelete := testutil.Do(router, testutil.JSONRequest(http.MethodDelete, urlDelete, nil, userToken))
	if wDelete.Code != http.StatusOK {
		t.Fatalf("expected 200 for DELETE /api/user/addresses/:id, got %d: %s", wDelete.Code, wDelete.Body.String())
	}
}
