package handlers_test

import (
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"openjek-backend/internal/models"
	"openjek-backend/internal/testutil"
)

// TestProductRanking_ExplorationQuota — dari 20 slot halaman pertama, sedikitnya
// 6 harus produk sepi atau baru
func TestProductRanking_ExplorationQuota(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	token := createUserWithRoleAndLoginInDB(t, db, router, "ranker@test.com", models.RoleCustomer)
	merchant := createMerchantWithProfile(t, db, "bigshop@test.com", true)

	// 40 produk: 20 populer (penayangan >= 10), 20 sepi (< 10)
	cutoff := time.Now().AddDate(0, 0, -29)
	for i := 1; i <= 40; i++ {
		product := models.Product{
			MerchantID:  merchant.ID,
			Name:        "Product " + uintToString(uint(i)),
			Price:       10000,
			IsAvailable: true,
			ViewCount:   int64(i * 5), // kumulatif: 5, 10, 15, ..., 200
		}
		db.Create(&product)

		// Produk 1–20 sepi (< 50 penayangan kumulatif = < 10 pada jendela 30 hari),
		// 21–40 populer. Buat peristiwa di dalam jendela.
		views := i / 5
		if views < 1 {
			views = 1
		}
		for v := 0; v < views; v++ {
			db.Create(&models.ProductEvent{
				ProductID: product.ID,
				Kind:      models.ProductEventView,
				CreatedAt: cutoff.Add(time.Hour * time.Duration(v)),
			})
		}
	}

	req := testutil.JSONRequest("GET", "/api/products?per_page=20", nil, token)
	w := testutil.Do(router, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Status = %d, want 200", w.Code)
	}

	var resp struct {
		Products []struct {
			ID            uint `json:"id"`
			IsExploration bool `json:"is_exploration"`
		} `json:"products"`
		Meta map[string]any `json:"meta"`
	}
	json.NewDecoder(w.Body).Decode(&resp)

	if len(resp.Products) != 20 {
		t.Fatalf("Got %d products on page 1, want 20", len(resp.Products))
	}

	exploration := 0
	for _, p := range resp.Products {
		if p.IsExploration {
			exploration++
		}
	}

	if exploration < 6 {
		t.Errorf("Got %d exploration products, want at least 6", exploration)
	}

	enabled, _ := resp.Meta["exploration_enabled"].(bool)
	if !enabled {
		t.Error("exploration_enabled = false, want true without filters")
	}
}

// TestProductRanking_DeterministicPerDay — dua pemanggilan berturut-turut pada
// hari yang sama menghasilkan urutan identik
func TestProductRanking_DeterministicPerDay(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	token := createUserWithRoleAndLoginInDB(t, db, router, "stable@test.com", models.RoleCustomer)
	merchant := createMerchantWithProfile(t, db, "stable-shop@test.com", true)

	// 30 produk sepi
	for i := 1; i <= 30; i++ {
		db.Create(&models.Product{
			MerchantID:  merchant.ID,
			Name:        "Sepi " + uintToString(uint(i)),
			Price:       5000,
			IsAvailable: true,
			ViewCount:   int64(i % 3), // 0, 1, 2, semuanya < 10
		})
	}

	req1 := testutil.JSONRequest("GET", "/api/products?per_page=15", nil, token)
	w1 := testutil.Do(router, req1)

	var resp1 struct {
		Products []struct {
			ID uint `json:"id"`
		} `json:"products"`
	}
	json.NewDecoder(w1.Body).Decode(&resp1)

	// Panggilan kedua segera setelahnya
	req2 := testutil.JSONRequest("GET", "/api/products?per_page=15", nil, token)
	w2 := testutil.Do(router, req2)

	var resp2 struct {
		Products []struct {
			ID uint `json:"id"`
		} `json:"products"`
	}
	json.NewDecoder(w2.Body).Decode(&resp2)

	if len(resp1.Products) != len(resp2.Products) {
		t.Fatalf("Length mismatch: %d vs %d", len(resp1.Products), len(resp2.Products))
	}

	for i := range resp1.Products {
		if resp1.Products[i].ID != resp2.Products[i].ID {
			t.Errorf("Position %d: first call ID %d, second call ID %d — order must be stable per day",
				i, resp1.Products[i].ID, resp2.Products[i].ID)
		}
	}
}

// TestProductRanking_NoOverlapBetweenPages — produk tidak muncul di dua halaman
func TestProductRanking_NoOverlapBetweenPages(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	token := createUserWithRoleAndLoginInDB(t, db, router, "overlap@test.com", models.RoleCustomer)
	merchant := createMerchantWithProfile(t, db, "overlap-shop@test.com", true)

	for i := 1; i <= 25; i++ {
		db.Create(&models.Product{
			MerchantID:  merchant.ID,
			Name:        "Item " + uintToString(uint(i)),
			Price:       1000,
			IsAvailable: true,
		})
	}

	w1 := testutil.Do(router, testutil.JSONRequest("GET", "/api/products?page=1&per_page=15", nil, token))
	var resp1 struct {
		Products []struct {
			ID uint `json:"id"`
		} `json:"products"`
	}
	json.NewDecoder(w1.Body).Decode(&resp1)

	w2 := testutil.Do(router, testutil.JSONRequest("GET", "/api/products?page=2&per_page=15", nil, token))
	var resp2 struct {
		Products []struct {
			ID uint `json:"id"`
		} `json:"products"`
	}
	json.NewDecoder(w2.Body).Decode(&resp2)

	seen := make(map[uint]bool)
	for _, p := range resp1.Products {
		seen[p.ID] = true
	}
	for _, p := range resp2.Products {
		if seen[p.ID] {
			t.Errorf("Product ID %d appears on both page 1 and page 2", p.ID)
		}
	}

	if len(resp1.Products)+len(resp2.Products) != 25 {
		t.Errorf("Total products = %d, want 25", len(resp1.Products)+len(resp2.Products))
	}
}

// TestProductRanking_OldEventsNotCounted — peristiwa > 30 hari tidak ikut
func TestProductRanking_OldEventsNotCounted(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	token := createUserWithRoleAndLoginInDB(t, db, router, "window@test.com", models.RoleCustomer)
	merchant := createMerchantWithProfile(t, db, "window-shop@test.com", true)

	productA := models.Product{MerchantID: merchant.ID, Name: "A Recent", Price: 1000, IsAvailable: true}
	productB := models.Product{MerchantID: merchant.ID, Name: "B Old", Price: 1000, IsAvailable: true}
	db.Create(&productA)
	db.Create(&productB)

	// A: 10 peristiwa dalam jendela
	within := time.Now().AddDate(0, 0, -20)
	for i := 0; i < 10; i++ {
		db.Create(&models.ProductEvent{ProductID: productA.ID, Kind: models.ProductEventView, CreatedAt: within})
	}

	// B: 50 peristiwa di luar jendela
	outside := time.Now().AddDate(0, 0, -40)
	for i := 0; i < 50; i++ {
		db.Create(&models.ProductEvent{ProductID: productB.ID, Kind: models.ProductEventView, CreatedAt: outside})
	}

	req := testutil.JSONRequest("GET", "/api/products", nil, token)
	w := testutil.Do(router, req)

	var resp struct {
		Products []struct {
			ID            uint   `json:"id"`
			Name          string `json:"name"`
			ViewCount30d  int64  `json:"view_count_30d"`
			IsExploration bool   `json:"is_exploration"`
		} `json:"products"`
	}
	json.NewDecoder(w.Body).Decode(&resp)

	var a, b *struct {
		ID            uint
		Name          string
		ViewCount30d  int64
		IsExploration bool
	}
	for i := range resp.Products {
		if resp.Products[i].ID == productA.ID {
			a = &struct {
				ID            uint
				Name          string
				ViewCount30d  int64
				IsExploration bool
			}{
				ID:            resp.Products[i].ID,
				Name:          resp.Products[i].Name,
				ViewCount30d:  resp.Products[i].ViewCount30d,
				IsExploration: resp.Products[i].IsExploration,
			}
		}
		if resp.Products[i].ID == productB.ID {
			b = &struct {
				ID            uint
				Name          string
				ViewCount30d  int64
				IsExploration bool
			}{
				ID:            resp.Products[i].ID,
				Name:          resp.Products[i].Name,
				ViewCount30d:  resp.Products[i].ViewCount30d,
				IsExploration: resp.Products[i].IsExploration,
			}
		}
	}

	if a == nil || b == nil {
		t.Fatal("Both products must appear in list")
	}

	if a.ViewCount30d != 10 {
		t.Errorf("A view_count_30d = %d, want 10", a.ViewCount30d)
	}
	if b.ViewCount30d != 0 {
		t.Errorf("B view_count_30d = %d, want 0 (events outside window)", b.ViewCount30d)
	}

	// A harus skornya lebih tinggi dan muncul lebih dulu, kecuali B masuk kuota eksplorasi
	if !b.IsExploration && resp.Products[0].ID != productA.ID {
		t.Errorf("Product with recent views should rank higher unless B is exploration slot")
	}
}

// TestProductRanking_FilterDisablesExploration — pencarian mematikan kuota
func TestProductRanking_FilterDisablesExploration(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	token := createUserWithRoleAndLoginInDB(t, db, router, "search@test.com", models.RoleCustomer)
	merchant := createMerchantWithProfile(t, db, "search-shop@test.com", true)

	for i := 1; i <= 20; i++ {
		db.Create(&models.Product{
			MerchantID:  merchant.ID,
			Name:        "Food " + uintToString(uint(i)),
			Category:    "makanan",
			Price:       5000,
			IsAvailable: true,
		})
	}

	req := testutil.JSONRequest("GET", "/api/products?q=Food", nil, token)
	w := testutil.Do(router, req)

	var resp struct {
		Meta map[string]any `json:"meta"`
	}
	json.NewDecoder(w.Body).Decode(&resp)

	enabled, _ := resp.Meta["exploration_enabled"].(bool)
	if enabled {
		t.Error("exploration_enabled = true with ?q filter, want false")
	}
}
