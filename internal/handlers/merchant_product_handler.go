package handlers

import (
	"net/http"
	"strings"

	"openjek-backend/internal/middleware"
	"openjek-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// MerchantProductHandler — katalog dari sudut pandang pemiliknya.
//
// Berbeda dari ProductHandler yang melayani pembeli, handler ini menampilkan
// produk yang belum tersedia sekalipun: merchant perlu melihat dan menyunting
// barang yang sedang dikosongkan, bukan hanya yang sedang dijual.
type MerchantProductHandler struct {
	db *gorm.DB
}

func NewMerchantProductHandler(db *gorm.DB) *MerchantProductHandler {
	return &MerchantProductHandler{db: db}
}

// merchantProfileFor — terjemahkan pemilik token menjadi merchant_id.
//
// Katalog melekat pada profil usaha, bukan pada akun. Akun bertype merchant yang
// belum pernah mengisi profil usahanya belum punya tempat menaruh produk, jadi
// dibalas 403 beserta petunjuk endpoint yang harus dipanggil lebih dulu —
// bukan 404 yang menyisakan tebakan bahwa endpoint produknya sendiri yang salah.
func merchantProfileFor(db *gorm.DB, c *gin.Context) (*models.MerchantProfile, bool) {
	userID := c.GetUint(middleware.UserIDKey)

	var profile models.MerchantProfile
	if err := db.Where("user_id = ?", userID).First(&profile).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Merchant profile has not been created yet",
			"hint":  "Create it first with PUT /api/profile/merchant",
		})
		return nil, false
	}
	return &profile, true
}

// productRequest — badan permintaan untuk membuat dan menyunting produk.
//
// Seluruh field berupa penunjuk supaya penyuntingan sebagian bisa membedakan
// "tidak dikirim" dari "dikosongkan": harga nol dan is_available false adalah
// nilai yang sah, dan keduanya akan hilang bila dibaca sebagai nilai biasa.
type productRequest struct {
	Name        *string  `json:"name"`
	Description *string  `json:"description"`
	Price       *float64 `json:"price"`
	ImageURL    *string  `json:"image_url"`
	Category    *string  `json:"category"`
	IsAvailable *bool    `json:"is_available"`
}

// List — GET /api/merchant/products
func (h *MerchantProductHandler) List(c *gin.Context) {
	profile, ok := merchantProfileFor(h.db, c)
	if !ok {
		return
	}

	scoped := func() *gorm.DB {
		q := h.db.Model(&models.Product{}).Where("merchant_id = ?", profile.ID)
		if v := c.Query("category"); v != "" {
			q = q.Where("category = ?", v)
		}
		if v := c.Query("q"); v != "" {
			q = q.Where("name ILIKE ?", "%"+v+"%")
		}
		return q
	}

	var total int64
	if err := scoped().Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch products"})
		return
	}

	page, perPage, offset := paginate(c)

	var products []models.Product
	if err := scoped().Order("created_at desc").Limit(perPage).Offset(offset).
		Find(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch products"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"products": products,
		"meta":     gin.H{"page": page, "per_page": perPage, "total": total},
	})
}

// Create — POST /api/merchant/products
func (h *MerchantProductHandler) Create(c *gin.Context) {
	profile, ok := merchantProfileFor(h.db, c)
	if !ok {
		return
	}

	var req productRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	name := ""
	if req.Name != nil {
		name = strings.TrimSpace(*req.Name)
	}
	if name == "" {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "name is required"})
		return
	}
	if req.Price == nil || *req.Price <= 0 {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "price must be greater than zero"})
		return
	}

	// Produk baru tersedia secara bawaan; merchant yang ingin menyiapkannya
	// diam-diam mengirim is_available: false secara eksplisit.
	available := true
	if req.IsAvailable != nil {
		available = *req.IsAvailable
	}

	product := models.Product{
		MerchantID:  profile.ID,
		Name:        name,
		Price:       *req.Price,
		IsAvailable: available,
	}
	if req.Description != nil {
		product.Description = *req.Description
	}
	if req.ImageURL != nil {
		product.ImageURL = *req.ImageURL
	}
	if req.Category != nil {
		product.Category = *req.Category
	}

	if err := h.db.Create(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create product"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Product created", "product": product})
}

// Get — GET /api/merchant/products/:id
func (h *MerchantProductHandler) Get(c *gin.Context) {
	product, ok := h.ownedProduct(c)
	if !ok {
		return
	}
	c.JSON(http.StatusOK, gin.H{"product": product})
}

// Update — PUT /api/merchant/products/:id
func (h *MerchantProductHandler) Update(c *gin.Context) {
	product, ok := h.ownedProduct(c)
	if !ok {
		return
	}

	var req productRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]any{}

	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "name cannot be empty"})
			return
		}
		updates["name"] = name
	}
	if req.Price != nil {
		if *req.Price <= 0 {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "price must be greater than zero"})
			return
		}
		updates["price"] = *req.Price
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.ImageURL != nil {
		updates["image_url"] = *req.ImageURL
	}
	if req.Category != nil {
		updates["category"] = *req.Category
	}
	if req.IsAvailable != nil {
		updates["is_available"] = *req.IsAvailable
	}

	if len(updates) == 0 {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "No fields to update"})
		return
	}

	if err := h.db.Model(&models.Product{}).Where("id = ?", product.ID).
		Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product"})
		return
	}

	var updated models.Product
	h.db.First(&updated, product.ID)

	c.JSON(http.StatusOK, gin.H{"message": "Product updated", "product": updated})
}

// Delete — DELETE /api/merchant/products/:id
//
// Soft delete, bukan penghapusan sungguhan: produk yang pernah dipesan masih
// dirujuk oleh riwayat dan statistik peringkat.
func (h *MerchantProductHandler) Delete(c *gin.Context) {
	product, ok := h.ownedProduct(c)
	if !ok {
		return
	}

	if err := h.db.Delete(&models.Product{}, product.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete product"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Product deleted"})
}

// ownedProduct — ambil produk yang benar-benar milik merchant pemanggil.
//
// Kepemilikan diperiksa di dalam query, bukan setelahnya. Produk milik merchant
// lain dibalas 404 dan bukan 403, sehingga menomori id satu per satu tidak
// membocorkan produk mana saja yang ada di katalog orang lain.
func (h *MerchantProductHandler) ownedProduct(c *gin.Context) (*models.Product, bool) {
	profile, ok := merchantProfileFor(h.db, c)
	if !ok {
		return nil, false
	}

	id, ok := parseUintParam(c, "id")
	if !ok {
		return nil, false
	}

	var product models.Product
	if err := h.db.Where("id = ? AND merchant_id = ?", id, profile.ID).
		First(&product).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return nil, false
	}
	return &product, true
}
