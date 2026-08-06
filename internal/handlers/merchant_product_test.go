package handlers_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"openjek-backend/internal/models"
	"openjek-backend/internal/testutil"

	"gorm.io/gorm"
)

// TestMerchantProduct_Create_RequiresValidPrice — price <= 0 dibalas 422
func TestMerchantProduct_Create_RequiresValidPrice(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	token := createUserWithRoleAndLoginInDB(t, db, router, "shop1@test.com", models.RoleMerchant)
	attachMerchantProfile(t, db, "shop1@test.com", true)

	cases := []struct {
		name string
		body map[string]any
	}{
		{"harga nol", map[string]any{"name": "Nasi Goreng", "price": 0}},
		{"harga negatif", map[string]any{"name": "Nasi Goreng", "price": -100}},
		{"tanpa harga", map[string]any{"name": "Nasi Goreng"}},
		{"nama kosong", map[string]any{"name": "   ", "price": 10000}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := testutil.JSONRequest("POST", "/api/merchant/products", tc.body, token)
			w := testutil.Do(router, req)
			if w.Code != http.StatusUnprocessableEntity {
				t.Errorf("Status = %d, want 422", w.Code)
			}
		})
	}
}

// TestMerchantProduct_Create_Success — produk baru tersedia secara bawaan
func TestMerchantProduct_Create_Success(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	token := createUserWithRoleAndLoginInDB(t, db, router, "shop2@test.com", models.RoleMerchant)
	profile := attachMerchantProfile(t, db, "shop2@test.com", true)

	req := testutil.JSONRequest("POST", "/api/merchant/products", map[string]any{
		"name":        "Nasi Goreng",
		"price":       18000,
		"description": "Pedas",
		"category":    "makanan",
	}, token)
	w := testutil.Do(router, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Status = %d, want 201. Body: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Product models.Product `json:"product"`
	}
	json.NewDecoder(w.Body).Decode(&resp)

	if resp.Product.MerchantID != profile.ID {
		t.Errorf("MerchantID = %d, want %d", resp.Product.MerchantID, profile.ID)
	}
	if !resp.Product.IsAvailable {
		t.Error("New product should default to is_available = true")
	}
}

// TestMerchantProduct_NoProfile_Forbidden — merchant tanpa MerchantProfile 403
func TestMerchantProduct_NoProfile_Forbidden(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	// Akun merchant tanpa profil usaha
	token := createUserWithRoleAndLoginInDB(t, db, router, "noprofile@test.com", models.RoleMerchant)

	req := testutil.JSONRequest("GET", "/api/merchant/products", nil, token)
	w := testutil.Do(router, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("Status = %d, want 403 without merchant profile", w.Code)
	}
}

// TestMerchantProduct_InactiveMerchantCanStillEdit — merchant belum disetujui
// tetap boleh menyusun katalognya; yang disaring adalah penayangannya
func TestMerchantProduct_InactiveMerchantCanStillEdit(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	token := createUserWithRoleAndLoginInDB(t, db, router, "pending@test.com", models.RoleMerchant)
	attachMerchantProfile(t, db, "pending@test.com", false)

	req := testutil.JSONRequest("POST", "/api/merchant/products", map[string]any{
		"name":  "Belum Disetujui",
		"price": 12000,
	}, token)
	w := testutil.Do(router, req)

	if w.Code != http.StatusCreated {
		t.Errorf("Status = %d, want 201 — merchant nonaktif tetap boleh menyusun katalog", w.Code)
	}
}

// TestMerchantProduct_CrossMerchant_NotFound — PUT/DELETE produk merchant lain 404
func TestMerchantProduct_CrossMerchant_NotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	aliceToken := createUserWithRoleAndLoginInDB(t, db, router, "alice-shop@test.com", models.RoleMerchant)
	attachMerchantProfile(t, db, "alice-shop@test.com", true)

	createUserWithRoleAndLoginInDB(t, db, router, "bob-shop@test.com", models.RoleMerchant)
	bobProfile := attachMerchantProfile(t, db, "bob-shop@test.com", true)

	bobProduct := models.Product{
		MerchantID:  bobProfile.ID,
		Name:        "Produk Bob",
		Price:       9000,
		IsAvailable: true,
	}
	db.Create(&bobProduct)

	path := "/api/merchant/products/" + uintToString(bobProduct.ID)

	// Alice membaca produk Bob
	w := testutil.Do(router, testutil.JSONRequest("GET", path, nil, aliceToken))
	if w.Code != http.StatusNotFound {
		t.Errorf("GET status = %d, want 404", w.Code)
	}

	// Alice menyunting produk Bob
	w = testutil.Do(router, testutil.JSONRequest("PUT", path,
		map[string]any{"price": 1}, aliceToken))
	if w.Code != http.StatusNotFound {
		t.Errorf("PUT status = %d, want 404", w.Code)
	}

	// Alice menghapus produk Bob
	w = testutil.Do(router, testutil.JSONRequest("DELETE", path, nil, aliceToken))
	if w.Code != http.StatusNotFound {
		t.Errorf("DELETE status = %d, want 404", w.Code)
	}

	// Produk Bob tetap utuh
	var still models.Product
	if err := db.First(&still, bobProduct.ID).Error; err != nil {
		t.Fatal("Bob's product was modified or deleted:", err)
	}
	if still.Price != 9000 {
		t.Errorf("Price = %v, want 9000 (unchanged)", still.Price)
	}
}

// TestMerchantProduct_List_OwnOnly — daftar merchant hanya berisi produk sendiri,
// termasuk yang is_available = false
func TestMerchantProduct_List_OwnOnly(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	token := createUserWithRoleAndLoginInDB(t, db, router, "listshop@test.com", models.RoleMerchant)
	mine := attachMerchantProfile(t, db, "listshop@test.com", true)

	createUserWithRoleAndLoginInDB(t, db, router, "othershop@test.com", models.RoleMerchant)
	other := attachMerchantProfile(t, db, "othershop@test.com", true)

	db.Create(&models.Product{MerchantID: mine.ID, Name: "Tersedia", Price: 1000, IsAvailable: true})
	db.Create(&models.Product{MerchantID: mine.ID, Name: "Kosong", Price: 2000, IsAvailable: false})
	db.Create(&models.Product{MerchantID: other.ID, Name: "Milik Orang Lain", Price: 3000, IsAvailable: true})

	w := testutil.Do(router, testutil.JSONRequest("GET", "/api/merchant/products", nil, token))
	if w.Code != http.StatusOK {
		t.Fatalf("Status = %d, want 200", w.Code)
	}

	var resp struct {
		Products []models.Product `json:"products"`
	}
	json.NewDecoder(w.Body).Decode(&resp)

	if len(resp.Products) != 2 {
		t.Fatalf("Got %d products, want 2 (own products including unavailable)", len(resp.Products))
	}
	for _, p := range resp.Products {
		if p.MerchantID != mine.ID {
			t.Errorf("Got product from merchant %d, want only %d", p.MerchantID, mine.ID)
		}
	}
}

// TestMerchantProduct_Delete_SoftDelete — produk terhapus hilang dari katalog
// pelanggan tetapi barisnya masih ada untuk riwayat
func TestMerchantProduct_Delete_SoftDelete(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	token := createUserWithRoleAndLoginInDB(t, db, router, "delshop@test.com", models.RoleMerchant)
	profile := attachMerchantProfile(t, db, "delshop@test.com", true)

	product := models.Product{MerchantID: profile.ID, Name: "Dihapus", Price: 5000, IsAvailable: true}
	db.Create(&product)

	w := testutil.Do(router, testutil.JSONRequest("DELETE",
		"/api/merchant/products/"+uintToString(product.ID), nil, token))
	if w.Code != http.StatusOK {
		t.Fatalf("Status = %d, want 200", w.Code)
	}

	// Query biasa tidak menemukannya
	var found models.Product
	if err := db.First(&found, product.ID).Error; err == nil {
		t.Error("Product should be soft-deleted and invisible to normal queries")
	}

	// Barisnya masih ada
	var count int64
	db.Unscoped().Model(&models.Product{}).Where("id = ?", product.ID).Count(&count)
	if count != 1 {
		t.Errorf("Unscoped count = %d, want 1 — soft delete must keep the row", count)
	}
}

// attachMerchantProfile — buat MerchantProfile untuk akun yang sudah ada
func attachMerchantProfile(t *testing.T, db *gorm.DB, email string, isActive bool) *models.MerchantProfile {
	t.Helper()

	var user models.User
	if err := db.Where("email = ?", email).First(&user).Error; err != nil {
		t.Fatal("User not found:", err)
	}

	profile := models.MerchantProfile{
		UserID:       user.ID,
		BusinessName: "Warung " + email,
		Category:     "makanan",
		IsActive:     isActive,
		IsOpen:       true,
	}
	if err := db.Create(&profile).Error; err != nil {
		t.Fatal("Failed to create merchant profile:", err)
	}
	return &profile
}
