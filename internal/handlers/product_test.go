package handlers_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"openjek-backend/internal/models"
	"openjek-backend/internal/testutil"

	"gorm.io/gorm"
)

// TestProduct_List_OnlyActiveAndAvailable — produk dari merchant nonaktif atau
// produk is_available=false tidak muncul
func TestProduct_List_OnlyActiveAndAvailable(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	token := createUserWithRoleAndLoginInDB(t, db, router, "buyer@test.com", models.RoleCustomer)

	// Merchant aktif
	activeMerchant := createMerchantWithProfile(t, db, "active@merchant.com", true)
	// Merchant nonaktif
	inactiveMerchant := createMerchantWithProfile(t, db, "inactive@merchant.com", false)

	// Produk tersedia dari merchant aktif — harus muncul
	db.Create(&models.Product{
		MerchantID:  activeMerchant.ID,
		Name:        "Available Product",
		Price:       10000,
		IsAvailable: true,
	})

	// Produk tidak tersedia dari merchant aktif — tidak muncul
	db.Create(&models.Product{
		MerchantID:  activeMerchant.ID,
		Name:        "Unavailable Product",
		Price:       15000,
		IsAvailable: false,
	})

	// Produk dari merchant nonaktif — tidak muncul meski is_available=true
	db.Create(&models.Product{
		MerchantID:  inactiveMerchant.ID,
		Name:        "Product from Inactive",
		Price:       20000,
		IsAvailable: true,
	})

	req := testutil.JSONRequest("GET", "/api/products", nil, token)
	w := testutil.Do(router, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Status = %d, want 200", w.Code)
	}

	var resp struct {
		Products []models.Product `json:"products"`
	}
	json.NewDecoder(w.Body).Decode(&resp)

	if len(resp.Products) != 1 {
		t.Fatalf("Got %d products, want 1", len(resp.Products))
	}
	if resp.Products[0].Name != "Available Product" {
		t.Errorf("Product name = %s, want 'Available Product'", resp.Products[0].Name)
	}
}

// TestProduct_Get_IncrementsViewCount — membuka detail produk menaikkan view_count
func TestProduct_Get_IncrementsViewCount(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	token := createUserWithRoleAndLoginInDB(t, db, router, "viewer@test.com", models.RoleCustomer)

	merchant := createMerchantWithProfile(t, db, "shop@test.com", true)
	product := models.Product{
		MerchantID:  merchant.ID,
		Name:        "Test Product",
		Price:       5000,
		IsAvailable: true,
		ViewCount:   0,
	}
	db.Create(&product)

	req := testutil.JSONRequest("GET", "/api/products/"+uintToString(product.ID), nil, token)
	w := testutil.Do(router, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Status = %d, want 200", w.Code)
	}

	var updated models.Product
	db.First(&updated, product.ID)

	if updated.ViewCount != 1 {
		t.Errorf("ViewCount = %d after one view, want 1", updated.ViewCount)
	}

	// Peristiwa juga tercatat
	var events []models.ProductEvent
	db.Where("product_id = ?", product.ID).Find(&events)
	if len(events) != 1 {
		t.Errorf("Got %d events, want 1", len(events))
	}
	if len(events) > 0 && events[0].Kind != models.ProductEventView {
		t.Errorf("Event kind = %s, want %s", events[0].Kind, models.ProductEventView)
	}
}

// createMerchantWithProfile — buat akun merchant beserta profilnya
func createMerchantWithProfile(t *testing.T, db *gorm.DB, email string, isActive bool) *models.MerchantProfile {
	t.Helper()

	db.Create(&models.User{
		Name:     "Merchant",
		Email:    email,
		Phone:    "08123456789",
		Password: "hash",
		RoleCode: models.RoleMerchant,
	})

	var user models.User
	db.Where("email = ?", email).First(&user)

	profile := models.MerchantProfile{
		UserID:       user.ID,
		BusinessName: "Test Shop",
		Category:     "food",
		IsActive:     isActive,
		IsOpen:       true,
	}
	db.Create(&profile)

	return &profile
}
