package handlers

import (
	"net/http"
	"time"

	"openjek-backend/internal/middleware"
	"openjek-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// PromoHandler — pengelolaan kode promo oleh tim sales
type PromoHandler struct {
	db *gorm.DB
}

func NewPromoHandler(db *gorm.DB) *PromoHandler {
	return &PromoHandler{db: db}
}

type promoRequest struct {
	Code         string `json:"code" binding:"required"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	DiscountType string `json:"discount_type" binding:"required,oneof=percent fixed"`
	// Nilai negatif pada keempat batas di bawah bukan sekadar data janggal:
	// models.Promo memperlakukan nilai <= 0 sebagai "tanpa batas", sehingga
	// angka negatif justru mematikan plafon potongan, ambang tarif minimum,
	// kuota, dan batas pemakaian per user.
	DiscountValue float64 `json:"discount_value" binding:"required,gt=0"`
	MaxDiscount   float64 `json:"max_discount" binding:"gte=0"`
	MinFare       float64 `json:"min_fare" binding:"gte=0"`
	Quota         int     `json:"quota" binding:"gte=0"`
	PerUserLimit  int     `json:"per_user_limit" binding:"gte=0"`
	StartsAt      string  `json:"starts_at"`
	EndsAt        string  `json:"ends_at"`
	IsActive      *bool   `json:"is_active"`
}

// parseOptionalTime — waktu opsional dalam format RFC3339
func parseOptionalTime(raw string) (time.Time, bool) {
	if raw == "" {
		return time.Time{}, true
	}
	t, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		return time.Time{}, false
	}
	return t, true
}

// List — GET /api/admin/promos
func (h *PromoHandler) List(c *gin.Context) {
	scoped := func() *gorm.DB {
		q := h.db.Model(&models.Promo{})
		if v := c.Query("is_active"); v != "" {
			q = q.Where("is_active = ?", v == "true" || v == "1")
		}
		if v := c.Query("q"); v != "" {
			q = q.Where("code ILIKE ? OR name ILIKE ?", "%"+v+"%", "%"+v+"%")
		}
		return q
	}

	var total int64
	if err := scoped().Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch promos"})
		return
	}

	page, perPage, offset := paginate(c)

	var promos []models.Promo
	if err := scoped().Order("created_at desc").Limit(perPage).Offset(offset).
		Find(&promos).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch promos"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"promos": promos,
		"meta":   gin.H{"page": page, "per_page": perPage, "total": total},
	})
}

// ListCustomer — GET /api/promos
// Menampilkan daftar promo aktif yang bisa digunakan oleh pelanggan.
func (h *PromoHandler) ListCustomer(c *gin.Context) {
	now := time.Now()
	var promos []models.Promo
	err := h.db.Where("is_active = ? AND starts_at <= ? AND ends_at >= ?", true, now, now).
		Where("quota = 0 OR used_count < quota").
		Order("created_at desc").
		Find(&promos).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch active promos"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"promos": promos,
	})
}

// Create — POST /api/admin/promos
func (h *PromoHandler) Create(c *gin.Context) {
	var req promoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	startsAt, ok := parseOptionalTime(req.StartsAt)
	if !ok {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "starts_at must be RFC3339"})
		return
	}
	endsAt, ok := parseOptionalTime(req.EndsAt)
	if !ok {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "ends_at must be RFC3339"})
		return
	}
	if !startsAt.IsZero() && !endsAt.IsZero() && endsAt.Before(startsAt) {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "ends_at must be after starts_at"})
		return
	}
	if req.DiscountType == string(models.DiscountPercent) && req.DiscountValue > 100 {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "percent discount cannot exceed 100"})
		return
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	promo := models.Promo{
		Code:          models.NormalizeCode(req.Code),
		Name:          req.Name,
		Description:   req.Description,
		DiscountType:  models.DiscountType(req.DiscountType),
		DiscountValue: req.DiscountValue,
		MaxDiscount:   req.MaxDiscount,
		MinFare:       req.MinFare,
		Quota:         req.Quota,
		PerUserLimit:  req.PerUserLimit,
		StartsAt:      startsAt,
		EndsAt:        endsAt,
		IsActive:      isActive,
	}

	if err := h.db.Create(&promo).Error; err != nil {
		if isUniqueViolation(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "Promo code already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create promo"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Promo created", "promo": promo})
}

// Update — PUT /api/admin/promos/:id
//
// Kode promo tidak bisa diubah setelah dibuat, karena kode yang sudah beredar
// ke pengguna akan berhenti bekerja tanpa jejak.
func (h *PromoHandler) Update(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}

	var promo models.Promo
	if err := h.db.First(&promo, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Promo not found"})
		return
	}

	var req struct {
		Name          *string  `json:"name"`
		Description   *string  `json:"description"`
		DiscountValue *float64 `json:"discount_value"`
		MaxDiscount   *float64 `json:"max_discount"`
		MinFare       *float64 `json:"min_fare"`
		Quota         *int     `json:"quota"`
		PerUserLimit  *int     `json:"per_user_limit"`
		EndsAt        *string  `json:"ends_at"`
		IsActive      *bool    `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	// Batas-batas di bawah dianggap "tanpa batas" oleh models.Promo ketika
	// nilainya <= 0, sehingga angka negatif melumpuhkan plafon dan kuota alih-alih
	// mengetatkannya. Ditolak di sini, bukan di lapisan binding, karena tiap field
	// bertipe penunjuk: yang tidak dikirim harus tetap tidak tersentuh.
	if req.MaxDiscount != nil && *req.MaxDiscount < 0 {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "max_discount cannot be negative"})
		return
	}
	if req.MinFare != nil && *req.MinFare < 0 {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "min_fare cannot be negative"})
		return
	}
	if req.Quota != nil && *req.Quota < 0 {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "quota cannot be negative"})
		return
	}
	if req.PerUserLimit != nil && *req.PerUserLimit < 0 {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "per_user_limit cannot be negative"})
		return
	}

	updates := map[string]interface{}{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.DiscountValue != nil {
		if *req.DiscountValue <= 0 {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "discount_value must be greater than 0"})
			return
		}
		if promo.DiscountType == models.DiscountPercent && *req.DiscountValue > 100 {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "percent discount cannot exceed 100"})
			return
		}
		updates["discount_value"] = *req.DiscountValue
	}
	if req.MaxDiscount != nil {
		updates["max_discount"] = *req.MaxDiscount
	}
	if req.MinFare != nil {
		updates["min_fare"] = *req.MinFare
	}
	if req.Quota != nil {
		updates["quota"] = *req.Quota
	}
	if req.PerUserLimit != nil {
		updates["per_user_limit"] = *req.PerUserLimit
	}
	if req.EndsAt != nil {
		endsAt, valid := parseOptionalTime(*req.EndsAt)
		if !valid {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "ends_at must be RFC3339"})
			return
		}
		updates["ends_at"] = endsAt
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if len(updates) == 0 {
		c.JSON(http.StatusOK, gin.H{"message": "Nothing to update", "promo": promo})
		return
	}

	if err := h.db.Model(&promo).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update promo"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Promo updated", "promo": promo})
}

// Delete — DELETE /api/admin/promos/:id
//
// Penghapusan bersifat lunak (soft delete) supaya riwayat pemakaian promo tetap
// bisa ditelusuri.
func (h *PromoHandler) Delete(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}

	result := h.db.Delete(&models.Promo{}, id)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete promo"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Promo not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Promo deleted"})
}

// Validate — POST /api/promos/validate
//
// Endpoint ini murni membaca: kuota tidak dikunci dan pemakaian tidak dicatat.
// Mengunci kuota di sini akan membuat kode habis hanya karena diketik-ketik di
// layar konfirmasi tanpa pernah menjadi order.
//
// Karena itu jawaban "valid" tidak menjamin kode masih sah saat order benar-benar
// dibuat; pemeriksaan yang mengikat dilakukan ulang di dalam transaksi CreateOrder.
func (h *PromoHandler) Validate(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)

	var req struct {
		Code               string  `json:"code" binding:"required"`
		FareBeforeDiscount float64 `json:"fare_before_discount" binding:"required,gt=0"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	promo, discount, err := resolvePromo(h.db, req.Code, userID, req.FareBeforeDiscount)
	if err != nil {
		if status, msg := promoErrorResponse(err); status != 0 {
			c.JSON(status, gin.H{"valid": false, "error": msg})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate promo"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":           true,
		"code":            promo.Code,
		"discount_amount": discount,
		"final_fare":      req.FareBeforeDiscount - discount,
	})
}

// Usage — GET /api/admin/promos/:id/usage
func (h *PromoHandler) Usage(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}

	var total int64
	if err := h.db.Model(&models.PromoUsage{}).Where("promo_id = ?", id).
		Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch usage"})
		return
	}

	page, perPage, offset := paginate(c)

	var usages []models.PromoUsage
	if err := h.db.Where("promo_id = ?", id).Order("created_at desc").
		Limit(perPage).Offset(offset).Find(&usages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch usage"})
		return
	}

	var totalDiscount float64
	h.db.Model(&models.PromoUsage{}).Where("promo_id = ?", id).
		Select("COALESCE(SUM(discount), 0)").Scan(&totalDiscount)

	c.JSON(http.StatusOK, gin.H{
		"usages":         usages,
		"total_discount": totalDiscount,
		"meta":           gin.H{"page": page, "per_page": perPage, "total": total},
	})
}
