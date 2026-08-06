package handlers

import (
	"errors"
	"net/http"
	"time"

	"openjek-backend/internal/models"

	"gorm.io/gorm"
)

// Sebab-sebab sebuah kode promo tidak bisa dipakai. Dibedakan satu per satu
// karena masing-masing pantas mendapat kode HTTP dan pesan yang berbeda: kode
// salah ketik bukan hal yang sama dengan kuota yang sudah habis.
var (
	errPromoNotFound      = errors.New("promo not found")
	errPromoExpired       = errors.New("promo is not within its active period")
	errPromoQuotaReached  = errors.New("promo quota has been used up")
	errPromoUserLimit     = errors.New("promo usage limit reached for this user")
	errPromoNotApplicable = errors.New("promo does not apply to this fare")
)

// resolvePromo — periksa keabsahan sebuah kode promo untuk seorang user pada
// tarif tertentu, dan kembalikan promo beserta besar potongannya.
//
// Dipakai bersama oleh POST /api/promos/validate dan oleh CreateOrder, sehingga
// tidak ada dua tempat yang bisa berbeda pendapat tentang apakah sebuah kode
// masih sah. Fungsi ini tidak menulis apa pun; pencatatan pemakaian dan kenaikan
// used_count adalah urusan pemanggilnya.
//
// tx boleh berupa transaksi yang sudah mengunci baris promo, dan di situlah
// pemeriksaan kuota menjadi berarti: tanpa kunci, dua permintaan bersamaan bisa
// sama-sama lolos dan membuat used_count melewati quota.
func resolvePromo(tx *gorm.DB, code string, userID uint, fare float64) (*models.Promo, float64, error) {
	normalized := models.NormalizeCode(code)
	if normalized == "" {
		return nil, 0, errPromoNotFound
	}

	var promo models.Promo
	if err := tx.Where("code = ?", normalized).First(&promo).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, 0, errPromoNotFound
		}
		return nil, 0, err
	}

	now := time.Now()
	if !promo.IsRedeemableAt(now) {
		// Kuota habis dipisahkan dari masa berlaku karena yang satu bisa
		// diperbaiki dengan menambah kuota dan yang lain tidak.
		if promo.Quota > 0 && promo.UsedCount >= promo.Quota {
			return nil, 0, errPromoQuotaReached
		}
		return nil, 0, errPromoExpired
	}

	if promo.PerUserLimit > 0 {
		var used int64
		if err := tx.Model(&models.PromoUsage{}).
			Where("promo_id = ? AND user_id = ?", promo.ID, userID).
			Count(&used).Error; err != nil {
			return nil, 0, err
		}
		if used >= int64(promo.PerUserLimit) {
			return nil, 0, errPromoUserLimit
		}
	}

	discount := promo.DiscountFor(fare)
	if discount <= 0 {
		return nil, 0, errPromoNotApplicable
	}

	return &promo, discount, nil
}

// promoErrorResponse — kode HTTP dan pesan untuk sebuah kegagalan promo.
// Mengembalikan 0 bila galatnya bukan galat promo, sehingga pemanggil bisa
// memperlakukannya sebagai kegagalan tak terduga.
func promoErrorResponse(err error) (int, string) {
	switch {
	case errors.Is(err, errPromoNotFound):
		return http.StatusNotFound, "Promo code not found"
	case errors.Is(err, errPromoExpired):
		return http.StatusGone, "Promo code is expired or not yet active"
	case errors.Is(err, errPromoQuotaReached):
		return http.StatusConflict, "Promo quota has been used up"
	case errors.Is(err, errPromoUserLimit):
		return http.StatusConflict, "You have already used this promo the maximum number of times"
	case errors.Is(err, errPromoNotApplicable):
		return http.StatusUnprocessableEntity, "Promo does not apply to this fare"
	default:
		return 0, ""
	}
}
